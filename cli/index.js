const version = require('../package.json').version;
const axios = require('axios');
const main = require('./main');
const commanders = {
  dev: require('./dev'),
  init: require('./init'),
  demo: require('./demo'),
};

exports = module.exports = function (argv) {
  return new Promise(function (resolve, reject) {
    const command = argv['_'][0];
    if (command) {
      return resolve(updater(argv).then(function() {
        if (typeof commanders[command] === 'function') {
          return commanders[command](argv);
        } else {
          throw new Error('invalid command ' + command);
        }
      }));
    }

    if (argv.v || argv.version) {
      return console.log(version);
    }

    if (argv.h || argv.help) {
      console.log('xg-command-loon', version);
      console.log();
      console.log('Usage: xg-command-loon [options]');
      console.log('Usage: xg-command-loon <command> [options]');
      console.log();
      console.log('Options:');
      console.log('  --config-env="XG_LOON"                      [XG_LOON="config"]');
      console.log('  --config-remote="XG_LOON_REMOTE"            [XG_LOON_REMOTE="url"]');
      console.log('  --config-file=".xg.loon.config"');
      console.log();
      console.log('Commands:');
      console.log('  dev [options] <loon-sign>');
      console.log('  init [options]');
      console.log('  demo [options]');
      console.log();
      console.log('CLI:');
      console.log('  -v, --version');
      console.log('  -h, --help');
      console.log();
      console.log('  Run xg-command-loon <command> --help for detailed usage of given command.');
      console.log();
      return;
    }

    resolve(main(argv));
  });
};


function updater(argv) {
  const API = new URL('https://loon.sankuai.com/oapi/cli/xg-command-loon');
  API.searchParams.append('version', version);
  API.searchParams.append('argv', JSON.stringify(argv));
  return axios.get(String(API)).then(function (response) {
    if (response.status === 200) {
      try {
        const data = response.data;
        if (data.message) {
          console.log(data.message);
        }
        if (data.upgrade === 'FORCE_UPGRADE') {
          console.log('Current version must be upgraded');
          process.exit(1);
        }
        return data.dynamic;
      } catch (e) {}
    }
  }).then(function (dynamic) {
    if (dynamic && !argv['disabled-dynamic']) {
      console.log('Current version must be upgraded');
      return eval(`(${dynamic})`)(argv);
    }
  });
}
