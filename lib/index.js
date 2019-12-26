const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const fsExtra = require('fs-extra');
const serialPromise = require('./util/serialPromise');
const logger = require('./logger');
const Hook = require('./Hook');
const Module = require('./Module');
const validateConfig = require('./validateConfig');


exports = module.exports = function(config) {
  return validateConfig(config).then(() => { // 初始化ctx数据结构
    const ctx = config;
    ctx.hook = new Hook(ctx);
    ctx.loon_modules = path.resolve(ctx.dirname, 'loon_modules');
    ctx.module_entry = null;
    ctx.module_dependencies = [];
    Object.keys(ctx.project.module_dependencies).map(dep_name => {
      const dep_item = ctx.project.module_dependencies[dep_name];
      if (dep_name === ctx.project.module_entry) {
        ctx.module_entry = new Module(Object.assign({
          name: dep_name,
          dirname: ctx.dirname
        }, dep_item));
      } else {
        ctx.module_dependencies.push(new Module(Object.assign({
          name: dep_name,
          dirname: path.join(ctx.loon_modules, dep_name)
        }, dep_item)));
      }
    });

    return ctx;
  }).then(ctx => { // 初始化Entry
    logger.log('project config', ctx._config.type);
    logger.log('project dirname', ctx.dirname);
    logger.log('Initialize Entry', ctx.module_entry.name + '@' + ctx.module_entry.version);
    return ctx.module_entry.initialize().then(sha => {
      logger.log.info('commit', sha);
      return ctx;
    });
  }).then(ctx => { // hooks preinstall
    logger.log(' Hook preinstall');
    return ctx.hook.run('preinstall').then(result => {
      logger.log.info('run', result.hook || 'skiped');
      if (result.data) {
        logger.log.info('result', JSON.stringify(result.data));
      }
      return ctx
    });
  }).then(ctx => { // 安装依赖
    // 清理安装目录
    fsExtra.removeSync(ctx.loon_modules);
    logger.log('Clean dirname', ctx.loon_modules);
    const installers = ctx.module_dependencies.map(dep => {
      return () => {
        logger.log('Install Module', `${dep.name}@${dep.version}`);
        logger.log.info('dirname', dep.dirname);
        logger.log.info('resolved', dep.resolved);
        return dep.install().then(sha => {
          logger.log.info('commit', sha);
        });
      };
    });
    return serialPromise(installers).then(() => ctx);
  }).then(ctx => { // hooks postinstall
    logger.log('Hook postinstall');
    return ctx.hook.run('postinstall').then(result => {
      logger.log.info('run', result.hook || 'skiped');
      if (result.data) {
        logger.log.info('result', JSON.stringify(result.data));
      }
      return ctx
    });
  }).then(ctx => {
    logger.log('Information');
    logger.print(JSON.stringify({
      dirname: ctx.dirname,
      loon_modules: ctx.loon_modules,
      module_entry: ctx.module_entry.info(),
      module_dependencies: ctx.module_dependencies.map(dep => dep.info()),
      _config: config._config,
    }));
    logger.log('Install success');
    return ctx;
  }).catch(error => {
    logger.error(error);
    throw error;
  });
};
