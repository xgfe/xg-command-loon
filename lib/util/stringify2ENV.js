exports = module.exports = function(obj) {
  return '"' + JSON.stringify(obj).replace(/"/g, "\\\"") + '"';
};