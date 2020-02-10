const cp = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const fsExtra = require('fs-extra');
const which = require('which');
const Cache = require('./Cache');
const install = require('../install');
const handler = require('serve-handler');
const contain = (parent, child) => {
  if (path.isAbsolute(child)) {
    child = path.relative(parent, child);
    if (!child || child.split(path.sep)[0] === '..') {
      return false;
    }
  }
  return !!child;
};
const match = (ignore, filepath) => {
  const fileseps = filepath.split(path.sep);
  return ignore.some(i => {
    const rules = path.normalize(i).split(path.posix.sep);
    const root = !rules[0];
    const seps =  rules.slice(root ? 1 : 0, rules.length - (rules[rules.length - 1] ? 0 : 1));
    let count = 0;
    for (let i = 0; i < fileseps.length; i++) {
      count = fileseps[i] === seps[count] ? (count + 1) : 0;
      if (count === seps.length) {
        return true;
      } else if (root) {
        return false;
      }
    }
    return false;
  });
};
const commander = (cmd, { cwd, env }) => {
  const seps = cmd.split(/\s+/);
  const execFile = which.sync(seps[0], {
    path: [path.resolve(cwd, 'node_modules', '.bin'), process.env.PATH].join(':')
  });
  const execArgv = seps.slice(1);
  return cp.spawn(execFile, execArgv, {
    cwd: cwd,
    env: Object.assign({}, process.env, env)
  });
};
const findport = () => new Promise(resolve => http.createServer().listen(function() {
  resolve(this.address().port);
  this.close();
}));
const template = env => str => str.replace(/\$\{([^}]+)\}/, (match, $1) => env[$1]);


function Framework(option) {
  this.cache = new Cache();
  this.tmpdir = option.tmpdir;
  this.type = option.type;
  this.interception = {};
  this.proxy = [];
}

Framework.prototype.run = async function(data) {
  const framework_supports = require('./framework.supports');
  framework_supports.forEach(framework => {
    const interception = [].concat(
      framework.server.proxy || [],
      typeof framework.server.static === 'object' ? Object.keys(framework.server.static) : []
    );
    interception.forEach(i => {
      this.interception[i] = true;
    });
  });

  const frameworks = framework_supports
    .filter(({ type }) => !this.type || this.type === type)
    .map(framework => Object.assign({}, framework, {
      dirname: path.resolve(path.resolve(this.tmpdir, `${framework.type}.framework.sync`))
    }));
  await Promise.all(frameworks.map(async framework => {
    await this.sync(framework, data);
    await this.install(framework);
    if (this.cache.sign(['build', framework.type])) {
      console.log(`framework ${framework.type} build`);

      const port = await findport();
      const wwwdir = path.resolve(this.tmpdir, `${framework.type}.framework.www`);
      fsExtra.ensureDirSync(wwwdir);
      const tmpdir = path.resolve(this.tmpdir, `${framework.type}.framework.tmp`);
      fsExtra.ensureDirSync(tmpdir);
      const compile = template({
        DIRNAME: framework.dirname,
        WWWDIR: wwwdir,
        TMPDIR: tmpdir,
        PORT: port,
      });

      const server = framework.server;
      if (server.env) {
        Object.keys(server.env).forEach(key => (server.env[key] = compile(server.env[key])));
      }

      const damon = commander(compile(server.run), {
        cwd: framework.dirname,
        env: server.env
      });

      damon.stdout.on('data', data => process.stdout.write(data));
      damon.stderr.on('data', data => process.stderr.write(data));
      damon.on('error', error => console.log(`[ERROR] ${framework.type} ${error}`));
      damon.on('close', code => console.log(`[CLOSE] ${framework.type} ${code}`));

      if (server.proxy) {
        this.proxy.push({
          context: [].concat(server.proxy),
          target: `http://localhost:${port}`
        });
      }

      if (server.static) {
        this.proxy.push(async (request, response) => {
          return await handler(request, response, {
            public: wwwdir,
            rewrites: Object.keys(typeof server.static === 'object' ? server.static : {}).map(source => ({
              source: source,
              destination: server.static[source]
            })),
          }, {
            sendError: error => {
              throw error;
            }
          })
        });
      }
    }
  }));
};

Framework.prototype.sync = async function(framework, { entry, symlink, dynamic, changes }) {
  if (this.cache.set('entry', entry)) {
    throw new Error('not support dynamic update module_entry');
  }

  const framework_source = path.join(entry, framework.root || '');
  const framework_ignore = ['.DS_Store', '.git', 'node_modules'].concat(
    framework.ignore,
    Object.keys(dynamic).filter(i => contain(framework_source, i)).map(
      i => path.posix.sep + path.relative(framework_source, i).split(path.sep).join(path.posix.sep)
    )
  );

  const sources = fsExtra.readdirSync(framework_source).map(basename => path.join(framework_source, basename));
  const synchronization = sources.concat(Object.keys(symlink)).filter(source => {
    const source_symlink = symlink[source] || source;
    return contain(framework_source, source_symlink) && !match(
      framework_ignore, path.relative(framework_source, source_symlink)
    );
  }).map(source => {
    const sympath = path.relative(framework_source, symlink[source] || source);
    if (this.cache.sign(['sync', framework.type, sympath])) {
      forceSync(source, path.join(framework.dirname, sympath));
    } else {
      changes.filter(i => contain(source, i)).forEach(
        i => fileSync(i, path.join(
          framework.dirname, path.join(sympath, path.relative(source, i))
        ))
      );
    }
    return sympath;
  });
  (this.cache.get(['synchronization', framework.type]) || []).filter(
    sympath => synchronization.indexOf(sympath) < 0
  ).forEach(sympath => {
    this.cache.delete(['sync', framework.type, sympath])
  });
  this.cache.set(['synchronization', framework.type], synchronization);

  Object.keys(dynamic).forEach(filename => {
    if (!contain(framework_source, filename)) {
      return;
    }
    const sympath = path.relative(framework_source, filename);
    if (this.cache.update(['sync', framework.type, 'dynamic', sympath], dynamic[filename])) {
      const target = path.join(framework.dirname, sympath);
      fsExtra.outputFileSync(target, dynamic[filename], 'utf8');
    }
  });

  function forceSync(source, target) {
    fsExtra.removeSync(target);
    fsExtra.copySync(source, target);
  }
  function fileSync(source, target) {
    try {
      const stat = fs.statSync(source);
      if (stat.isFile()) {
        fsExtra.copySync(source, target);
      }
    } catch (e) {
      fsExtra.removeSync(target);
    }
  }
};

Framework.prototype.install = async function(framework) {
  if (this.cache.sign(['install', framework.type])) {
    console.log(`framework ${framework.type} install`);
    return install.npm.install(['--registry=http://r.npm.sankuai.com'], {
      cwd: framework.dirname
    }).then(arg => console.log(arg), error => console.log(error));
  }
};


exports = module.exports = Framework;
