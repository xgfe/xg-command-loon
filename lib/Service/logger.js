const getLogger = type => {
  type = type  || 'system';
  const log = {
    type: type,
    get: getLogger,
  };
  ['log', 'trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
    log[level] = (...args) => console.log(type, ...args);
  });
  return log;
}

exports = module.exports = type => {
  if (process.env.LOG_VERBOSITY === 'dashboard') {
    return require('./dashboard')(type);
  } else {
    return getLogger(type);
  }
};

