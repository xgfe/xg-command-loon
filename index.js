const cli = require('./cli');


exports.name = 'loon';
exports.desc = 'xg loon pulgin';
exports.run = function(argv) {
  argv = JSON.parse(JSON.stringify(argv));
  argv['_'] = argv['_'].slice(1);
  cli(argv).catch(function(error) {
    fis.log.on.error(error.message);
    fis.log.debug(error.stack);
    process.exit(1);
  });
};
