const commands = require('./command');
const version = require('./package.json').version;

exports = module.exports = function (argv) {
    return new Promise((resolve, reject) => {
        console.log('xg-command-loon version', version);
        const command = argv['_'][0];
        if (argv.v || argv.version) {
            return;
        }
        if (argv.h || argv.help) {
            console.log('> xg-command-loon')
            console.log('> xg-command-loon dev')
            return;
        }
        const commander = command ? commands[command] : commands;
        if (typeof commander === 'function') {
            resolve(commander(argv));
        } else {
            reject(new Error('invalid command' + command))
        }
    });
};
