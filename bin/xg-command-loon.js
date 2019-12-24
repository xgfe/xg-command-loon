#!/usr/bin/env node

const cli = require('../cli');


(function() {
    cli(argv()).catch(function(error) {
        console.error(error);
        process.exit(1);
    });
    function argv() {
        const list = process.argv;
        const argv = { _: [] };
        let key;
        for (let i = 2; i < list.length; i++) {
            let item = list[i];
            if (/^-[^-=]/.test(item)) {
                item = item.replace(/^-+/, '');
                const index = item.indexOf('=');
                let itemKey = item;
                let itemValue = true;
                if (index > 0) {
                    let itemKey = item.slice(0, index);
                    let itemValue = item.slice(index + 1);
                    argv[itemKey] = itemValue;
                    key = undefined;
                } else if (/^[a-zA-Z][0-9]$/.test(itemKey)) {
                    argv[itemKey[0]] = itemKey[1];
                    key = undefined;
                } else {
                    itemKey.split('').forEach(subKey => {
                        argv[subKey] = true;
                        key = subKey;
                    });
                }
            } else if (/^--[^-=]/.test(item)) {
                item = item.replace(/^-+/, '');
                const index = item.indexOf('=');
                if (index > 0) {
                    argv[item.slice(0, index)] = item.slice(index + 1);
                    key = undefined;
                } else {
                    argv[item] = true;
                    key = item;
                }
            } else {
                if (key) {
                    argv[key] = item;
                    key = undefined;
                } else {
                    argv['_'].push(item);
                }
            }
        }
        return argv;
    }
}());
