const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const uuid = require('../util/uuid');

const Hook = require('../Hook');

const Module = require('./Module');
const Framework = require('./Framework');
const Server = require('./Server');
const Gateway = require('./Gateway');


// TODO
// 1. 日志打印
// 2. 逆向
// 3. 监听范围
// 4. 不同版本信息
function Service(option) {
  this.dirname = option.dirname;
  this.tmpdir = option.tmpdir || path.resolve(this.dirname, `.loon.temporary`);
  this.config = option.config;
  this.changes = new Set();
  this.framework = new Framework({
    type: option.framework,
    tmpdir: this.tmpdir,
  });
  this.gateway = new Gateway({
    config: this.config.proxy,
    framework: this.framework,
  });
  this.server = new Server({
    port: option.port,
    proxy: this.gateway
  });
}

Service.prototype.start = function() {
  return this.server.start().then(port => {
    console.log(`server start ${port}`);
    this.update();
    const watcher = chokidar.watch('.', {
      cwd: this.dirname,
      ignored: fpath => /node_modules|\.git|\.swp|\.DS_Store|\.loon\.temporary*/.test(fpath),
      persistent: true,
    });
    watcher.on('ready', () => {
      console.log('start watch', this.dirname);
      watcher.on('all', (type, fpath, fstat) => {
        this.changes.add(path.resolve(this.dirname, fpath));
        this.update();
      });
    });
    // ['SIGINT', 'SIGTERM'].forEach(signal => {
    //   process.on(signal, () => {
    //     this.server.close(() => {
    //       process.exit(0)
    //     });
    //   });
    // });
  }, error => {
    console.log(`server error ${error.message}`);
  });
};

Service.prototype.configurate = function(config) {
  console.log('update config', JSON.stringify(config));
  this.config = config;
  this.update();
  this.gateway.configurate(this.config.proxy);
};

Service.prototype.update = function() {
  // TODO 优化执行次数
  const delay = 300;
  const nextTick = () => {
    clearTimeout(this._update_ticker);
    this._update_ticker = setTimeout(() => this.update(), delay);
  };
  if (this._update_process) {
    return nextTick();
  }
  if (Date.now() - this._update_timestamp < delay) {
    return nextTick();
  }
  this._update_process = true;
  this.refresh().then(effect => {
    this._update_process = false;
    this._update_timestamp = Date.now();
    if (effect) {
    } else {
      nextTick();
    }
  }, error => {
    console.log(error);
    this._update_process = false;
    this._update_timestamp = Date.now();
  });
};

Service.prototype.refresh = async function() {
  if (this._refresh_process) {
    return null;
  }
  try {
    this._refresh_process = true;

    const changes = Array.from(this.changes);
    this.changes.clear();
    console.log('service refresh', changes.length || '');

    const context = await this.context();
    const dynamic = await this.postinstall(context);
    await this.framework.run({
      entry: context.module_entry.dirname,
      dynamic: dynamic.routes,
      symlink: dynamic.modules,
      changes: changes,
    });

    this._refresh_process = false;
    return {};
  } catch (error) {
    this._refresh_process = false;
    throw error;
  }
};

Service.prototype.context = function() {
  return new Promise((resolve, reject) => {
    const config = this.config;
    const modules = fs.readdirSync(this.dirname).map(folder_basename => new Module({
      name: folder_basename,
      dirname: path.resolve(this.dirname, folder_basename)
    })).filter(dep => dep.info());
    const module_entry = modules.find(i => i.name === config.module_entry);
    const module_dependencies = modules.filter(i => {
      if (i.name === config.module_entry) {
        return false;
      } else if (Array.isArray(config.module_dependencies)) {
        return config.module_dependencies.indexOf(i.name) > -1
      } else {
        return true;
      }
    });
    resolve({
      config,
      module_entry,
      module_dependencies,
    });
  });
};

// 强耦合
Service.prototype.postinstall = function(context) {
  const routes = {};
  const modules = {};
  const hook = new Hook({
    dirname: context.module_entry.dirname,
    module_entry: context.module_entry,
    module_dependencies: context.module_dependencies
  }, {
    move: (source, target) => {
      modules[source] = target;
    },
    write: (target, content) => {
      routes[target] = content;
    },
  });
  return hook.run('postinstall').then(arg => ({
    routes: routes,
    modules: modules,
  }));
};

exports = module.exports = Service;
