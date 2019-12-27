const path = require('path');
const fsExtra = require('fs-extra');
const axios = require('axios');
const serialPromise = require('../../lib/util/serialPromise');
const Module = require('../../lib/Module');


const loonConfig = async config => {
  if (typeof config === 'object') {
    return config;
  } else if (/^ssh:\/\//.test(config)) {
    const result = {
      module_entry: config.match(/\/([^/]+)\.git$/)[1],
      module_dependencies: {},
    };
    result.module_dependencies[result.module_entry] = {
      version: 'origin/HEAD',
      resolved: config
    };
    return result;
  } else {
    const oapi = `https://loon.sankuai.com/oapi/release/${config}`;
    return await axios.get(oapi).then(response => {
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(response);
      }
    });
  }
}

exports = module.exports = async function(config, dirname) {
  config = await loonConfig(config);
  const modules = Object.keys(config.module_dependencies).map(name => {
    return new Module(Object.assign({
      name: name,
      dirname: path.join(dirname, name)
    }, config.module_dependencies[name]));
  });
  await serialPromise(modules.map(i => {
    return () => {
      console.log(`installing ${i.name}@${i.version} from ${i.resolved}`);
      return i.install().then(sha => {
        console.log(`         > ${i.dirname}`);
      });
    };
  }));
  return config;
};
