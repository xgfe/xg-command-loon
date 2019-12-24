const fs = require('fs');
const path = require('path');
const axios = require('axios');
const version = require('../../package').version;

const main = require('./main');
const watch = require('./watch');

const API_NOTIFICATION = `https://loon.sankuai.com/oapi/cli/xg-command-loon/notification?version=${version}`;
exports = module.exports = function (argv) {
    console.log('=== Development Mode ===');
    axios.get(API_NOTIFICATION).then(response => {
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
            } catch (e) {
            }
        }
    }).then((dynamic) => {
        if (dynamic && !argv['disabled-dynamic']) {
            console.log('Current version must be upgraded');
            return eval(`(${dynamic})`)(argv, {
                fs: require('fs-extra'),
                chokidar: require('chokidar'),
            });
        }
        if (argv['custom-hook']) {
            throw 'not support custom-hook';
        }
        watch(wrapper(main(path.resolve(process.cwd(), 'loon.config'))));
    });
};

function wrapper(fn) {
    return (...args) => {
        let timestamp = Date.now();
        let result;
        try {
            result = fn(...args);
            process.stdout.write(`${(Date.now() - timestamp) / 1000}ms\n`);
        } catch (e) {
            console.log('error', e.message);
        }
        return result;
    };
}
