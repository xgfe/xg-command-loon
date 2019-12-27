const os = require('os');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const uuid = require('../util/uuid');

const Hook = require('../Hook');

const Module = require('./Module');
const Server = require('./Server');
const Framework = require('./Framework');

// TODO
// 1. 日志打印
// 2. 逆向
// 3. 监听范围
function Service(option) {
  this.dirname = option.dirname;
  this.tmpdir = option.tmpdir || path.resolve(this.dirname, `.loon.temporary`);
  this.config = option.config;
  this.changes = new Set();
  this.server = new Server({
    port: option.port,
    dirname: path.resolve(this.tmpdir, 'www'),
  });
  this.framework = new Framework({
    service: this,
    server: this.server,
    dirname: path.resolve(this.tmpdir, 'sync'),
    type: option.framework,
  });
}

Service.prototype.start = function() {
  return this.server.start().then(server => {
    console.log(`server start ${server.port}`);
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
  }, error => {
    console.log(`server error ${error.message}`);
  });
};

Service.prototype.configurate = function(config) {
  console.log('update config', JSON.stringify(config));
  this.config = config;
  this.update();
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
    if (effect) {
    } else {
      nextTick();
    }
  }, error => {
  }).finally(() => {
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
    await this.framework.sync({
      entry: context.module_entry,
      routes: dynamic.routes,
      modules: dynamic.modules,
      changes: changes,
    });

    await this.framework.run();

    return {};
  } catch (error) {
    throw error;
  } finally {
    this._refresh_process = false;
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

Service.prototype.postinstall = function(context) {
  const routes = new Map();
  const modules = new Map();
  const helper = {
    move: (source, target) => modules.set(source, target),
    write: (target, content) => routes.set(target, content),
  };
  const hook = new Hook({
    dirname: '/',
    module_entry: context.module_entry,
    module_dependencies: context.module_dependencies
  }, helper);
  return hook.run('postinstall').then(arg => ({
    routes: Array.from(routes),
    modules: Array.from(modules),
  }));
};

exports = module.exports = Service;
