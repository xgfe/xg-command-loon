const which = require('which');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const fsExtra = require('fs-extra');
const os = require('os');
const uuid = require('../util/uuid');


let GITPATH
try {
  GITPATH = which.sync('git')
} catch (e) {}


function createPEM(pem) {
    if (!pem) {
        return;
    }
    const UUID = uuid();
    const tmpDir = os.tmpdir();
    const pemDir = path.join(tmpDir, UUID);
    const pemKey = path.join(pemDir, 'key.pem');
    const pemShell = path.join(pemDir, 'key.sh');
    const pemShellFile = [
        'ssh',
        '-o StrictHostKeyChecking=no',
        '-o UserKnownHostsFile=/dev/null',
        '-i', pemKey,
        '$@',
    ].join(' ');

    fsExtra.outputFileSync(pemShell, pemShellFile, {
        encoding: 'utf8',
        mode: 0o500
    });
    fsExtra.outputFileSync(pemKey, pem, {
        encoding: 'utf8',
        mode: 0o600
    });
    return {
        dir: pemDir,
        sh: pemShell,
        key: pemKey,
    };
}

exports.clone = function (repo, target, pem) {
    pem = createPEM(pem);
    const opts = {
        env: {
            GIT_ASKPASS: 'echo',
            GIT_SSH: pem ? pem.sh : undefined,
        },
    };
    return execGit([
        'clone', repo, target,
    ], opts).then(function () {
        if (pem) {
            fsExtra.removeSync(pem.dir);
        }
    });
};

exports.exec = execGit;
function execGit (gitArgs, gitOpts) {
  return checkGit().then(gitPath => {
    return new Promise(function (resolve, reject) {
        cp.execFile(gitPath, gitArgs, gitOpts, function (error, stdout, stderr) {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
  })
}

function checkGit () {
    return new Promise((resolve, reject) => {
        if (!GITPATH) {
            const err = new Error('No git binary found in $PATH')
            err.code = 'ENOGIT'
            reject(err);
        } else {
            resolve(GITPATH);
        }
    });
}
