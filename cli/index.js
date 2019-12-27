const version = require('../package.json').version;
const url = require('url');
const axios = require('axios');
const help = require('./util/help');
const main = require('./main');
const commanders = {
  dev: require('./dev'),
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
      console.log(`xg-command-loon@v${version}`)
      return help('main');
    }

    resolve(main(argv));
  });
};


function updater(argv) {
  const API = new url.URL('https://loon.sankuai.com/oapi/cli/xg-command-loon');
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
