const getLogger = type => {
  type = type  || 'system';
  const log = {
    type: type,
    get: getLogger,
  };
  ['log', 'trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
    log[level] = (...args) => console.log(type, ...(args).map(i => String(i)));
  });
  return log;
};

const getDebuger = type => {
  type = type  || 'system';
  const log = {
    type: type,
    get: getDebuger,
  };
  ['log', 'trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
    log[level] = () => {};
  });
  return log;
};

exports = module.exports = type => {
  if (process.env.LOG_VERBOSITY === 'dashboard') {
    return require('./dashboard')(type);
  } else if (process.env.LOG_VERBOSITY === 'debug') {
    return getDebuger(type);
  } else {
    return getLogger(type);
  }
};

