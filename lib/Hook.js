const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');


function Hook(context, helper) {
  this.context = context;
  this.helper = helper;
}

Hook.prototype.run = function(type) {
  return new Promise(resolve => {
    const context = this.context;
    const scripts = ((context.module_entry.info().package.config || {}).loon || {}).scripts || {};
    const hook_script = scripts[`loon-${type}`];
    let hook_path;
    if (typeof hook_script === 'string') {
      hook_path = path.resolve(context.dirname, hook_script);
    } else if (hook_script !== false) {
      hook_path = path.resolve(__dirname, './plugin', `hooks-${type}.js`);
    } else {
      hook_path = null;
    }
    const hook_data = hook_path ? require(hook_path)(this.option()) : null;
    const hook_promise = Promise.resolve(hook_data).then(data => ({
      type: type,
      hook: hook_path,
      data: data,
    }));
    resolve(hook_promise);
  });
};

Hook.prototype.option = function() {
  const context = this.context;
  return {
    dirname: context.dirname,
    dependencies: context.module_dependencies.map(dep => dep.info()),
    helper: this.helper || {
      move: function move(source, target) {
        if (source !== target) {
          fsExtra.removeSync(target);
          fsExtra.moveSync(source, target);
        }
      },
      write: function write(target, content) {
        fsExtra.outputFileSync(target, content, 'utf8');
      },
    },
    _context: context,
  };
};


exports = module.exports = Hook;
