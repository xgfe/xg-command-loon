const fs = require('fs');
const path = require('path');
const logger = require('./util/logger');


exports = module.exports = function(type, hooks, ...args) {
    const log = logger(`hooks`);
    return new Promise((resolve, reject) => {
        const hook = hooks[type];
        if (hook) {
            log(type, `${hook.type}`);
            fs.access(hook.path, error => {
                if (error) {
                    reject(error);
                } else {
                    log.info(true, hook.path);
                    try {
                        resolve(require(hook.path)(...args));
                    } catch (e) {
                        reject(e);
                    }
                    log.info(false);
                }
            });
        } else {
            log(type, 'skiped')
            resolve();
        }
    }).catch(error => {
        throw error;
    });
};
