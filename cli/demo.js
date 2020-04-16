const os = require('os');
const path = require('path');
const help = require('./util/help');
const init = require('./util/init');
const md5 = require('../lib/util/md5');
const Service = require('../lib/Service');


exports = module.exports = async function(argv) {
  if (argv.h || argv.help) {
    return help('demo');
  }

  console.log('=== Loon Project Demo ===');
  const loon_sign = argv['_'][1];
  const loon_dirname = path.resolve(os.tmpdir(), `${md5(loon_sign)}.loon.package`);
  const loon_config = await init(loon_sign, loon_dirname);
  const service = new Service({
    port: argv.p || argv.port,
    framework: argv.framework,
    dirname: loon_dirname,
    config: loon_config,
  });
  service.start();
};
