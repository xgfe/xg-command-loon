const os = require('os');
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const install = require('./install');
const uuid = require('./util/uuid');


// OPTI
// 目前在外部进行串行下载控制
// 存在性能瓶颈时，可进行并发/调度优化
function Installer() {
  this.cache = {};
}

Installer.prototype.download = function(remote, local) {
  return this.getCache(remote).then(bare => ({
    resolved: bare.dirname
  }), () => remote).then(repo => {
    const { resolved, key } = repo;
    return install.git.clone(resolved, local, key);
  });
};

Installer.prototype.getCache = function(remote) {
  const { resolved, key } = remote;
  if (this.cache[resolved]) {
    return Promise.resolve(this.cache[resolved]);
  }
  const cacheDirname = path.resolve(os.tmpdir(), 'xg-command-loon/_cache', uuid());
  return install.git.cloneBare(resolved, cacheDirname, key).then(() => {
    return this.cache[resolved] = {
      dirname: cacheDirname,
    };
  });
};


exports = module.exports = new Installer();
