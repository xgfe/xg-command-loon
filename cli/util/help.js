const fs = require('fs');
const path = require('path');

exports = module.exports = command => {
  const content = fs.readFileSync(path.resolve(__dirname, `../../doc/cli/${command}.txt`), 'utf8');
  console.log(content)
};
