const crypto = require('crypto');


exports = module.exports = (str) => {
  return crypto.createHash('md5').update(String(str)).digest('hex');
};
