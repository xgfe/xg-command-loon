const axios = require('axios');
const proxy = require('./proxy');
const micromatch = require('micromatch');
const GatewayTranspond = require('./Gateway.transpond');



// 服务分发
function Gateway(option) {
  this.config = option.config;
  this.framework = option.framework;
}

Gateway.prototype.configurate = function(config) {
  this.config = config;
};

Gateway.prototype.handler = async function(request, response) {
  let proxyConfig = this.framework.server();
  if (this.config) {
    if (Array.isArray(this.config.mock) && this.config.mock.some(r => micromatch.isMatch(request.url, r))) {
      proxyConfig = proxyConfig.concat(this.config.config);
      if (this.config.remote) {
        const removeConfig = await axios.get(this.config.remote).then(r => r.data, e => {});
        proxyConfig = proxyConfig.concat(removeConfig);
      }
    }
    proxyConfig.push({
      context: '**',
      target: this.config.server
    });
  } else {
    proxyConfig.push({
      context: '**',
      target: async (request, response) => {
        const entry = this.framework.entry();
        return entry ? await GatewayTranspond(request, response, entry) : `entry module not exist`;
      }
    });
  }

  return await proxy(request, response, proxyConfig);
};


exports = module.exports = Gateway;
