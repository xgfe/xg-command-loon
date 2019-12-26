const path = require('path');
const chokidar = require('chokidar');
const fsExtra = require('fs-extra');
const Service = require('../lib/Service');


// xg loon dev --port=8080 --config=loon.config --tmpdir=tmpdir --framework=angular
exports = module.exports = function(argv) {
  console.log('=== Development Mode ===');
  const cwd = process.cwd();
  const configPath = path.resolve(cwd, argv.config || 'loon.config');
  const config = () => fsExtra.readJSONSync(configPath);
  const service = new Service({
    port: argv.port,
    dirname: cwd,
    config: config(),
    framework: argv.framework,
    tmpdir: argv.tmpdir ? path.resolve(cwd, argv.tmpdir) : null,
  });
  chokidar.watch(configPath).on('all', () => service.configurate(config()));
  service.start();
};
