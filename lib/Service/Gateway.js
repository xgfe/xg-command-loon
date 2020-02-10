const micro = require('micro');
const os = require('os');
const fs = require('fs');
const url = require('url');
const http = require('http');
const path = require('path');
const fsExtra = require('fs-extra');
const handler = require('serve-handler');
const parse = require('co-body');
const httpProxy = require('http-proxy');
const httpProxyMiddleware = require('http-proxy-middleware');
const axios = require('axios');
const micromatch = require('micromatch');
const md5 = require('../util/md5');



// 服务分发
function Gateway(option) {
  this.config = option.config;
  this.framework = option.framework;
}

Gateway.prototype.configurate = function(config) {
  this.config = config;
};

Gateway.prototype.handler = async function(request, response) {
  // 先响应 framework 后mock配置
  const frameworkProxy = this.framework.proxy || [];
  for (var i = 0; i < frameworkProxy.length; i++) {
    const frameworkConfig = frameworkProxy[i];
    if (typeof frameworkConfig === 'function') {
      // TODO: 本地未命中framework proxy 规则(server.proxy/server.static)时，会代理到远程server
      try {
        return await frameworkConfig(request, response);
      } catch (e) {
      }
    } else if (frameworkConfig.context.some(r => micromatch.isMatch(request.url, r))) {
      return await this.proxy(request, response, frameworkConfig);
    }
  }

  if (Object.keys(this.framework.interception).some(r => micromatch.isMatch(request.url, r))) {
    throw new Error('framework not found');
  } if (this.config) {
    return await this.mock(request, response);
  } else {
    return await this.transpond(request, response);
  }
};

function readConfig(url) {
  return axios.get(url).then(function (response) {
    if (response.status === 200) {
      try {
        return response.data;
      } catch (e) {}
    }
  }, () => {});
}
Gateway.prototype.mock = async function(request, response) {
  let config = {
    context: '**',
    target: this.config.server
  };
  const rules = this.config.mock;
  if (rules) {
    const mock = Array.isArray(rules) ? rules.some(r => micromatch.isMatch(request.url, r)) : true;
    if (mock) {
      config = Object.assign({}, await readConfig(this.config.remote), this.config.config);
    }
  }
  return await this.proxy(request, response, config);
};

Gateway.prototype.proxy = async function(request, response, config) {
  if (!Array.isArray(config)) {
    if (Object.prototype.hasOwnProperty.call(config, 'target')) {
      config = [config];
    } else {
      config = Object.keys(config).map((context) => {
        let proxyOptions;
        // For backwards compatibility reasons.
        const correctedContext = context
          .replace(/^\*$/, '**')
          .replace(/\/\*$/, '');

        if (typeof config[context] === 'string') {
          proxyOptions = {
            context: correctedContext,
            target: config[context],
          };
        } else {
          proxyOptions = Object.assign({}, config[context]);
          proxyOptions.context = correctedContext;
        }
        return proxyOptions;
      });
    }
  }
  const getProxyMiddleware = (proxyConfig) => {
    const context = proxyConfig.context || proxyConfig.path;
    if (proxyConfig.target) {
      const proxyMiddleware = httpProxyMiddleware(context, Object.assign({}, {
        logLevel: 'silent',
        changeOrigin: true,
      }, proxyConfig));
      return (request, response) => new Promise((resolve, reject) => {
        proxyMiddleware(request, response, () => reject());
      });
    }
  };
  for (var i = 0; i < config.length; i++) {
    try {
      const proxyMiddleware = getProxyMiddleware(config[i]);
      return await proxyMiddleware(request, response);
    } catch (e) {
    }
  }
  throw new Error('mock invalid');
};

// TODO 原有方式，增加埋点逐步替换
let hasWriteTranspond = false;
function readTranspond(dirname) {
  const filename = path.resolve(dirname, 'src', 'transpond-config.js');
  try {
    delete require.cache[filename];
    return require(filename).TranspondRules;
  } catch (e1) {
    try {
      const filename_mock = path.resolve(dirname, '..', '.transpond-config.js');
      if (!hasWriteTranspond) {
        hasWriteTranspond = true;
        const filecontent = fs.readFileSync(filename, 'utf8').replace(/process\.env\.PWD/g, JSON.stringify(dirname));
        fs.writeFileSync(filename_mock, filecontent, 'utf8');
      }
      delete require.cache[filename_mock];
      return require(filename_mock).TranspondRules;
    } catch (e2) {
      return [e1.message, e2.message].join('\n');
    }
  }
}
Gateway.prototype.transpond = function(request, response) {
  try {
    const transpond_rules = readTranspond(this.framework.cache.get('entry'));
    const options = {
      headers: JSON.parse(JSON.stringify(request.headers)),
      host: transpond_rules.targetServer.host,
      path: request.url,
      method: request.method,
      port: transpond_rules.targetServer.port || 80
    };
    // 添加是否hack Header信息开关
    if (transpond_rules.hackHeaders) {
      options.headers.host = options.host + ':' + (transpond_rules.targetServer.port || 80);
      options.headers.referer = 'http://' + options.host;
    }
    //匹配regExpPath做特殊转发
    for (let i in transpond_rules.regExpPath) {
      if (request.url.match(i)) {
        options.host = transpond_rules.regExpPath[i].host || options.host;
        options.port = transpond_rules.regExpPath[i].port || options.port;

        if (transpond_rules.hackHeaders) {
          options.headers.host = options.host + ':' + (transpond_rules.targetServer.port || 80);
          options.headers.referer = 'http://' + options.host;
        }

        options.path = request.url.replace(new RegExp(i), transpond_rules.regExpPath[i].path);
        if (transpond_rules.regExpPath[i].attachHeaders) {
          var j;
          for (j in transpond_rules.regExpPath[i].attachHeaders) {
            options.headers[j] = transpond_rules.regExpPath[i].attachHeaders[j];
          }
        }
        break;
      }
    }

    const serverReq = http.request(options, function(serverRes) {
      response.writeHead(serverRes.statusCode, serverRes.headers);
      serverRes.on('data', chunk => response.write(chunk));
      serverRes.on('end', () => response.end());
    });

    // 超时处理, 10s超时
    serverReq.on('socket', function(socket) {
      socket.setTimeout(10000);
      socket.on('timeout', () => {
        serverReq.abort();
        response.writeHead("504");
        response.write('transpond setTimeout!');
        response.end();
      });
    });
    serverReq.on('error', error => {
      response.writeHead('504');
      response.write(`transpond error ${error.message}`);
      response.end();
    });
    request.addListener('data', chunk => serverReq.write(chunk));
    request.addListener('end', () => serverReq.end());
  } catch (error) {
    return error.message;
  }
};


exports = module.exports = Gateway;
