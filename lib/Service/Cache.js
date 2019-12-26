function Cache() {
  this.data = [];
}

Cache.prototype.id = function(key) {
  return typeof key === 'string' ? key : JSON.stringify(key);
};

// Map
Cache.prototype.set = function(key, value) {
  const id = this.id(key);
  const datum = this.data.find(i => i.id === id);
  if (datum) {
    if (datum.value === value) {
      return null;
    } else {
      const oldValue = datum.value;
      datum.value = value;
      return {
        id: datum.id,
        key: datum.key,
        value: oldValue
      };
    }
  } else {
    this.data.push({
      id: id,
      key: key,
      value: value,
    });
    return null;
  }
};
Cache.prototype.delete = function(key) {
  const id = this.id(key);
  const datum = this.data.find(i => i.id === id);
  this.data = this.data.filter(i => i.id !== id);
  return datum;
};

// Set
Cache.prototype.add = function(key) {
  return (...vals) => {
    const values = (this.get(key) || []).concat(vals);
    return this.set(key, values.filter((item, index, list) => list.indexOf(item) === index));
  };
};
Cache.prototype.remove = function(key, ...vals) {
  this.set(key, (this.get(key) || []).filter(v => vals.indexOf(v) < 0));
};

Cache.prototype.sign = function(key) {
  return !this.set(key, Symbol());
};

Cache.prototype.update = function(key, value) {
  if (this.has(key)) {
    return !!this.set(key, value);
  } else {
    this.set(key, value);
    return true;
  }
};


Cache.prototype.get = function(key) {
  const id = this.id(key);
  const datum = this.data.find(i => i.id === id);
  return datum ? datum.value : null;
};

Cache.prototype.has = function(key) {
  const id = this.id(key);
  return !!this.data.find(i => i.id === id);
};

Cache.prototype.clear = function() {
  this.data = [];
};


exports = module.exports = Cache;
