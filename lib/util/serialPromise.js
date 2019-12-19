"use strict";

exports = module.exports = function (q) {
    return new Promise(function(resolve, reject) {
        const queueResult = [];
        const queue = [].concat(q || []);
        serial();

        function serial(priorResult) {
            const promise = queue.shift();
            if (typeof promise === 'function') {
                promise(priorResult).then(function(result) {
                    queueResult.push(result);
                    serial(result);
                }, function(error) {
                    reject(error);
                });
            } else {
                resolve(queueResult);
            }
        }
    });
};
