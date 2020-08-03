const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const install = require('./install');
const installer = require('./installer');


const DYNAMIC_VERSION = ['$PLUS'];
function Module(opt) {
  opt = opt || {};
  this.name = opt.name; // loon 设置的名称
  this.version = opt.version; // loon 发布的版本
  this.resolved = opt.resolved; // loon 配置的下载地址
  this.key = opt.key; // 下载密钥
  this.dirname_install = opt.dirname; // 代码下载目录
  this.dirname_path = (opt.path || '').replace(/^\//, ''); // 一仓多模块配置路径
  this.dirname = path.resolve(this.dirname_install, this.dirname_path); // 真实模块代码目录
}

Module.prototype.install = function() {
  fsExtra.removeSync(this.dirname_install);
  return installer.download({
    resolved: this.resolved,
    key: this.key,
  }, this.dirname_install).then(() => this.initialize());
};

Module.prototype.initialize = function() {
  // OPTI 子模块使用主模块 version tag
  return (DYNAMIC_VERSION.indexOf(this.version) > -1
    ? Promise.resolve()
    : install.git.exec(['checkout', this.version], {
      cwd: this.dirname_install
    })
  ).then(() => {
    const packagePath = path.resolve(this.dirname, 'package.json');
    // 必须有packge.json，否则报错
    this.package = fsExtra.readJSONSync(packagePath);
    return this.sha();
  });
};

Module.prototype.sha = function() {
  return install.git.exec(['rev-parse', 'HEAD'], {
    cwd: this.dirname_install
  }).then(sha => sha.trim());
};

Module.prototype.info = function() {
  return {
    name: this.name,
    version: this.version,
    resolved: this.resolved,
    dirname: this.dirname,
    package: this.package,
  };
};


exports = module.exports = Module;
