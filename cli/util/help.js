const fs = require('fs');
const path = require('path');

exports = module.exports = (command, arg) => {
  let content = fs.readFileSync(path.resolve(__dirname, `../../doc/cli/${command}.txt`), 'utf8');
  try {
    content += fs.readFileSync(path.resolve(__dirname, `../../doc/cli/${command}-${arg}.txt`), 'utf8');
  } catch (e) {
  }
  console.log(content)
};
