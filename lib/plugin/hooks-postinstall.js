const fs = require('fs');
const path = require('path');


const OPTIONS = [{
  module_type: 'angular',
  module_filter: dep => (dep.package.config || {})['xg-angular'],
  module_dirname: 'src/app/Modules',
  output_filepath: 'src/app/Router/loonDeps.js',
  output_versions: 'src/app/loonVersions.json',
  output_template: loon_modules => {
    return `define([\n${
      loon_modules.map(route => JSON.stringify(route.main_path)).join(',\n')
    }\n], function () {});\n`
  }
}, {
  module_type: 'hybrid',
  module_filter: dep => !(dep.package.config || {})['xg-angular'],
  module_dirname: 'hybrid/src/loon_modules',
  output_filepath: 'hybrid/src/router/loonDeps.ts',
  output_versions: 'hybrid/src/loonVersions.json',
  output_template: loon_modules => {
    // OPTI 构建工具和约定升级后，不再拼接package.main路径
    // 潜羽仅做包引用，文件查找交给构建缓解
    const modules = loon_modules.map((item, index) => ({
      name: `PAGE_${index}$${item.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      from: JSON.stringify(`../loon_modules/${item.main_path}`),
    }));
    const import_code = modules.map(item => `import ${item.name} from ${item.from};`).join('\n');
    const export_vars = modules.map(item => `...${item.name}`).join(',');
    return `${import_code}\nexport default [${export_vars}];`;
  }
}];


exports = module.exports = information => OPTIONS.map(option => {
  // 依赖模块
  const loon_modules = information.dependencies.filter(option.module_filter).map(dep => {
    const module_package = dep.package;
    const module_name = module_package.name;
    const module_main = module_package.main;
    const module_version = module_package.version;
    const module_info = {
      name: module_name,
      version: module_version,
      main: path.posix.join(module_name, module_main),
      main_path: path.posix.join(
        module_name,
        module_main.slice(0, module_main.length - path.posix.extname(module_main).length)
      ),
      main_ext: path.posix.extname(module_main),
      dirname: path.resolve(information.dirname, option.module_dirname, module_name),
      _raw: dep,
    };

    information.helper.move(dep.dirname, module_info.dirname);

    return module_info;
  });

  // 输出文件
  const output_filepath = path.resolve(information.dirname, option.output_filepath);
  const output_content = option.output_template(loon_modules);
  information.helper.write(output_filepath, output_content);

  const output_versions = path.resolve(information.dirname, option.output_versions);
  const project_version = JSON.stringify(loon_modules.map(i => ({ name: i.name, version: i.version })));
  information.helper.write(output_versions, project_version);

  return {
    output_filepath: output_filepath,
    output_content: output_content,
    output_versions: output_versions,
    project_version: project_version,
    loon_modules: loon_modules.map(i => ({
      name: i.name,
      main: i.main,
      dirname: i.dirname,
      _source: i._raw.dirname,
    })),
  };
})

exports.VERSION = '1.0.0';
exports.OPTIONS = OPTIONS;
