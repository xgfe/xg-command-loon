const path = require('path');
const chokidar = require('chokidar');
const fsExtra = require('fs-extra');
const Service = require('../lib/Service');


exports = module.exports = function(argv) {
  if (argv.h || argv.help) {
    console.log('Usage: dev [options]');
    console.log();
    console.log('process.cwd development');
    console.log();
    console.log('Options:');
    console.log('  -p, --port   监听端口号');
    console.log('                   [默认值:8080]');
    console.log('  --config     配置文件路径');
    console.log('                   [默认值:loon.config]');
    console.log('  --tmpdir     临时文件夹');
    console.log('                   [默认值:.loon.temporary]');
    console.log('  --framework  构建运行框架');
    console.log('                   [可选值: "angular", "hybrid"]');
    console.log('  -h, --help');
    console.log();
    return;
  }
  console.log('=== Development Mode ===');
  const cwd = process.cwd();
  const configPath = path.resolve(cwd, argv.config || 'loon.config');
  const config = () => fsExtra.readJSONSync(configPath);
  const service = new Service({
    port: argv.p || argv.port,
    dirname: cwd,
    config: config(),
    framework: argv.framework,
    tmpdir: argv.tmpdir ? path.resolve(cwd, argv.tmpdir) : null,
  });
  chokidar.watch(configPath).on('all', () => service.configurate(config()));
  service.start();
};
