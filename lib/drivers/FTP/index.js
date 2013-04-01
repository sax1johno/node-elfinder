/**
 * The volume driver for the MySQL data storage backend.
 **/

/**
 * Requires
 **/
var _ = require('underscore');

/** Variables that are global to this module. **/
var opts;

// Default options specific to this driver.
opts = {
    'driver': 'FTP',
    'host': 'localhost',
    'user': 'eluser',
    'pass': 'elpass',
    'port': 21,
    'mode': 'passive',
    'path': '/',
    'timeout': 10,
    'owner': true,
    'tmbPath': '',
    'tmpPath': '',
    'dirMode': '0755',
    'fileMode': '0644'
};

var FTPDriver = function(opt) {
    opts = _.extend(opts, opt);
}

module.exports = FTPDriver;