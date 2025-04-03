const styleText = require('node:util').styleText;

const info = (...args) => {
    console.log(styleText('cyan', '[INFO]'), ...args);
};

const error = (...args) => {
    console.error(styleText('red', '[ERROR]'), ...args);
}

const warn = (...args) => {
    console.warn(styleText('yellow', '[WARN]'), ...args);
};

const system = (...args) => {
    console.log(styleText('magenta', '[SYSTEM]'), ...args);
}

module.exports = {
    info,
    error,
    warn,
    system
};