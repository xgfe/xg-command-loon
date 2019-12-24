const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const logger = require('./util/logger');



exports = module.exports = function(type, option) {
    const log = logger(`hooks`);
    return new Promise((resolve, reject) => {
        const hook = getHook(type, option);
        if (hook) {
            log(type, `${hook.type}`);
            fs.access(hook.path, error => {
                if (error) {
                    reject(error);
                } else {
                    log.info(true, hook.path);
                    try {
                        resolve(require(hook.path)(option.argument, {
                            fs: fsExtra,
                            logger: logger,
                            install: function install(source, target) {
                                // 移动模块
                                if (source === target) {
                                    logger.print(`same dirname ${source}`);
                                } else {
                                    fsExtra.removeSync(target);
                                    fsExtra.moveSync(source, target);
                                    logger.print(`move ${source} to ${target}`)
                                }
                            },
                            rewrite: function rewrite(target, content) {
                                fsExtra.removeSync(target);
                                fsExtra.outputFileSync(target, content, 'utf8');
                                logger.print(`write ${target}`);
                                logger.print(JSON.stringify(content));
                            },
                        }));
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
    });
};

function getHook(type, option) {
    const scripts = ((option.package.config || {})['loon'] || {}).scripts || {};
    if (option.custom) {
        if (scripts[type]) {
            return {
                type: 'custom',
                path: path.resolve(option.dirname, scripts[type])
            };
        } else {
            return null;
        }
    } else {
        return {
            type: 'build-in',
            path: path.resolve(__dirname, '../plugin', `hooks-${type}.js`),
        };
    }
}
