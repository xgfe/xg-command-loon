const path = require('path');


exports = module.exports = function(argv) {
  if (argv.h || argv.help) {
    console.log('Usage: init [options]');
    console.log();
    console.log('初始化');
    console.log();
    console.log('Options:');
    console.log('  -h, --help');
    console.log();
    return;
  }
  console.log(argv)
};
