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
  this.dirname = opt.dirname;
}

Module.prototype.install = function() {
  fsExtra.removeSync(this.dirname);
  return install.git.clone(this.resolved, this.dirname, this.key).then(() => this.initialize());
};

Module.prototype.initialize = function() {
  return (DYNAMIC_VERSION.indexOf(this.version) > -1
    ? Promise.resolve()
    : install.git.exec(['checkout', this.version], {
      cwd: this.dirname
    })
  ).then(() => {
    const packagePath = path.resolve(this.dirname, 'package.json');
    this.package = fsExtra.readJSONSync(packagePath);
    return this.sha();
  });
};

Module.prototype.sha = function() {
  return install.git.exec(['rev-parse', 'HEAD'], {
    cwd: this.dirname
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
