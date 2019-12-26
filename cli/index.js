const version = require('../package.json').version;
const axios = require('axios');
const main = require('./main');
const commanders = {
  dev: require('./dev'),
  demo: require('./demo'),
};

exports = module.exports = function (argv) {
  return new Promise(function (resolve, reject) {
    console.log('xg-command-loon version', version);
    const command = argv['_'][0];
    if (argv.v || argv.version) {
      return;
    }
    if (argv.h || argv.help) {
      console.log('> xg-command-loon');
      console.log('> xg-command-loon dev --port=6000 --config=loon.config --tmpdir=tmpdir --framework=angular');
      console.log('> xg-command-loon demo LOON_SIGN --basename=basename --tmpdir=tmpdir --port=8080 --framework=angular');
      return;
    }
    if (command) {
      resolve(updater(argv).then(function() {
        if (typeof commanders[command] === 'function') {
          return commanders[command](argv);
        } else {
          throw new Error('invalid command ' + command);
        }
      }));
    } else {
      resolve(main(argv));
    }
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
