/**
 * The volume driver for the MongoDB data storage backend.
 **/
 
/**
* Requires.
**/
var _ = require('underscore');

/** Variables that are global to this module. **/
var opts;

// Default options specific to this driver.
opts = {
    'driver': 'mongodb',
    'host': 'localhost',
    'user': 'eluser',
    'pass': 'elpass',
    'db': 'elfinder',
    'path': 1,
    'tmpPath': '/tmp'
};

var MongoDBDriver = function(opt) {
    opts = _.extends(opts, opt);
}

module.exports = MongoDBDriver;