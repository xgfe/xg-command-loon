const loon = require('../lib/loon');


exports = module.exports = function main(argv, cli, env) {
    loon({
        configEnv: argv['config-env'],
        configFile: argv['config-file'],
        configRemote: argv['config-remote'],
        hooksPreinstall: argv['hooks-preinstall'],
        hooksPostinstall: argv['hooks-postinstall'],
    }).then(function (ctx) {
        fis.log.info('loon success');
    }).catch(function (error) {
        fis.log.on.error(error.message);
        fis.log.debug(error.stack);
        process.exit(1);
    });
};
