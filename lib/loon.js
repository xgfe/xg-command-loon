const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const fsExtra = require('fs-extra');
const readConfig = require('./util/readConfig');
const serialPromise = require('./util/serialPromise');
const logger = require('./util/logger');
const generateOption = require('./generateOption');
const hooks = require('./hooks');
const Entry = require('./Entry');
const Module = require('./Module');


exports = module.exports = function(argv) {
    return generateOption(argv).then(option => {
        return option;
    }).then(option => { // 初始化ctx数据结构
        const ctx = option;
        const module_entry = ctx.package.module_entry;
        const module_dependencies = ctx.package.module_dependencies;
        const module_info = (module_name, module_info) => Object.assign({ name: module_name }, module_info);
        // 模块安装目录
        ctx.module_dirname = path.resolve(ctx.cwd, 'loon_modules');
        // 模块入口
        ctx.module_entry = module_info(module_entry, module_dependencies[module_entry]);
        // 模块依赖
        ctx.module_dependencies = Object.keys(module_dependencies)
            .filter(module_name => module_name !== module_entry)
            .map(module_name => module_info(module_name, module_dependencies[module_name]));
        return ctx;
    }).then(ctx => { // 初始化Entry
        ctx.module_entry = new Entry(ctx.module_entry, ctx.cwd);
        logger.log('cwd', ctx.cwd);
        logger.log('config', ctx.type, ctx.raw);
        logger.log('entry', ctx.package.module_entry);
        logger.log('dependencies', Object.keys(ctx.package.module_dependencies).join(','));
        logger.log('Initialize Entry', ctx.module_entry.name + '@' + ctx.module_entry.version);
        return ctx.module_entry.initialize().then(sha => {
            if (ctx.module_entry.dynamic) {
                logger.log.info('version', 'host version');
            }
            logger.log.info('commit', sha);
            return ctx;
        });
    }).then(ctx => { // hooks preinstall
        return hooks('preinstall', {
            custom: argv.customHook,
            dirname: ctx.module_entry.dirname,
            package: ctx.module_entry.info(),
            argument: {
                ctx: ctx,
                dirname: ctx.module_entry.dirname,
                dependencies: ctx.module_dependencies.map(mod => ({
                    name: mod.name,
                    version: mod.version,
                    resolved: mod.resolved,
                })),
            },
        }).then(() => ctx);
    }).then(ctx => { // 安装依赖
        // 清理安装目录
        fsExtra.removeSync(ctx.module_dirname);
        logger.log('cleandir', ctx.module_dirname);

        // 下载文件
        ctx.module_dependencies = ctx.module_dependencies.map(data => new Module({
            name: data.name,
            version: data.version,
            resolved: data.resolved,
            key: data.key,
            dirname: ctx.module_dirname
        }));
        const installers = ctx.module_dependencies.map(mod => () => {
            logger.log('Install Module', `${mod.name}@${mod.version}`);
            logger.log.info('dirname', mod.dirname);
            logger.log.info('resolved', mod.resolved);
            return mod.install().then(sha => {
                logger.log.info('commit', sha);
                const module_name = mod.name;
                const package_name = mod.info().name;
                if (module_name !== package_name) {
                    throw new Error(`The name of loon(${
                        module_name
                    }) and package.json(${
                        package_name
                    }) must be the same`);
                }
            });
        });
        return serialPromise(installers).then(() => ctx);
    }).then(ctx => { // hooks postinstall
        return hooks('postinstall', {
            custom: argv.customHook,
            dirname: ctx.module_entry.dirname,
            package: ctx.module_entry.info(),
            argument: {
                ctx: ctx,
                dirname: ctx.module_entry.dirname,
                dependencies: ctx.module_dependencies.map(mod => ({
                    name: mod.name,
                    version: mod.version,
                    resolved: mod.resolved,
                    dirname: mod.dirname,
                    package: mod.info(),
                })),
            },
        }).then(() => ctx);
    }).then(ctx => {
        logger.log('Information');
        logger.print(JSON.stringify({
            cwd: ctx.cwd,
            name: ctx.module_entry.name,
            version: ctx.module_entry.version,
            dirname: ctx.module_entry.dirname,
            module_dirname: ctx.module_dirname,
            entry: {
                name: ctx.module_entry.name,
                version: ctx.module_entry.version,
                dirname: ctx.module_entry.dirname,
                package: ctx.module_entry.info(),
            },
            dependencies: ctx.module_dependencies.map(mod => ({
                name: mod.name,
                version: mod.version,
                resolved: mod.resolved,
                dirname: mod.dirname,
                package: mod.info(),
            }))
        }));
        logger.log('Install success');
        return ctx;
    }).catch(error => {
        logger.error(error);
        throw error;
    });
};
