const url = require('url');
const micromatch = require('micromatch');
const httpProxyMiddleware = require('http-proxy-middleware');


function getProxyOptions(configs) {
  let options = [];
  configs.forEach(config => {
    if (Object.prototype.hasOwnProperty.call(config, 'target')) {
      options.push(config);
    } else {
      options = options.concat(Object.keys(config).map((context) => {
        return Object.assign({}, typeof config[context] === 'string' ? {
          target: config[context],
        } : config[context], {
          context: context.replace(/^\*$/, '**').replace(/\/\*$/, '')
        });
      }));
    }
  });
  return options;
}

const cacheProxyer = {};
function getProxyer(config) {
  const configKey = JSON.stringify(config, (key, value) => typeof value === 'function' ? value.toString() : value)
  if (cacheProxyer[configKey]) {
    return cacheProxyer[configKey];
  }

  const getProxyMiddleware = (proxyConfig) => {
    const context = proxyConfig.context || proxyConfig.path;
    if (proxyConfig.target) {
      if (typeof proxyConfig.target === 'function') {
        return async (request, response) => {
          const pathname = url.parse(request.originalUrl || request.url).pathname;
          const match = typeof context === 'function' ? context(pathname, request) : micromatch.isMatch(pathname, context);
          if (match) {
            return await proxyConfig.target(request, response);
          } else {
            return false;
          }
        };
      } else {
        const proxyMiddleware = httpProxyMiddleware(context, Object.assign({}, {
          logLevel: 'silent',
          changeOrigin: true,
        }, proxyConfig));
        return (request, response) => new Promise((resolve, reject) => {
          proxyMiddleware(request, response, () => resolve(false)).then(() => resolve(), err => reject(err));
        });
      }
    }
  };

  const proxyOptions = getProxyOptions(config);
  const proxyMiddlewares = [];
  for (var i = 0; i < proxyOptions.length; i++) {
    try {
      const proxyMiddleware = getProxyMiddleware(proxyOptions[i]);
      proxyMiddlewares.push(proxyMiddleware);
    } catch (e) {
      proxyMiddlewares.push(e);
    }
  }

  return cacheProxyer[configKey] = proxyMiddlewares;
}

exports = module.exports = async function(request, response, config) {
  const middlewares = getProxyer(config);
  for (var i = 0; i < middlewares.length; i++) {
    try {
      const proxyMiddleware = middlewares[i];
      if (proxyMiddleware instanceof Error) {
        throw proxyMiddleware;
      }

      if (proxyMiddleware) {
        const proxyResult = await proxyMiddleware(request, response);
        if (proxyResult !== false) {
          return proxyResult;
        }
      }
    } catch (e) {
      throw new Error(`proxy error`);
    }
  }

  return `Request ${request.url} Not Found`;
};
