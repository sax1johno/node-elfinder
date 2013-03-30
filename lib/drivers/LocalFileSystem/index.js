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

/** Start the commands. **/

/**
 * Returns information about requested directory and its content, optionally can return directory tree as files, and options for the current volume
 * @param context the elfinder context for this driver.
 * @param args the arguments passed into this command.
 * @param completeFn a function that is executed when the command is complete. Has the format
 *  completeFn(response) where response is a JSON response suitable for sending to the client.
 **/
LocalFileSystem.prototype.open = function(context, args, completeFn) {
    var response = {};
    if (_.has(args, 'init') && args.init) {
        // Yep
        response.api = context.apiVersion();
        // Also, make sure to get options for this guy.
    } else {
        if (!_.has(args, 'target')) {
            
        }
    }
    
};

function getOptions() {
    
}

module.exports = LocalFileSystem;