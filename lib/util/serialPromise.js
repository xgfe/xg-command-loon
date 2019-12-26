"use strict";


exports = module.exports = function(q) {
  const queue = [].concat(q || []);
  const queueResult = [];

  function serial(prior) {
    if (queue.length === 0) {
      return Promise.resolve(queueResult);
    } else {
      const item = queue.shift();
      const promise = typeof item === 'function' ? item(prior) : item;
      return Promise.resolve(promise).then(function(result) {
        queueResult.push(result);
        return serial(result);
      });
    }
  }
  return serial();
};
