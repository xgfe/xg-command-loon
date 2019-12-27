const os = require('os');
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const which = require('which');
const chokidar = require('chokidar');
const Service = require('../lib/Service');
const Module = require('../lib/Module');
const npm = require('../lib/install/npm');

const install = require('./util/install');
const config = require('./util/config');
const help = require('./util/help');


const commanders = {};

commanders['init'] = async argv => {
  console.log('=== Development Init ===');

  const install_dirname = process.cwd();
  const loon_config_path = path.resolve(install_dirname, 'loon.config');
  if (fsExtra.existsSync(loon_config_path)) {
    throw new Error('loon.config already exists');
  }

  const sign = argv['_'][2];
  if (!sign) {
    throw new Error('loon.sign or ssh.repository must be specified');
  }

  const loon_response = await install(sign, install_dirname);
  const loon_config = config(loon_response);
  fsExtra.outputFileSync(loon_config_path, JSON.stringify(loon_config), 'utf8');
};

commanders['add-module'] = async argv => {
  console.log('=== Development Add Module ===');

  const install_dirname = process.cwd();
  const loon_config_path = path.resolve(install_dirname, 'loon.config');
  if (!fsExtra.existsSync(loon_config_path)) {
    throw new Error('loon.config not exist');
  }

  const ssh_repository = argv['_'][2];
  if (!ssh_repository) {
    throw new Error('ssh.repository must be specified');
  }

  const module_name = ssh_repository.match(/\/([^/]+)\.git$/)[1];
  const loon_config = fsExtra.readJSONSync(loon_config_path);
  if (loon_config.module_entry === module_name) {
    throw new Error(`duplicate name with module_entry[${module_name}] is not allowed`);
  }
  if (loon_config.module_dependencies.indexOf(module_name) > -1) {
    throw new Error(`module ${module_name} already exists`);
  }
  loon_config.module_dependencies = Array.from(new Set(loon_config.module_dependencies.concat(module_name)));

  const module_item = new Module({
    name: module_name,
    dirname: path.join(install_dirname, module_name),
    version: 'origin/HEAD',
    resolved: ssh_repository
  });

  console.log(`installing ${module_item.name}@${module_item.version} from ${module_item.resolved}`);
  await module_item.install().then(sha => {
    console.log(`         > ${module_item.dirname}`);
  });

  fsExtra.outputFileSync(loon_config_path, JSON.stringify(loon_config), 'utf8');
};

commanders['install-tools'] = async argv => {
  const xg = which.sync('xg');
  if (xg) {
    console.log(`xg already exist in ${xg}`);
  } else {
    await npm.install(['xg', '-g']).then(result => console.log(result), error => console.log(error));
  }
};

exports = module.exports = function(argv) {
  if (argv.h || argv.help) {
    return help('dev');
  }
  const command = argv['_'][1];
  if (command) {
    return commanders[command](argv);
  }

  console.log('=== Development Mode ===');
  const cwd = process.cwd();
  const loon_config_path = path.resolve(cwd, argv.config || 'loon.config');
  const config = () => fsExtra.readJSONSync(loon_config_path);
  const service = new Service({
    port: argv.p || argv.port,
    dirname: cwd,
    config: config(),
    framework: argv.framework,
    tmpdir: argv.tmpdir ? path.resolve(cwd, argv.tmpdir) : null,
  });
  chokidar.watch(loon_config_path).on('all', () => service.configurate(config()));
  service.start();
};
