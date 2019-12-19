const fs = require('fs');
const path = require('path');
const axios = require('axios');


function request(url) {
    return /^\//.test(url) ? new Promise(function (resolve, reject) {
        try {
            const file = fs.readFileSync(url);
            resolve(file);
        } catch (error) {
            reject(error)
        }
    }) : axios.get(url).then(function (response) {
        if (response.status !== 200) {
            throw new Error('[failed] response status' + response.status);
        }
        return response.data;
    });
}

// XG_LOON="config" xg loon --config-env="XG_LOON"
function getEnvConfig(argv) {
    return new Promise(function (resolve, reject) {
        const ENV_NAME = typeof argv.configEnv === 'string' ? argv.configEnv : 'XG_LOON';
        const envConfig = (process.env[ENV_NAME] || '').trim();
        if (!envConfig) {
            return resolve(null);
        }
        const config = JSON.parse(envConfig);
        if (!config) {
            throw new Error('config-env error');
        }
        resolve({
            type: `env:${ENV_NAME}`,
            raw: envConfig,
            value: config,
        });
    });
}

// xg loon --config-file="filepath"
function getFileConfig(argv) {
    return new Promise(function (resolve, reject) {
        const CONFIG_PATH = typeof argv.configFile === 'string' ? argv.configFile : '.xg.loon.config';
        const fileConfig = path.resolve(process.cwd(), CONFIG_PATH);
        if (!fs.existsSync(fileConfig)) {
            return resolve(null);
        }
        const file = fs.readFileSync(fileConfig, 'utf8');
        resolve({
            type: `file:${fileConfig}`,
            raw: file,
            value: JSON.parse(file),
        });
    });
}

// XG_LOON_REMOTE="url" xg loon --config-remote="XG_LOON_REMOTE"
function getRemoteConfig(argv) {
    return new Promise(function (resolve, reject) {
        const ENV_NAME = typeof argv.configRemote === 'string' ? argv.configRemote : 'XG_LOON_REMOTE';
        const remoteConfig = (process.env[ENV_NAME] || '').trim();
        if (!remoteConfig) {
            return resolve(null);
        }
        resolve(request(remoteConfig).then(data => {
            return {
                type: `remote:${ENV_NAME}`,
                raw: remoteConfig,
                value: data,
            };
        }));
    });
}

exports = module.exports = function(argv) {
    return getEnvConfig(argv).then(function(config) {
        return config || getRemoteConfig(argv).then(function(config) {
            return config || getFileConfig(argv);
        });
    }).then(function(config) {
        if (!config) {
            throw new Error('config not exist');
        }
        return {
            cwd: process.cwd(),
            type: config.type,
            raw: config.raw,
            package: config.value,
        };
    });
};
