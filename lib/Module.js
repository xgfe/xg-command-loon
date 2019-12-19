const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const child_process = require('child_process');
const install = require('./install');


function Module(opt) {
    this.name = opt.name;
    this.version = opt.version;
    this.resolved = opt.resolved;
    this.key = opt.key;
    this.dirname = path.resolve(opt.dirname, this.name);
}

Module.prototype.install = function () {
    const dirname = this.dirname;
    const resolved = this.resolved;
    const version = this.version;
    const pem = this.key;

    fsExtra.removeSync(dirname);
    return install.git.clone(resolved, dirname, pem).then(() => {
        return install.git.exec(['checkout', version], {
            cwd: dirname
        }).then(() => {
            return install.git.exec(['rev-parse', 'HEAD'], {
                cwd: dirname
            }).then(sha => {
                sha = sha.trim();
                this.sha = sha;
                return sha;
            });
        });
    });
};

Module.prototype.info = function() {
    if (this._package) {
        return this._package;
    } else {
        this._package = JSON.parse(fs.readFileSync(path.resolve(this.dirname, 'package.json'), 'utf8'));
        return this._package;
    }
};


exports = module.exports = Module;
