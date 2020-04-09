const cp = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const fsExtra = require('fs-extra');
const micromatch = require('micromatch');
const which = require('which');
const Cache = require('./Cache');
const logger = require('./logger');
const install = require('../install');
const handler = require('serve-handler');
const { contain, match, commander, findport, template } = require('./util');


const FULL_PROCEDURE = ['sync', 'install', 'compile', 'serve'];
function Framework(option) {
  this.cache = new Cache();
  this.tmpdir = option.tmpdir;
  this.type = option.type;
  this.proxy = [];

  let procedure = Array.isArray(option.procedure) ? option.procedure.filter(i => FULL_PROCEDURE.indexOf(i) > -1) : [];
  this.procedure = {};
  (procedure.length > 0 ? procedure : FULL_PROCEDURE).forEach(key => {
    this.procedure[key] = true;
  });
}

Framework.prototype.run = async function(data) {
  const frameworks = require('./framework.supports').filter(({ type }) => {
    return !this.type || this.type === type
  }).map(framework => Object.assign({}, framework, {
    dirname: path.resolve(path.resolve(this.tmpdir, `${framework.type}.framework.sync`))
  }));

  await Promise.all(frameworks.map(async framework => {
    framework.__ENV = {
      DIRNAME: framework.dirname,
      WWWDIR: path.resolve(this.tmpdir, `${framework.type}.framework.www`),
      TMPDIR: path.resolve(this.tmpdir, `${framework.type}.framework.tmp`),
    };
    framework.__ENV.PORT = await findport();
    fsExtra.ensureDirSync(framework.__ENV.WWWDIR);
    fsExtra.ensureDirSync(framework.__ENV.TMPDIR);

    if (this.procedure.sync) {
      await this.sync(framework, data);
    }

    if (this.procedure.install) {
      await this.install(framework);
    }

    if (this.procedure.compile) {
      await this.compile(framework);
    }

    if (this.procedure.serve) {
      await this.serve(framework);
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
    if (!(contain(framework_source, filename) && !match(
      framework_ignore, path.relative(framework_source, filename)
    ))) {
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
  if (!this.cache.sign(['install', framework.type])) {
    return;
  }
  const log = logger(framework.type);
  log.info(`framework install`);
  return install.npm.install(['--registry=http://r.npm.sankuai.com'], {
    cwd: framework.dirname
  }).then(arg => log.info(arg), error => log.error(error));
};

Framework.prototype.compile = async function(framework) {
  if (!this.cache.sign(['compile', framework.type])) {
    return;
  }

  const log = logger(framework.type);
  log.info(`framework compile`);
  const damon = commander(framework.compile, {
    cwd: framework.dirname,
    env: framework.__ENV,
  });

  damon.stdout.on('data', data => log.log(data));
  damon.stderr.on('data', data => log.warn(data));
  damon.on('error', error => log.error(`${error}`));
  damon.on('close', code => log.warn(`close ${code}`));
};

Framework.prototype.serve = function(framework) {
  if (!this.cache.sign(['serve', framework.type])) {
    return;
  }

  const log = logger(framework.type);
  log.info(`framework serve`);

  const server = framework.server;
  const env = framework.__ENV;

  if (server.proxy) {
    logger().info(`Server(${framework.type}) Port: ${env.PORT}`);
    this.proxy.push({
      context: [].concat(server.proxy),
      target: `http://localhost:${env.PORT}`
    });
  }

  if (server.static) {
    this.proxy.push({
      context: pathname => {
        const match_files = fs.readdirSync(env.WWWDIR).map(i => fs.statSync(path.resolve(env.WWWDIR, i)).isFile() ? (
          path.extname(i) === '.html' ? i.slice(0, i - 5) + '*' : i
        ) : (i + '/**'));
        const match_rewrites = Object.keys(server.static || {});
        const prefix = [].concat(match_files, match_rewrites).map(i => '/' + i.replace(/^\//, ''));
        return micromatch.isMatch(pathname, prefix);
      },
      target: async (request, response) => {
        return await handler(request, response, {
          public: env.WWWDIR,
          rewrites: Object.keys(server.static || {}).map(source => ({
            source: source,
            destination: server.static[source]
          })),
        });
      },
    });
  }
};

Framework.prototype.server = function() {
  return [].concat(this.proxy);
};

Framework.prototype.entry = function() {
  return this.cache.get('entry');
};


exports = module.exports = Framework;
