const fs = require('fs');
const path = require('path');


const MODULE_TYPE = {
    angular: {
        modules_filter: module_item => (module_item.package.config || {})['xg-angular'],
        modules_dirname: 'src/app/Modules',
        output_filepath: 'src/app/Router/loonDeps.js',
        output_template: loon_modules => {
            return `define([\n${
                loon_modules.map(route => JSON.stringify(route.main_path)).join(',\n')
            }\n], function () {});\n`
        }
    },
    hybrid: {
        modules_filter: module_item => !(module_item.package.config || {})['xg-angular'],
        modules_dirname: 'hybrid/src/loon_modules',
        output_filepath: 'hybrid/src/router/loonDeps.ts',
        output_template: loon_modules => {
            const modules = loon_modules.map((item, index) => ({
                name: `PAGE_${index}$${item.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
                from: JSON.stringify(`../loon_modules/${item.main_path}`),
            }));
            const import_code = modules.map(item => `import ${item.name} from ${item.from};`).join('\n');
            const export_vars = modules.map(item => `...${item.name}`).join(',');
            return `${import_code}\nexport default [${export_vars}];`;
        }
    }
};

exports = module.exports = (information, helper) => {
    const logger = helper.logger;
    Object.keys(MODULE_TYPE).forEach(key => {
        const option = MODULE_TYPE[key];

        logger.print('framework', key);
        logger.log.line();

        // 依赖模块
        const loon_modules = information.dependencies.filter(option.modules_filter).map(module_item => {
            const module_info = {};
            module_info['name'] = module_item.name;
            module_info['main'] = path.posix.join(module_item.name, module_item.package.main);
            module_info['main_path'] = module_info['main'].replace(/\.[^.]+$/, '');
            module_info['main_ext'] = path.posix.extname(module_info['main']);
            module_info['dirname'] = path.resolve(information.dirname, option.modules_dirname, module_item.name);
            module_info['raw'] = module_item;

            // 移动模块
            helper.fs.removeSync(module_info.dirname);
            helper.fs.moveSync(module_item.dirname, module_info.dirname);
            logger.print(`move ${module_item.dirname} to ${module_info.dirname}`)

            return module_info;
        });

        // 输出文件
        const output_content = option.output_template(loon_modules);
        const output_filepath = path.resolve(information.dirname, option.output_filepath);
        helper.fs.removeSync(output_filepath);
        helper.fs.outputFileSync(output_filepath, output_content, 'utf8');
        logger.print(`write ${output_filepath}`);
        logger.print(JSON.stringify(output_content));
        logger.log.line('=');
    });
};
