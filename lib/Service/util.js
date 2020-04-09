const cp = require('child_process');
const path = require('path');
const http = require('http');
const which = require('which');


exports.contain = (parent, child) => {
  if (path.isAbsolute(child)) {
    child = path.relative(parent, child);
    if (!child || child.split(path.sep)[0] === '..') {
      return false;
    }
  }
  return !!child;
};

exports.match = (ignore, filepath) => {
  const fileseps = filepath.split(path.sep);
  return ignore.some(i => {
    const rules = path.normalize(i).split(path.posix.sep);
    const root = !rules[0];
    const seps =  rules.slice(root ? 1 : 0, rules.length - (rules[rules.length - 1] ? 0 : 1));
    let count = 0;
    for (let i = 0; i < fileseps.length; i++) {
      count = fileseps[i] === seps[count] ? (count + 1) : 0;
      if (count === seps.length) {
        return true;
      } else if (root) {
        return false;
      }
    }
    return false;
  });
};

exports.findport = () => new Promise(resolve => http.createServer().listen(function() {
  resolve(this.address().port);
  this.close();
}));

exports.commander = (cmd, { cwd, env }) => {
  let execFile = null;
  const execEnv = {};
  const execArgv = [];
  const compile = str => str.replace(/\$\{([^}]+)\}/, (match, $1) => env[$1]);
  cmd.split(/\s+/).forEach(arg => {
    if (execFile) {
      execArgv.push(compile(arg));
    } else if (/=/.test(arg)) {
      const index = arg.indexOf('=');
      execEnv[arg.slice(0, index)] = compile(arg.slice(index + 1));
    } else {
      execFile = which.sync(arg, {
        path: [path.resolve(cwd, 'node_modules', '.bin'), process.env.PATH].join(':')
      });
    }
  });

  return cp.spawn(execFile, execArgv, {
    cwd: cwd,
    env: Object.assign({}, process.env, execEnv)
  });
};
