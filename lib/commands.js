/**
 * Contains all of the valid commands available.  If a driver doesn't implement a command,
 * the connector will check the command against this list. If the command exists, the response
 * will contain an error saying the command is not supported for that connector.  If the command
 * is not in this list, the error will be for an invalid command.
 **/
var _ = require('underscore');

var commands = {
    open: {
        target: false,
        tree: false,
        init: false,
        mimes: false
    },
    ls: {
        target: true,
        mimes: false
    },
    tree: {
        target: true
    },
    parents: {
        target: true
    },
    tmb: {
        targets: true
    },
    file: {
        targets: true,
        download: false
    },
    size: {
        targets: true
    },
    mkdir: {
        target: true,
        name: true
    },
    mkfile: {
        target: true,
        name: true,
        mimes: false
    }, 
    rm: {
        targets: true  
    },
    rename: {
        target: true,
        name: true,
        mimes: false
    },
    duplicate: {
        targets: true,
        suffix: false
    },
    paste: {
        dst: true,
        targets: true,
        cut: false,
        mimes: false
    },
    upload: {
        target: true,
        FILES: true,
        mimes: false,
        html: false
    },
    'get': {
        target: true
    },
    'put': {
        target: true,
        content: '',
        mimes: false
    },
    archive: {
        targets: true,
        type: true,
        mimes: false
    },
    extract: {
        target: true,
        mimes: false
    },
    search: {
        q: true,
        mimes: false
    },
    info: {
        targets: true
    },
    dim: {
        target: true
    },
    resize: {
        target: true,
        width: true,
        height: true,
        mode: false,
        x: false,
        y: false,
        degree: false
    },
    netmount: {
        protocol: true,
        host: true,
        path: false,
        port: false,
        user: true,
        pass: true,
        alias: false,
        options: false
    }
};

exports.isValid = function(command) {
    return _.has(commands, command);
};

exports.commandArgsList = function(command) {
    if (_.has(commands, command)) {
        return commands[command];
    } else {
        return null;
    }
};
