const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const logger = require('../../lib/util/logger');
const hook = require('../../plugin/hooks-postinstall');

const cache = require('./cache');

function getFolder() {
    const obj = {};
    (cache.get('folder') || []).forEach(folder_basename => {
        obj[folder_basename] = cache.get(['install', folder_basename]);
    });
    return obj;
}

exports = module.exports = configPath => {
    logger.print(`hooks-postinstall@v${hook.version}`);
    logger.print(' config:', `${configPath}`);
    return function (file_changes) {
        const cwd = process.cwd();
        const configFile = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configFile);
        if (cache.set('config', configFile)) {
            logger.print('project:', config.dirname)
        }

        const lastestFolder = getFolder();

        const hookContext = {
            dirname: config.dirname,
            dependencies: fs.readdirSync(cwd).map(basename => {
                try {
                    const dirname = path.resolve(cwd, basename);
                    const module_package = JSON.parse(
                        fs.readFileSync(
                            path.resolve(dirname, 'package.json'), 'utf8'
                        )
                    );
                    logger.progress();
                    return {
                        name: module_package.name,
                        version: '',
                        resolved: dirname,
                        dirname: dirname,
                        package: module_package,
                    };
                } catch (error) {
                    logger.progress(error.message);
                }
            }).filter(i => i),
        };
        if (hookContext.dependencies.map(i => i.name).some((i, index, list) => list.indexOf(i) !== index)) {
            throw new Error(`Duplicate module name in ${hookContext.dependencies.map(i => i.name)}`);
        }

        const currentFolder = {};
        logger.progress();
        hook(hookContext, {
            fs: fsExtra,
            logger: logger,
            install: (source, target) => {
                const folder_basename = path.basename(source);
                const updated = cache.set(['install', folder_basename], target);
                cache.add('folder')(folder_basename);
                currentFolder[folder_basename] = target;
                if (updated) {
                    fsExtra.removeSync(target);
                    fsExtra.copySync(source, target);
                    logger.progress();
                }
            },
            rewrite: (target, content) => {
                const updated = cache.set(['rewrite', target], content);
                if (updated) {
                    fsExtra.outputFileSync(target, content, 'utf8');
                    logger.progress();
                }
            },
        });

        // 删除模块记录
        Object.keys(lastestFolder).filter(i => !currentFolder[i]).forEach(folder_basename => {
            cache.delete(['install', folder_basename]);
            cache.remove('folder', folder_basename);
        });

        // 差量更新
        const totalFolder = getFolder();
        const diffFolder = Object.keys(totalFolder).filter(i => lastestFolder[i]);
        (file_changes || []).forEach(fpath => {
            const seps = fpath.split(path.sep);
            const folder_basename = seps[0];
            if (diffFolder.indexOf(folder_basename) < 0) {
                return;
            }
            const source = path.resolve(cwd, fpath);
            const target = path.join(
                cache.get(['install', folder_basename]),
                fpath.slice(folder_basename.length)
            );

            try {
                const stat = fs.statSync(source);
                if (stat.isFile()) {
                    fsExtra.copySync(source, target);
                    process.stdout.write('.');
                }
            } catch (e) {
                fsExtra.removeSync(target)
                process.stdout.write('.');
            }
        });
    }
};
