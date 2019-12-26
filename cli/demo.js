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


// xg loon demo LOON_SIGN --basename=basename --tmpdir=tmpdir --port=8080 --framework=angular
exports = module.exports = async function(argv) {
  console.log('=== Loon Project Demo ===');

  const sign = argv['_'][1];
  const oapi = `https://loon.sankuai.com/oapi/release/${sign}`;
  const dirname = path.resolve(
    argv.tmpdir || os.tmpdir(),
    argv.basename || `${md5(`${sign}:${uuid()}`)}.loon.package`
  );
  const dirname_repository = path.resolve(dirname, 'loon.repository');
  const dirname_service = path.resolve(dirname, 'loon.service');

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
    tmpdir: dirname_service,
    config: service_config,
  });
  service.start();
};
