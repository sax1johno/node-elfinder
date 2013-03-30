/**
 * The volume driver for the LocalFileSystem data storage backend.
 **/
 
var fs = require('fs'),
    path = require('path'),
    opts,
    _ = require('underscore');
    
var LocalFileSystem = function(opts) {
    opts = this.opts;
};

module.exports = LocalFileSystem;