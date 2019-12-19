#!/usr/bin/env node

const loon = require('../lib/loon');


function main(argv) {
    loon({
        configEnv: argv['config-env'],
        configFile: argv['config-file'],
        configRemote: argv['config-remote'],
        hooksPreinstall: argv['hooks-preinstall'],
        hooksPostinstall: argv['hooks-postinstall'],
    }).then(function (ctx) {
    }).catch(function (error) {
        process.exit(1);
    });
}

(function() {
    const version = require('../package.json').version;
    console.log('xg-command-loon version', version);

    const argv = {};
    process.argv.forEach(function (arg) {
        if (/^--/.test(arg)) {
            arg = arg.replace(/^--/, '');
            const index = arg.indexOf('=');
            if (index > 0) {
                argv[arg.slice(0, index)] = arg.slice(index + 1);
            } else {
                argv[arg] = '';
            }
        }
    });

    main(argv);
}());
