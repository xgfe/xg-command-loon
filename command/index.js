const loon = require('../lib/loon');


exports = module.exports = function (argv) {
    return loon({
        configEnv: argv['config-env'],
        configFile: argv['config-file'],
        configRemote: argv['config-remote'],
        customHook: argv['custom-hook'],
    });
};
exports.dev = require('./dev');
