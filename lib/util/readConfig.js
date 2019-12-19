const fs = require('fs');
const path = require('path');


exports = module.exports = function(subPath) {
  const configPath = path.resolve(process.cwd(), subPath);

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath));
    } catch (e) {
      return null;
    }
  }
};
