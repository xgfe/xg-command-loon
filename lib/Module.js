const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const install = require('./install');


const DYNAMIC_VERSION = ['$PLUS'];
function Module(opt) {
  this.name = opt.name;
  this.version = opt.version;
  this.resolved = opt.resolved;
  this.key = opt.key;
  this.dirname_install = opt.dirname;
  this.dirname_path = (opt.path || '').replace(/^\//, '');
  this.dirname = path.resolve(this.dirname_install, this.dirname_path);
}

Module.prototype.install = function() {
  fsExtra.removeSync(this.dirname_install);
  return install.git.clone(this.resolved, this.dirname_install, this.key).then(() => this.initialize());
};

Module.prototype.initialize = function() {
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
