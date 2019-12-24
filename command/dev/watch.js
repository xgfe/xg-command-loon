const fs = require('fs');
const chokidar = require('chokidar');
const logger = require('../../lib/util/logger');
const throttle = require('../../lib/util/throttle');




exports = module.exports = function watch(fn) {
    const watcher = chokidar.watch('.', {
        cwd: process.cwd(),
        ignored: fpath => {
            if (/node_modules|\.git|\.swp|\.DS_Store/.test(fpath)) {
                return true;
            }
        },
        persistent: true,
    });
    let changes = [];
    let update = throttle(() => {
        fn(changes);
        changes = [];
    });
    watcher.on('ready', (...args) => {
        fn();
        watcher.on('all', (type, path) => {
            changes.push(path);
            update();
        });
    });
}
