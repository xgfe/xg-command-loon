const micro = require('micro');
const logger = require('./logger');


// 服务分发
function Server(option) {
  this.port = Number(option.port) || 0;
  this.proxy = option.proxy;
}

Server.prototype.start = function() {
  return new Promise((resolve, reject) => {
    if (this.server) {
      resolve(this.port);
    } else {
      this.server = micro((request, response) => this.handler(request, response));
      this.server.on('error', error => reject(error));
      this.server.listen(this.port, () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    }
  })
};

Server.prototype.handler = async function(request, response) {
  logger('http').trace(`[${request.method}] ${request.url}`);
  try {
    return await this.proxy.handler(request, response);
  } catch (e) {
    return `<h1>Error</h1><p>${e.message}</p>`;
  }
};

Server.prototype.close = function(callback) {
  if (this.server) {
    this.server.close(callback);
  } else {
    callback();
  }
};


exports = module.exports = Server;
