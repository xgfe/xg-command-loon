const which = require('which');
const cp = require('child_process');


let NPMPATH
try {
  NPMPATH = which.sync('npm')
} catch (e) {}


exports = module.exports = execNpm;
exports.exec = execNpm;
exports.install = (npmArgs, npmOpts) => {
  return execNpm(['install'].concat(npmArgs), npmOpts);
};

function checkNpm() {
  return new Promise((resolve, reject) => {
    if (!NPMPATH) {
      const err = new Error('No npm binary found in $PATH')
      err.code = 'ENOGIT'
      reject(err);
    } else {
      resolve(NPMPATH);
    }
  });
}

function execNpm(npmArgs, npmOpts) {
  return checkNpm().then(npmPath => {
    return new Promise(function(resolve, reject) {
      const npm = cp.spawn(npmPath, ['install'].concat(npmArgs), npmOpts)
      let stdout = '';
      let stderr = '';
      npm.stdout.on('data', data => {
        stdout += data;
      });
      npm.stderr.on('data', data => {
        stderr += data
      });
      npm.on('error', e => {
        reject(e);
      });
      npm.on('close', code => {
        if (code) {
          reject(stdout);
        } else {
          resolve(stdout);
        }
      });
    });
  })

}
