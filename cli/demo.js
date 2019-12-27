const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fsExtra = require('fs-extra');
const axios = require('axios');

const md5 = require('../lib/util/md5');
const uuid = require('../lib/util/uuid');
const Module = require('../lib/Module');
const Service = require('../lib/Service');


exports = module.exports = async function(argv) {
  if (argv.h || argv.help) {
    console.log('Usage: demo [options] <loon-sign>');
    console.log();
    console.log('run loon demo');
    console.log();
    console.log('Options:');
    console.log('  -p, --port       监听端口号');
    console.log('                   [默认值:8080]');
    console.log('  --framework  构建运行框架');
    console.log('                   [可选值: "angular", "hybrid"]');
    console.log('  -h, --help');
    console.log();
    return;
  }

  console.log('=== Loon Project Demo ===');

  const sign = argv['_'][1];
  const oapi = `https://loon.sankuai.com/oapi/release/${sign}`;
  const dirname = path.resolve(os.tmpdir(), `${md5(`${sign}:${uuid()}`)}.loon.package`);
  const dirname_repository = dirname;

  fsExtra.removeSync(dirname_repository);

  console.log(`dirname`, dirname);
  console.log(`Loon`, sign);
  console.log(`Loon OAPI`, oapi);

  const loon_config = await axios.get(oapi).then(response => {
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(response);
    }
  });

  const modules = Object.keys(loon_config.module_dependencies).map(dep_name => new Module(Object.assign({
    name: dep_name,
    dirname: path.join(dirname_repository, dep_name)
  }, loon_config.module_dependencies[dep_name])));

  // 安装模块
  await Promise.all(modules.map(dep => {
    console.log(`installing ${dep.name}@${dep.version} in ${dep.resolved}`);
    return dep.install().then(sha => console.log(`> installed ${sha} in ${dep.dirname}`));
  }));

  const service_config = {
    module_entry: loon_config.module_entry,
    module_dependencies: Object.keys(loon_config.module_dependencies).filter(i => i !== loon_config.module_entry)
  };
  fsExtra.outputFileSync(path.resolve(dirname_repository, 'loon.config'), JSON.stringify(service_config), 'utf8');

  const service = new Service({
    port: argv.port,
    framework: argv.framework,
    dirname: dirname_repository,
    config: service_config,
  });
  service.start();
};
