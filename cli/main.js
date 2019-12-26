const fs = require('fs');
const path = require('path');
const axios = require('axios');
const loon = require('../lib');


// XG_LOON="config" xg loon --config-env="XG_LOON"
function getEnvConfig(env_name) {
  env_name = typeof env_name === 'string' ? env_name : 'XG_LOON';
  const config_value = (process.env[env_name] || '').trim();
  if (config_value) {
    return {
      type: 'ENV=' + env_name,
      value: config_value,
    };
  }
}

// XG_LOON_REMOTE="url" xg loon --config-remote="XG_LOON_REMOTE"
function getRemoteConfig(env_name) {
  env_name = typeof env_name === 'string' ? env_name : 'XG_LOON_REMOTE';
  const config_uri = (process.env[env_name] || '').trim();
  if (config_uri) {
    return axios.get(config_uri).then(function(response) {
      if (response.status === 200) {
        return JSON.stringify(response.data)
      }
    }, function() {
    }).then(function(config_value) {
      return {
        type: 'REMOTE=' + env_name + '[' + config_uri + ']',
        value: config_value,
      };
    });
  }
}

// xg loon --config-file="filepath"
function getFileConfig(env_path) {
  env_path = typeof env_path === 'string' ? env_path : '.xg.loon.config';
  const config_path = path.resolve(process.cwd(), env_path);
  try {
    return {
      type: 'FILE=' + config_uri,
      value: fs.readFileSync(config_path, 'utf8'),
    };
  } catch (e) {
  }
}

exports = module.exports = function (argv) {
  return new Promise(function(resolve) {
    resolve();
  }).then(cfg => {
    return cfg || getEnvConfig(argv['config-env']);
  }).then(cfg => {
    return cfg || getRemoteConfig(argv['config-remote']);
  }).then(cfg => {
    return cfg || getFileConfig(argv['config-file']);
  }).then(cfg => {
    return {
      type: cfg.type,
      value: JSON.parse(cfg.value)
    };
  }).then(config => {
    config.raw = JSON.parse(JSON.stringify(config.value));
    try {
      for (let i in config.raw.module_dependencies) {
        delete config.raw.module_dependencies[i].key;
      }
    } catch (e) {
    }
    return config;
  }).then(config => {
    return loon({
      dirname: process.cwd(),
      project: {
        module_entry: config.value.module_entry,
        module_dependencies: config.value.module_dependencies,
      },
      _config: {
        argv: argv,
        type: config.type,
        value: config.raw,
      },
    });
  }, function() {
    throw new Error('The package dependencies config of Loon does not exist or is illegal');
  });
};
