const padStart = (str, len) => ' '.repeat(Math.max(len - str.length, 0)) + str;
const padEnd = (str, len) => str + ' '.repeat(Math.max(len - str.length, 0));

const log = (type, ...args) => console.log(`${type}${args.length > 0 && args[0] ? ':' : ''}`, ...args);
const logger = sign => {
    sign = sign || '';
    const type = `[Loon${sign ? `:${sign}` : ''}]`;
    const fn = (name, ...args) => log(`${type} ${padEnd(name, 16 - sign.length)}`, ...args);
    fn.line = (str, count) => console.log((str || '-').repeat(count || 66));
    fn.info = (name, ...args) => {
        if (typeof name === 'string') {
            log(`${' '.repeat(type.length)} ${padStart(name, 16 - sign.length)}`, ...args)
        } else {
            console.log((name ? '>' : '<').repeat(type.length), ...args);
        }
    };
    return fn;
};

exports = module.exports = logger;
exports.log = logger();
exports.print = (...args) => console.log(...args);
exports.error = (type, error) => logger('error')(type, (
    typeof error === 'string'
        ? error
        : (error ? error.message : '')
    )
);
exports.progress = () => {
    process.stdout.write('.');
};
