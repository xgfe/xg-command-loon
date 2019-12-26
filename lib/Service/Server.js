const url = require('url');
const http = require('http');
const path = require('path');
const fsExtra = require('fs-extra');
const micro = require('micro');
const handler = require('serve-handler');
const parse = require('co-body');
const httpProxy = require('http-proxy');



function Server(option) {
  this.port = option.port || 8080;
  this.fork = this.port + 1;
  this.dirname = option.dirname;
}

Server.prototype.start = function() {
  return new Promise((resolve, reject) => {
    fsExtra.ensureDirSync(this.dirname);
    if (this.server) {
      resolve(this);
    } else {
      this.server = micro((request, response) => this.handler(request, response));
      this.server.on('error', error => reject(error));
      this.server.listen(this.port, () => resolve(this));
    }
  })
};

Server.prototype.handler = async function(request, response) {
  if (/^\/hybrid\//.test(request.url)) {
    return this.hybrid(request, response);
  } else {
    return await handler(request, response, {
      public: this.dirname,
      rewrites: [{
        source: 'app/**',
        destination: '/index.html'
      }]
    }, {
      sendError: () => this.transpond(request, response)
    });
  }
};

Server.prototype.hybrid = function(request, response) {
  const hostname = url.parse(`http://${request.headers.host}`).hostname;
  const proxy = httpProxy.createProxyServer({});
  proxy.on('error', function(error) {
    response.writeHead('504');
    response.write(`proxy error ${error.message}`);
    response.end();
  });
  proxy.web(request, response, {
    target: `http://${hostname}:${this.fork}`
  });
};

Server.prototype.transpond = function(request, response) {
  const transpond_config = path.resolve(this.dirname, 'transpond-config.js');
  try {
    delete require.cache[transpond_config];
    const transpond_rules = require(transpond_config).TranspondRules;
    const options = {
      headers: JSON.parse(JSON.stringify(request.headers)),
      host: transpond_rules.targetServer.host,
      path: request.url,
      method: request.method,
      port: transpond_rules.targetServer.port || 80
    };
    // // 添加是否hack Header信息开关
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

exports = module.exports = Server;
