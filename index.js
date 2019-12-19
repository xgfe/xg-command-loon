const version = require('./package.json').version;

const run = require('./cli/fis');


exports.name = 'loon';
exports.desc = 'xg loon pulgin';
exports.options = {
  '-v, --version': 'version',
  '-h, --help': 'print this help message'
};

exports.run = function(argv, cli, env) {
  // 显示帮助信息
  if (argv.h || argv.help) {
    return cli.help(exports.name, exports.options);
  }

  if (argv.v || argv.version) {
    console.log(`xg-command-loon version ${version}`);
    return;
  }

  fis.log.info(`xg-command-loon@v${version}`);

  const command = argv['_'][1];
  if (command) {
    // init, env, test
    return typeof run[command] === 'function'
      ? run[command](argv, cli, env)
      : fis.log.error('invalid command');
  }

  return run(argv, cli, env);
};
