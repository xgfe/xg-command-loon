const os = require('os');
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');

const md5 = require('../lib/util/md5');
const Service = require('../lib/Service');

const install = require('./util/install');
const config = require('./util/config');
const help = require('./util/help');


exports = module.exports = async function(argv) {
  if (argv.h || argv.help) {
    return help('demo');
  }

  console.log('=== Loon Project Demo ===');
  const loon_sign = argv['_'][1];
  const install_dirname = path.resolve(os.tmpdir(), `${md5(loon_sign)}.loon.package`);
  const loon_response = await install(loon_sign, install_dirname);
  const loon_config = config(loon_response);
  const loon_config_path = path.resolve(install_dirname, 'loon.config');
  fsExtra.outputFileSync(loon_config_path, JSON.stringify(loon_config), 'utf8');

  const service = new Service({
    port: argv.p || argv.port,
    framework: argv.framework,
    dirname: install_dirname,
    config: loon_config,
  });
  service.start();
};
