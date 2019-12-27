const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const which = require('which');
const Cache = require('./Cache');
const install = require('../install');


const SUPPORT_FRAMEWORK = [{
  type: 'angular',
  module_dirname: 'src/app/Modules',
  output_filepath: 'src/app/Router/loonDeps.js',
  ignore: ['hybrid', 'test'],
}, {
  type: 'hybrid',
  root: 'hybrid',
  module_dirname: 'hybrid/src/loon_modules',
  output_filepath: 'hybrid/src/router/loonDeps.ts',
  ignore: ['tests'],
}];

function Framework(option) {
  this.cache = new Cache();
  this.type = option.type;
  this.dirname = option.dirname;
  this.server = option.server;
  this.service = option.service;
  this.frameworks = [];
}

Framework.prototype.run = async function() {
  return await Promise.all(this.frameworks.map(async framework => {
    await this.install(framework);
    await this.build(framework);
  }))
};

Framework.prototype.install = async function(framework) {
  if (this.cache.sign(['install', framework.type])) {
    console.log(`framework ${framework.type} install`);
    return install.npm.install(['install', '--registry=http://r.npm.sankuai.com'], {
      cwd: framework.target
    }).then(arg => {
      console.log(arg)
    }, error => {
      console.log(error)
    });
  }
};

Framework.prototype.build = async function(framework) {
  const builder = {
    angular: async (framework) => {
      const execFile = which.sync('xg');
      const execArgv = ['release', '--live', '--watch', `--dest=${this.server.dirname}`, '--verbose'];
      const angular = cp.spawn(execFile, execArgv, {
        cwd: framework.target,
        env: Object.assign({}, process.env, {
          FIS_TEMP_DIR: this.service.tmpdir,
        })
      });
      // angular.stdout.on('data', data => process.stdout.write('.'));
      // angular.stderr.on('data', data => process.stdout.write('.'));
      angular.stdout.on('data', data => console.log('[xg]', data.toString()));
      angular.stderr.on('data', data => console.log('[xg]', data.toString()));
      angular.on('error', error => console.log('[xg]', error.toString()));
      angular.on('close', code => console.log('[xg]', code));
    },
    hybrid: async (framework) => {
      const execFile = path.resolve(framework.target, 'node_modules/.bin/vue-cli-service');
      const execArgv = ['serve', `--port=${this.server.fork}`];
      const hybrid = cp.spawn(execFile, execArgv, {
        cwd: framework.target
      });
      hybrid.stdout.on('data', data => process.stdout.write('.'));
      hybrid.stderr.on('data', data => process.stderr.write('.'));
      hybrid.on('error', error => console.log('[vue-cli-service]', error));
      hybrid.on('close', code => console.log('[vue-cli-service]', code));
    }
  };
  if (this.cache.sign(['build', framework.type])) {
    console.log(`framework ${framework.type} build`);
    await builder[framework.type](framework);
  }
};

Framework.prototype.sync = async function({ entry, routes, modules, changes }) {
  await this.init(entry);
  this.frameworks.forEach(framework => {
    // 框架
    if (this.cache.sign(['framework', framework.type])) {
      framework.files.forEach(([source, target]) => {
        fsExtra.removeSync(target);
        fsExtra.copySync(source, target)
      });
    } else {
      const regexp = new RegExp(`^${framework.source}\/`);
      changes.map(source => {
        if (regexp.test(source)) {
          const fpath = source.replace(regexp, '');
          if (framework.ignore.indexOf(fpath.split(path.sep)[0]) < 0) {
            return {
              path: fpath,
              source: source,
            };
          }
        }
      }).filter(i => i && i.path !== framework.output_filepath).forEach(change => {
        sync(
          path.resolve(framework.source, change.path),
          path.resolve(framework.target, change.path)
        );
      });
    }

    // 模块
    const regexp = new RegExp(`^\/${framework.module_dirname}\/`);
    const lastestModules = this.cache.get([framework.type, 'module']) || [];
    const currentModules = modules.map(([source, target]) => {
      if (regexp.test(target)) {
        const basename = path.basename(source);
        if (this.cache.update([framework.type, 'module', basename], target)) {
          fsExtra.removeSync(path.join(framework.dirname, target));
          fsExtra.copySync(source, path.join(framework.dirname, target));
        } else {
          const regexp = new RegExp(`^${source}\/`);
          changes.map(source => {
            if (regexp.test(source)) {
              const fpath = source.replace(regexp, '');
              return {
                path: fpath,
                source: source,
              };
            }
          }).filter(i => i).forEach(change => {
            sync(
              change.source,
              path.join(framework.dirname, target, change.path)
            );
          });
        }
        return basename;
      }
    }).filter(i => i);
    const removeModules = lastestModules.filter(i => currentModules.indexOf(i) < 0);
    removeModules.forEach(basename => this.cache.delete([framework.type, 'module', basename]));
    this.cache.set([framework.type, 'module'], currentModules);

    // 路由
    const route_regexp = new RegExp(`^\/${framework.output_filepath}`);
    routes.forEach(([target, content]) => {
      if (route_regexp.test(target)) {
        if (this.cache.update([framework.type, 'route', target], content)) {
          fsExtra.outputFileSync(path.join(framework.dirname, target), content, 'utf8')
        }
      }
    });
  });
  return this.frameworks;

  function sync(source, target) {
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

Framework.prototype.init = function(entry) {
  if (this.cache.set('entry', entry.name)) {
    return reject(new Error('not support dynamic update module_entry'));
  }
  return this.frameworks = SUPPORT_FRAMEWORK.filter(framework => {
    return this.type ? this.type === framework.type : true;
  }).map(framework => {
    const root = framework.root || '';
    const dirname = path.resolve(this.dirname, framework.type);
    const ignore = framework.ignore.concat(['.DS_Store', '.git', 'node_modules']);
    const source = path.resolve(entry.dirname, root);
    const target = path.resolve(dirname, root);
    return Object.assign({}, framework, {
      dirname: dirname,
      source: source,
      target: target,
      ignore: ignore,
      files: fsExtra.readdirSync(source).filter(i => ignore.indexOf(i) < 0).map(basename => ([
        path.resolve(source, basename),
        path.resolve(target, basename),
      ]))
    });
  });
};


exports = module.exports = Framework;
