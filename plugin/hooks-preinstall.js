const version = '1.0.0'
exports = module.exports = (information, helper) => {
    const logger = helper.logger;
    logger.print(`hooks-preinstall@v${version}`);
};
