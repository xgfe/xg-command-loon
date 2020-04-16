const path = require('path');
const fsExtra = require('fs-extra');
const chokidar = require('chokidar');
const help = require('./util/help');
const init = require('./util/init');
const Service = require('../lib/Service');


const commanders = {};
commanders['init'] = async argv => {
  console.log('=== Development Init ===');
  const loon_sign = argv['_'][2];
  const loon_config = await init(loon_sign);
};

commanders['add-module'] = async argv => {
  console.log('=== Development Add Module ===');
  const ssh_repository = argv['_'][2];
  await init.addModule(ssh_repository);
};

commanders['install-tools'] = async argv => {
  await init.installTools();
};

exports = module.exports = function(argv) {
  if (argv.h || argv.help) {
    return help('dev');
  }
  const command = argv['_'][1];
  if (command) {
    return commanders[command](argv);
  }

  const loon_dirname = process.cwd();
  const loon_config_path = path.resolve(loon_dirname, argv.config || 'loon.config');
  const config = () => fsExtra.readJSONSync(loon_config_path);
  const service = new Service({
    port: argv.p || argv.port,
    dirname: loon_dirname,
    config: config(),
    framework: argv.framework,
    frameworkProcedure: (argv['framework-procedure']
      ? String(argv['framework-procedure']).split(',')
      : []
    ),
    tmpdir: argv.tmpdir ? path.resolve(loon_dirname, argv.tmpdir) : null,
  });
  chokidar.watch(loon_config_path).on('all', () => service.configurate(config()));
  service.start();
};
