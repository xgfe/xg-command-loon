const path = require('path');
const fsExtra = require('fs-extra');


function Module(opt) {
  this.name = opt.name;
  this.dirname = opt.dirname;
}

Module.prototype.info = function() {
  try {
    return {
      name: this.name,
      dirname: this.dirname,
      package: fsExtra.readJSONSync(path.resolve(this.dirname, 'package.json')),
    };
  } catch (e) {
  }
};


exports = module.exports = Module;
