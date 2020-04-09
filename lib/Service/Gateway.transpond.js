const fs = require('fs');
const path = require('path');
const http = require('http');

exports = module.exports = function(request, response, configPath) {
  try {
    const transpond_rules = readTranspond(configPath);
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

// OPTI 原有方式，增加埋点逐步替换
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
