exports = module.exports = function throttle(fn, delay) {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), delay || 300);
    }
};
