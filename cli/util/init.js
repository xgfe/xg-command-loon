const os = require('os');
const fs = require('fs');
const path = require('path');
const which = require('which');
const axios = require('axios');
const fsExtra = require('fs-extra');
const chokidar = require('chokidar');
const serialPromise = require('../../lib/util/serialPromise');
const Module = require('../../lib/Module');
const npm = require('../../lib/install/npm');


exports = module.exports = async (loon_sign, loon_dirname) => {
  loon_dirname = loon_dirname || process.cwd();
  if (!loon_sign) {
    throw new Error('loon.sign or ssh.repository must be specified');
  }

  const local_loon_config_path = path.resolve(loon_dirname, 'loon.config');
  if (fsExtra.existsSync(local_loon_config_path)) {
    throw new Error('loon.config already exists');
  }

  const loon_config = await loadConfig(loon_sign);
  const loon_modules = Object.keys(loon_config.module_dependencies).map(module_name => loadModule(
    module_name,
    loon_config.module_dependencies[module_name],
    loon_dirname,
  ));

  // 安装模块
  await serialPromise(loon_modules.map(i => i.installer));

  // 生成本地config文件
  writeLocalConfig(local_loon_config_path, {
    module_entry: loon_modules.find(i => i.instance.name === loon_config.module_entry).local,
    module_dependencies: loon_modules.filter(i => i.instance.name !== loon_config.module_entry).map(i => i.local),
    proxy: {
      server: 'http://domain.example/',
      config: {},
      mock: ['/mock/path']
    },
    __loon_sign: loon_sign,
  });
};

exports.addModule = async (ssh_repository) => {
  if (!ssh_repository) {
    throw new Error('ssh.repository must be specified');
  }

  const local_loon_config_path = path.resolve(process.cwd(), 'loon.config');
  if (!fsExtra.existsSync(local_loon_config_path)) {
    throw new Error('loon.config not exist');
  }

  const module_name = ssh_repository.match(/\/([^/]+)\.git$/)[1];
  const loon_dirname = process.cwd();
  const loon_module = loadModule(module_name, {
    name: module_name,
    dirname: path.join(loon_dirname, module_name),
    version: 'origin/HEAD',
    resolved: ssh_repository
  }, loon_dirname);

  if (fsExtra.existsSync(loon_module.dirname)) {
    throw new Error(`module ${module_name} already exists in ${loon_module.dirname}`);
  }

  await loon_module.installer();

  // 更新本地config文件
  const local_loon_config = fsExtra.readJSONSync(local_loon_config_path);
  local_loon_config.module_dependencies.push(loon_module.local);
  writeLocalConfig(local_loon_config_path, local_loon_config);
};

exports.installTools = async () => {
  const xg = which.sync('xg');
  if (xg) {
    console.log(`xg already exist in ${xg}`);
  } else {
    await npm.install(['xg', '-g']).then(result => console.log(result), error => console.log(error));
  }
};

function writeLocalConfig(file_path, file_data) {
  const file_content = JSON.stringify(file_data, null, 4);
  fsExtra.outputFileSync(file_path, file_content, 'utf8');
  console.log(`write local loon config in ${file_path}`);
  console.log(file_content);
}

function loadModule(name, config, dirname) {
  const module_dirname = path.join(dirname, name);
  const module_option = Object.assign({
    name: name,
    dirname: module_dirname,
  }, config);
  const module_instance = new Module(module_option);
  const module_installer = () => {
    console.log(`installing ${module_instance.name}@${module_instance.version} from ${module_instance.resolved}`);
    return module_instance.install().then(sha => {
      console.log(`         > ${module_instance.dirname}`);
    });
  };

  const local_name = module_instance.name;
  const local_dirname = path.relative(dirname, module_instance.dirname);
  return {
    option: module_option,
    instance: module_instance,
    installer: module_installer,
    dirname: module_dirname,
    local: local_name === local_dirname ? local_name : {
      name: local_name,
      dirname: local_dirname,
    },
  };
}

async function loadConfig(config) {
  if (typeof config === 'object') {
    return config;
  } else if (/^ssh:\/\//.test(config)) {
    const result = {
      module_entry: config.match(/\/([^/]+)\.git$/)[1],
      module_dependencies: {},
    };
    result.module_dependencies[result.module_entry] = {
      version: 'origin/HEAD',
      resolved: config
    };
    return result;
  } else {
    const oapi = /^https?:\/\//.test(config) ? config : `https://loon.sankuai.com/oapi/release/${config}`;
    return await axios.get(oapi).then(response => {
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(response);
      }
    });
  }
}
