/**
 * This connector is used to interface with the ElFinder file manager (elfinder.org).
 * This is a close port to the PHP version, with a few key exceptions.
 * 1) The bind format is different: Rather than using a comma-separated-values list of keys,
 *    we just use one key / value.
 * 2) Most functions return promises rather than direct values to keep the functions asynchrounous.
 *    To get the actual values, just pass in a function (ie:  open(function(response){}));
 * @author John O'Connor
 **/

/** Requires for this class **/
var path    =  require('path'),
    _       =  require('underscore'),
    utils =   require('./utils'),
    commands = require('./commands'),
    ERRORS   = require('./errors'),
    Q       = require('q'),
    drivers = require('./drivers'),
    util = require('util'),
    fs  = require('fs'),
    logger = require('ghiraldi-simple-logger'),
    eventEmitter = require('events').EventEmitter; /** An event emitter for listeners. **/

var elEventEmitter = new eventEmitter();

/**
 * API version number
 **/
var version = '2.0';

/**
 * Storages
 **/
var volumes = {};
var netDrivers = [];
var defaultVolume = null;


/**
 * Default root volume (storage);
 **/
var defaultRootVolume = {
    'driver': 'LocalFileSystem',
    'path': '',
    'startPath': '',
    'URL': '',
    'alias': '',
    'mimeDetect': 'auto',
    'mimeFile': 'auto',
    'imgLib': 'auto',
    'tmbPath': '.tmb',
    'tmbPathMode': '0777',
    'tmbSize': '48',
    'tmbCrop': true,
    'tmbBgColor': '#ffffff',
    'copyOverwrite': true,
    'copyJoin': true,
    'copyFrom': true,
    'copyTo': true,
    'uploadOverwrite': true,
    'uploadAllow': [],
    'uploadDeny': [],
    'uploadOrder': ['deny', 'allow'],
    'uploadMaxSize': 0,
    'defaults': {
        'read': true,
        'write': true
    },
    'attributes': [],
    'acceptedName': '/^\w[\w\s\.\%\-]*$/u',
    'accessControl': null,
    'accessControlData': null,
    'disabled': [],
    'treeDeep': 1,
    'checkSubfolders': true,
    'directorySeparator': path.sep,
    'dateFormat': 'j M Y H:i',
    'timeFormat': 'H:i',
    'cryptLib': undefined, /** Not yet implemented. **/
    'archiveMimes': [],
    'archivers': []
};
/** 
 * Options
 **/
var opts;

/** First, lets set up some default options. **/
opts = {
    'locale': 'en_US.UTF-8', /** Sets the user locale. **/
    'debug': false, /** Set to true to send debug to the client. **/
    'bind': [], /** Bind callbacks to certain commands **/
    'roots': [  /** A list of root volumes.  A quasi-sane default is provided **/
        defaultRootVolume
    ]
};

/** 
 * Time for debug
 **/
var time = 0;

/**
 * Should we send debug to the client?
 **/
var debug = false;

/**
 * Errors from unmounted volumes
 **/
var mountErrors = [];

/**
 * Ensure that the application is loaded complete for async commands
 **/
var loaded = false;

/** 
 * ElFinder constructor
 * @param newOpts an object of options that can be passed in. Uses the same format as the defaults opts.
 * @return a Q promise on the mounting and event listener binding.
**/
var ElFinder = function(newOpts) {
    /**
     * Mounted volumes count
     * Required to create a unique volume id
     **/
    this.volumesCount = 0;
    
    var thisFinder = this;
    if (!_.isUndefined(newOpts) && !_.isNull(newOpts)) {
        logger.log("debug", "newOpts roots = " + JSON.stringify(newOpts.roots));
        logger.log("debug", "newOpts = " + JSON.stringify(newOpts));
        opts = _.extend(opts, newOpts);
    }
    
    var root = opts.roots[0];
    
    var bindEvents = _.pairs(opts.bind);
    
    logger.log('debug', 'opts = ' + JSON.stringify(opts));
    
    /** Bind event listeners **/
    function bindEventListeners() {
        var eventListenerDeferred = Q.defer();
        function doBinding(index) {
            if (index >= _.size(bindEvents) - 1) {
                eventListenerDeferred.resolve();
            } else {
                elEventEmitter.on(bindEvents[index][0], bindEvents[index][1]);
                return doBinding(++index);
            }
        }
        doBinding(0);
        return eventListenerDeferred.promise;
    }
    
    var that = this;
    /** Mount volumes **/
    function mountVolumes() {
        var mountVolumesDeferred = Q.defer();
        function doMountVolumes(index) {
            console.log("index = " + index);
            if (index > _.size(opts.roots) - 1) {
                that.loaded = _.isNull(that.defaultVolume);
                mountVolumesDeferred.resolve();
            } else {
                var driver = opts.roots[index].driver;
        
                logger.log("debug", "driver = " + driver);
                if (_.has(drivers, driver)) {
                    var volume = drivers[driver](thisFinder);
                    if (_.isUndefined(volume) || _.isNull(volume)) {
                        mountErrors.push("Volume not found");
                    } else {
                        logger.log("debug", "volume = " + JSON.stringify(volume));
                        volume.mount(opts.roots[index], function(err, id) {
                            if (err) {
                                mountErrors.push("Driver " + driver + ": " + err);
                            } else {
                                volumes[id] = volume;
                                if (!defaultVolume && volume.isReadable()) {
                                    defaultVolume = volumes[id];
                                }
                            }
                        });   
                    }
                } else {
                    mountErrors.push("Driver " + driver + " does not exist");
                }
                doMountVolumes(++index);
                // var volume = drivers.
            }
        }
        doMountVolumes(0);
        return mountVolumesDeferred.promise;
    }
    
    Q.all([
        bindEventListeners(),
        mountVolumes(),
        Q.fcall(function () {
            loaded = true;
        })
    ]);
    // currentVolume = require('./drivers/')[root.driver](root);
};

ElFinder.prototype.getMountErrors = function() {
    return mountErrors;
}

/**
 * Return the API version;
 **/
ElFinder.prototype.apiVersion = function() {
    return this.API_VERSION;
};

/**
 * Takes a currently running JSON response object and adds the error
 * specified in the 'error' parameter. Uses the next function so responses
 * can be built incrementally, since errors are not terminating events in some cases.
 * @param response the current JSON response.
 * @param error the error and errordata.
 * @param next the next function to be called.  Receives the response as a param.
 **/
ElFinder.prototype.error = function(response, error, next) {
    var errorString = "";
    if (!_.isUndefined(response.error) && !_.isNull(response.error)) {
        response.error.push(error);
    } else {
        if (_.isArray(error)) {
            response.error = response.error.concat(error);
        } else {
            response.error = error;
        }
    }
    next(response);
};

/**
 * Execute an ElFinder command and return the result in a promise.
 * @param commandString the name of the command (ie: 'open');
 * @param commandArgs an array of the command arguments.
 * @return returns a promise for execution.
 **/
ElFinder.prototype.exec = function(commandString, commandArgs) {
    var execDefer = Q.defer();
    var volumeKeys = _.keys(volumes);
    var result = null;
    var time = process.hrtime();
    var self = this;
    
    if (!this.loaded) {
        ElFinder.error({}, ERRORS.ERROR_UNKNOWN, function(response) {
            execDefer.reject(response);
        });
        return execDefer.promise;
    }
    
    // First, check if the user has sent a valid command.
    if (!commands.isValid(commandString)) {
        // Generate the error and send the response to the 
        ElFinder.error({}, ERRORS.ERROR_UNKNOWN_CMD, function(response) {
            execDefer.reject(response);
        });
        return execDefer.promise;
    }
    
    function setMimeTypes() {
        var mimeTypeDeferred = Q.defer();
        if (_.has(commandArgs, 'mimes')) {
            iterateVolumes(0, volumeKeys, 
            function(volume) {
                volume.setMimesFilter(commandArgs.mimes);
            }, function() {
                mimeTypeDeferred.resolve();
            });
        } else {
            mimeTypeDeferred.resolve();
        }
        
        return mimeTypeDeferred.promise;
    }
    
    /** Now, execute the command. **/    
    function executeCommand() {
        var execCommandDefer = Q.defer();
        
        Q.fcall(ElFinder[commandString](commandArgs))
        .then(function(res) {
            result = res;
        }, function(error) {
            ElFinder.error({}, error, function(response) {
                execCommandDefer.reject(response);
            });
        });
        
        return execCommandDefer.promise;
    }
    
    /** Add removed items to an array of items to be removed. **/
    function removeItems() {
        var removeItemsDeferred = Q.defer();
        // If something is to be removed.
        if (_.has(result, 'removed')) {
            iterateVolumes(0, volumeKeys, 
            function(volume) {
                result.removed = _.extend(result.removed, volume.removed());
                volume.resetRemoved();
                
            }, function() {
                removeItemsDeferred.resolve();
            });
        }
        return removeItemsDeferred.promise;
    }
    
    function emitEvents() {
        return Q.fcall(function() {
            ElFinder.emit(commandString);
        });
    }
    
    function convertRemovedToHashes() {
        return Q.fcall(function() {
            if (!_.isEmpty(result.removed)) {
                var removedArray = [];
                var index = 0;
                result.removed.forEach(function(removed) {
                    removedArray.push(removed['hash']);
                    if (++index > _.size(result.removed) - 1) {
                        result.removed = _.uniq(removedArray);
                    }
                });
            } else {
               return; 
            }
        })
    }
    
    // Remove hidden files and filter files by mimetypes.
    function removeHiddenFiles() {
        return Q.fcall(function() {
             if (result.added) {
                 result.added = ElFinder.filter(result.added);
             }
             if (result.changed) {
                 result.changed = ElFinder.filter(result.changed);
             }
             return true;
        });
    }
    
    function runDebug() {
        return Q.fcall(function() {
            if (debug && _.has(commandArgs, 'debug')) {
                result.debug = {
                    'connector': 'node.js',
                    'nodeversion': process.version,
                    'time': process.hrtime(time),
                    'memory': util.inspect(process.memoryUsage()),
                    'upload': self.uploadDebug,
                    'volumes': [],
                    'mountErrors': self.mountErrors
                };
                iterateVolumes(0, volumeKeys, function(volume) {
                    result.debug.volumes.push(volume.debug());
                }, function() {
                    return;
                });
            }
        });
    }
    
    function unmountVolumes() {
        return Q.fcall(function() {
           self.iterateVolumes(0, volumeKeys, function(volume) {
               volume.umount();
           }, function() {
               return;
           });
        });
    }
    
    return Q.all([
        setMimeTypes(),
        executeCommand(),
        removeItems(),
        emitEvents(),
        convertRemovedToHashes(),
        removeHiddenFiles(),
        runDebug(),
        unmountVolumes()
    ]);
};

/**
 * protected iterateVolumes
 * Iterates through the volumes and runs the function on each encountered volume.
 * @param index the index of the current volume.
 * @param keys an array of the volume id's (which are keys into the volumes object)
 * @param fn the function to run on each item.
 * @param completeFn a function that is called when iteration is complete.
**/
function iterateVolumes(index, keys, fn, completeFn) {
    if (index < _.size(_.keys(volumes)) -1) {
        fn(volumes[keys[index]], index, keys[index]);
        iterateVolumes(++index, keys, fn, completeFn);
    } else {
        completeFn();
    }
}

/**
 * Gets the real file path of a hash.  Operates on the default volume.
 * @param hash the hash of the file whose path will be returned.
 * @return the real path as a string.
 **/
 ElFinder.prototype.realpath = function(hash) {
    return defaultVolume.realpath(hash);
 };

/**
 * Return the network volumes.  Not currently implemented.
 * 
 * @return an array of the network volumes.
 **/
 ElFinder.prototype.getNetVolumes = function() {
     throw "Command not supported";
 };
 
 /**
  * Save network volumes config.  Not currently implemented.
  * 
  * @param array the volumes configuration.
  **/
ElFinder.prototype.saveNetVolumes = function() {
    throw "Command not supported";
};


/**
 * Mount the network volumes. Not currently implemented.
 * 
 * @param args the arguments for the network mount.
 * @return A promise to execute the netmount.
 **/
ElFinder.prototype.netmount = function(args) {
    throw ERRORS.ERROR_UNKNOWN_CMD;
};

/**
 * Open a directory
 *
 * @param args the command arguments.
 * @return a response object with the following format: 
 * - cwd:   information about the opened directory.
 * - files: the content of the opened directory (with the entire tree if args.tree = true)
 * - api:   the api version (if args.init)
 * - uplMaxSize:    The maximum size of uploads (if args.init)
 * - error:         Failures that were encountered during opening.
**/
ElFinder.prototype.open = function(args) {
    var openDefer = Q.defer();
    var target = args.target;
    var init = !_.isUndefined(args.init);
    var tree = !_.isUndefined(args.tree) && !_.isEmpty(args.tree);
    var vol = volume(target);
    
    var cwd = false;
    var hash = init ? 'default folder' : '#' + target;
    var files = [];
    
    var volDefer = vol.dir(target, true);
    volDefer.then(function(dirValue) {
        cwd = dirValue;
        if ((!cwd || !cwd.read) && init) {
            vol = defaultVolume;
            return vol.dir(vol.defaultPath(), true).then(function(val) {
                cwd = val;
                if (!cwd) {
                    ElFinder.error({}, [ERRORS.ERROR_OPEN, hash, ERRORS.ERROR_DIR_NOT_FOUND], function(response) {
                        volDefer.reject(response);
                    });
                } else if (!cwd.read) {
                    ElFinder.error({}, [ERRORS.ERROR_OPEN, hash, ERRORS.ERROR_PERM_DENIED], function(response) {
                        volDefer.reject(response);
                    });
                }
            });
        } else {
            return Q.resolve();
        }
    }, function(response) {
        openDefer.reject(response);      
    })
    .then(function() {
        if (tree) {
            var index = 0;
            var volumesList = _.keys(volumes);
            function itVolumes(index) {
                if (index >= _.size(volumesList)) {
                    return Q.resolve();
                } else {
                    volume.tree('', cwd.hash).then(function(treeVal) {
                        if (treeVal) {
                            files = _.flatten(files.concat(treeVal));
                        }
                        return true;
                    }).then(function() {
                        return itVolumes(++index);
                    })
                }
            }
        } else {
            return Q.resolve();
        }
    })
    .then(vol.scanDir(cwd.hash))
    .then(function(ls) {
        if (!ls) {
            ElFinder.error({}, [ERRORS.ERROR_OPEN, cwd.name, vol.error()], function(response) {
                volDefer.reject(response);    
            });
        } else {
            _.each(ls, function(file, index, list) {
                if (!_.contains(files, file)) {
                    files.push(file);
                }
                if (index >= _.size(list) - 1) {
                    volDefer.resolve();
                }
            });
        }
    })
    .then(vol.options(cwd.hash))
    .then(function(options) {
        var result = {
            'cwd': cwd,
            'options': options,
            'files': files
        }
        if (!init) {
            result.api = ElFinder.apiVersion();
            result.uplMaxSize = ''; // how do I get this in node?
            result.netDrivers = false;
        }
        
        openDefer.resolve(result);
    });
    
    return openDefer.promise;
};

/**
 * Return a list of the files in the target directory.
 * 
 * @param args the command arguments.
 * @param a promise to return the list.
 **/
function ls (args) {
    var lsDefer = Q.defer();
    var target = args.target;
    var vol = vol(target);
    
    if (vol) {
        vol.ls(target)
        .then(function(list) {
            lsDefer.resolve(list); 
        }, function(err) {
            ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target], function(response) {
                lsDefer.reject(response);
            });
        });
    } else {
        ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target], function(response) {
            lsDefer.reject(response);
        });
    }
    
    return lsDefer.promise;
}

/**
 * Return subdirs for required directory.
 * 
 * @param args command arguments.
 * @return a promise to return the parent directory.
 **/
function tree(args) {
    var treeDefer = Q.defer();
    var target = args.target;
    var vol = volume(target);

    vol.tree(target).then(function(tree) {
        treeDefer.resolve({'tree': tree});
    }, function(err) {
        ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target], function(response) {
            treeDefer.reject(response);
        });
    })
    
    return treeDefer.promise;
}

/**
 * Return parent directory for required directory.
 * 
 * @param cmd command arguments.
 * @return a promise to return the parent directory.
 **/
function parents(args) {
    var parentsDefer = Q.defer();
    var target = args.target;
    var vol = volume(target);

    vol.parents(target).then(function(tree) {
        parentsDefer.resolve({'tree': tree});
    }, function(err) {
        ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target], function(response) {
            parentsDefer.reject(response);
        });
    })
    
    return parentsDefer.promise;
}

/**
 * Return new created thumbnails list
 * 
 * @param args the command arguments.
 * @return a promise to create thumbnails and return the list.
 **/
function tmb(args) {
    var tmbDeferred = Q.defer();
    var result = {'images': {}};
    var targets = args.targets;
    var targetSize = _.size(targets) - 1;
    
    function iterateTargets(index) {
        if (index >= targetSize) {
            tmbDeferred.resolve(result);
        }
        var target = args.targets[index];
        var vol = volume(target);
        vol.tmb(target).then(function(tmb) {
            result.images.target = tmb;
            return true;
        }).then(function() {
            iterateTargets(++index);
            return true;
        });
    }
    iterateTargets(0);
    return tmbDeferred.promise;
}

/**
 * Required to output file in browser when volume URL is not set.
 * 
 * @param args the command arguments.
 * @return a promise to return the file with a response.
 **/
function file(args) {
    var fileDeferred = Q.defer();
    var target = args.target;
    var download = (!_.isUndefined(args.download) && !_.isNull(args.download))
    var h403 = 'HTTP/1.x 403 Access Denied';
    var h404 = 'HTTP/1.x 404 Not Found';
    var disp;
    var mime;
    var filename;
    var theFile;
    
    var vol = volume(target);
    if (!vol) {
        ElFinder.error({}, "FileNotFound", function(response) {
            response.header = h404;
            response.raw = true;
            fileDeferred.reject(response);
        });
    } else {
        vol.file(target).
        fail(function(err) {
            ElFinder.error({}, 'File not found', function(response) {
                response.header = h404;
                response.raw = true;
                return response;
            });
        }).then(function(f) {
            theFile = f;
            if (!theFile.read) {
                ElFinder.error({}, 'Access Denied', function(response) {
                    response.header = h403;
                    response.raw = true;
                    return Q.reject(response);
                });
            } else {
                return theFile;
            }
        }).then(vol.open(target))
        .then(function(fp) {
            if (download) {
                disp = 'attachment'
                mime = 'application/octet-stream';
            } else {
                disp = file.mime.match(/^(image|text)/i) || file.mime == 'application/x-shockwave-flash' 
                    ? 'inline'
                    : 'attachment';
                mime = file.mime;
            }
            // Just doing uri encoded filename for now until I figure out how we'll access
            // the user-agent string.
            var filenameEncoded = encodeURI(file.name);
            return {'fp': fp, 'filename': filenameEncoded, 'disp': disp};
        }, function(err) {
            ElFinder.error({}, 'File not found', function(response) {
                response.header = h404;
                response.raw = true;
                return Q.reject(response);
            });
        }).then(function(resultargs) {
            var result = {
                'volume': vol,
                'pointer': resultargs.fp,
                'info': theFile,
                'header': [
                    'Content-Type: ' + mime,
                    'Content-Disposition: ' + disp + '; ' + resultargs.filename,
                    'Content-Location: ' + theFile.name,
                    'Content-Transfer-Encoding: binary',
                    'Content-Length: ' + theFile.size,
                    'Connection: Close'
                ]
            };
            fileDeferred.resolve(result);
        });   
    }
    return fileDeferred.promise;
}

/**
 * Count total files size
 * 
 * @param args the command arguments.
 * @return a promise to count the files with a response object.
 **/
function size(args) {
    var sizeDeferred = Q.defer();
    var size = 0;
    var targetSize = _.size(args.targets) - 1;
    
    function iterateTargets(index) {
        if (index >= targetSize) {
            sizeDeferred.resolve(size);
        }
        var target = args.targets[index];
        var vol = volume(target);
        var file = vol.file(target);
        if (!vol || !file || !_.has(file, 'read')) {
            ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target], function(response) {
                sizeDeferred.reject(response);
            });
        } else {
            vol.size(target).then(function(thisSize) {
                size += thisSize;
                iterateTargets(++index);
            }, function(err) {
                ElFinder.error({}, [ERRORS.ERROR_OPEN, '#'+target, err], function(response) {
                    sizeDeferred.reject(response);
                });                
            })
        }
    }
    iterateTargets(0);
    return sizeDeferred.promise;
}

/**
 * Create an empty directory
 * 
 * @param args the command arguments.
 * @return a promise to create an empty file with a response object.
 **/
function mkfile(args) {
    var mkDirDeferred = Q.defer();
    var target = args.target;
    var name = args.name;
    var vol = volume(target);
    
    if (!vol) {
        ElFinder.error({}, [ERRORS.ERROR_MKDIR, name, ERRORS.ERROR_TRGDIR_NOT_FOUND, '#'+target], function(response) {
            mkDirDeferred.reject(response);            
        });
    } else {
        vol.mkfile(target, name).then(function(dir) {
            mkDirDeferred.resolve({'added': dir});            
        }, function(err) {
            ElFinder.error({}, [ERRORS.ERROR_MKDIR, name, err], function(response) {
                mkDirDeferred.reject(response);
            });
        });
    }
    return mkDirDeferred.promise;
}


/**
 * Create an empty file
 * 
 * @param args the command arguments.
 * @return a promise to create an empty file with a response object.
 **/
function mkfile(args) {
    var mkFileDeferred = Q.defer();
    var target = args.target;
    var name = args.name;
    var vol = volume(target);
    
    if (!vol) {
        ElFinder.error({}, [ERRORS.ERROR_MKFILE, name, ERRORS.ERROR_TRGDIR_NOT_FOUND, '#'+target], function(response) {
            mkFileDeferred.reject(response);            
        });
    } else {
        vol.mkfile(target, name).then(function(file) {
            mkFileDeferred.resolve({'added': file});            
        }, function(err) {
            ElFinder.error({}, [ERRORS.ERROR_MKFILE, name, err], function(response) {
                mkFileDeferred.reject(response);
            });
        });
    }
    return mkFileDeferred.promise;
}

/**
 * Rename file
 * @param args the command arguments.
 * @return a promise to rename with a response object.
 **/
 function rename(args) {
    var renDeferred = Q.defer();
    var target = args.target;
    var name = args.name;
    var vol = volume(target);
    var rm = vol.file(target);
    
    if (!vol || !rm) {
        ElFinder.error({}, [ERRORS.ERROR_RENAME, '#'+target, ERRORS.ERROR_FILE_NOT_FOUND], function(response) {
            renDeferred.reject(response);
        });
    } else {
        rm.realpath = vol.realpath(target);
        vol.rename(target, name).then(function(file) {
            if (!file) {
                ElFinder.error({}, [ERRORS.ERROR_RENAME, rm.name, vol.error()], function(response) {
                    renDeferred.reject(response);
                });
            } else {
                renDeferred.resolve({'added': file, 'removed': rm});
            }
        }, function(err) {
            ElFinder.error({}, [ERRORS.ERROR_RENAME, rm.name, vol.error()], function(response) {
                renDeferred.reject(response);                
            });
        });
    }
    return renDeferred.promise;
 }
 
/**
 * Duplicate file
 * @param args the command arguments.
 * @return a promise to duplicate with a response object.
 **/
function duplicate(args) {
    var dupDeferred = Q.defer();
    var targets = [];
    if (!_.isArray(args.targets)) {
        targets = args.targets;
    } else {
        targets.push(args.targets);
    }
    var result = {
        'added': []
    }
    var suffix = (!_.isUndefined(args.suffix) && !_.isNull(args.suffix)) ? 'copy': args.suffix;
    var list = targets;
    function iterateTargets(index) {
        if (index >= _.size(list) -1) {
            dupDeferred.resolve(result);
        }
        var target = targets[index];
        var vol = volume(target);
        var src = vol.file(target);
        if (!vol || !src) {
            ElFinder.error({}, ERRORS.COPY, function(response) {
                response.error.push('#'+target);
                response.error.push(ERRORS.ERROR_FILE_NOT_FOUND);
                result.warning.push(response);
                iterateTargets(++index);
            });
        } else {
            vol.duplicate(target, suffix)
            .then(function(file) {
                result.added.push(file);
                iterateTargets(++index);                
            }, function(err) {
                ElFinder.error({}, err, function(response) {
                    response.error.push('#'+target);
                    result.warning.push(response);
                    iterateTargets(++index);                    
                });
            });
        }
    }
    iterateTargets(0);
    return dupDeferred.promise;
}

/**
 * Remove directories / files
 * @param args command arguments.
 * @return a promise to remove and send a response.
 **/
function rm(args) {
    var rmDeferred = Q.defer();
    var targets = [];
    if (!_.isArray(args.targets)) {
        targets = args.targets;
    } else {
        targets.push(args.targets);
    }
    var result = {
        removed: []
    };
    
    var list = targets;
    function iterateTargets(index) {
        if (index >= _.size(list) -1) {
            rmDeferred.resolve(result);
        }
        var target = targets[index];
        var vol = volume(target);
        if (!vol) {
            ElFinder.error({}, ERRORS.ERROR_RM, function(response) {
                response.error.push('#'+target);
                response.error.push(ERRORS.ERROR_FILE_NOT_FOUND);
                result.warning.push(response);
                iterateTargets(++index);
            });
        } else {
            vol.rm(target)
            .then(function(removedFile) {
                result.removed.push(removedFile);
                iterateTargets(++index);                
            }, function(err) {
                ElFinder.error({}, err, function(response) {
                    response.error.push('#'+target);
                    result.warning.push(response);
                    iterateTargets(++index);                    
                });
            });
        }
    }
    iterateTargets(0);
    return rmDeferred.promise;
}
/**
 * Save uploaded files
 * 
 * @param an object for uploaded files.
 * @return a response object.
 **/
function upload(args) {
    var uploadDeferred = Q.defer();
    var target = args.target;
    var vol = volume(target);
    var files = [];
    var result = {
        'added': []
    }
    if (args.html) {
        result.header = 'Content-Type: text/html; charset=utf-8';
    } else {
        result.header = false;
    }
    
    if (_.isEmpty(files)) {
        ElFinder.error({}, ERRORS.ERROR_UPLOAD, function(response) {
            response.error.push(ERRORS.ERROR_UPLOAD_NO_FILES);
            response.header = result.header;
            uploadDeferred.reject(response);
        })
    } else if (!vol) {
        ElFinder.error({}, ERRORS.ERROR_UPLOAD, function(response) {
            response.error.push(ERRORS.ERROR_TRGDIR_NOT_FOUND);
            response.error.push('#' + target);
            response.header = result.header;
            uploadDeferred.reject(response);
        });
    } else {
        var list = _.keys(files.name);
        function iterateFilesList(index) {
            var fileName = list[index];
            if (index >= _.size(list) -1) {
                uploadDeferred.resolve(result);
            } else {
                var tmpName = files.tmp_name[fileName];
                var error = files.error[fileName];
                Q.nfcall(fs.open, tmpName, 'rb').then(function(fp) {
                    if (!fp) {
                        ElFinder.error({}, ERRORS.ERROR_UPLOAD_FILE, function(response) {
                            response.error.push(name);
                            response.error.push(ERRORS.ERROR_UPLOAD_TRANSFER);
                            result.warning.push(response);
                            iterateFilesList(++index);
                        });
                    } else {
                        var file = vol.upload(fp, target, name, tmpName);
                        if (!file) {
                            ElFinder.error({}, ERRORS.ERROR_UPLOAD_FILE, function(response) {
                                response.error.push(vol.error());
                                response.error.push(name);
                                result.warning.push(response);
                                iterateFilesList(++index);
                            });
                        } else {
                            Q.nfcall(fs.close).then(function() {
                                result.added.push(file);
                                iterateFilesList(++index);
                            });
                        }
                    }
                }, function(err) {
                    ElFinder.error({}, ERRORS.ERROR_OPEN, function(response) {
                        response.error.push(err);
                        uploadDeferred.reject(response);
                    });
                });
            }
        }
        iterateFilesList(0);
    }
    return uploadDeferred.promise;
}

/**
 * Copy / move files into new destination.
 * 
 * @param args command arguments.
 * @return a promise to complete with a response object.
 **/
function paste(args) {
    var pasteDeferred = Q.defer();
    var dst = args.dst;
    var targets;
    if (!_.isUndefined(args.targets) && !_.isNull(args.targets)) {
        if (!_.isArray(args.targets)) {
            targets = [];
            targets.push(args.targets);
        } else {
            targets = args.targets;
        }
    }
    var cut = (!_.isUndefined(args.cut) && !_.isNull(args.cut)) ? true : false;
    var error = cut ? ERRORS.ERROR_MOVE : ERRORS.ERROR_COPY;
    var result = {
        'added': {},
        'removed': {},
        'warning': []
    };
    
    var dstVolume = volume(dst);
    if (dstVolume) {
        _.each(targets, function(target, index, list) {
            if (index >= _.size(list) - 1) {
                pasteDeferred.resolve(result);
            } else {
                var srcVol = volume(target);
                var file = dstVolume.paste(srcVol, target, dst, cut);
                if (!srcVol) {
                    ElFinder({}, ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
                        response.error.push('#' + target);
                        response.error.push(error);
                        result.warning.push(response);
                    });
                }
                else if (!file) {
                    ElFinder.error({}, dstVolume.error(), function(response) {
                        result.warning.push(response);
                    });
                } else {
                    result.added.push(file);
                }
            }
        });
    } else {
        ElFinder.error({}, ERRORS.ERROR_TRGDIR_NOT_FOUND, function(response) {
            response.error.push('#' + targets[0]);
            response.error.push('#' + dst);
            ElFinder.error(response, error, function(response) {
                pasteDeferred.reject(response); 
            });
        });
    }
    
    return pasteDeferred.promise;
}

/**
 * Get the contents of a text file.
 * 
 * @param args the command arguments.
 * @return a response object
 **/
function get(args) {
    var getDeferred = Q.defer();
    var target = args.target;
    var vol = volume(target);
    var file = vol.file(target);
    
    if (vol && file) {
        var content = vol.getContents(target);
        if (content) {
            getDeferred.resolve(JSON.stringify(content));
        } else {
            ElFinder.error(vol.error(), ERRORS.ERROR_OPEN, function(response) {
                response.error.push(vol.path(target));
                getDeferred.reject(response);
            });
        }
    } else {
        ElFinder.error({}, ERRORS.ERROR_OPEN, function(response) {
            response.error.push('#' + target);
            ElFinder.error(response, ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
                getDeferred.reject(response);
            })
        });
    }
    
    return getDeferred.promise;
}

/**
 * Save content to a text file.
 * 
 * @return a response object.
 **/
function put(args) {
    var putDeferred = Q.defer();
    var target = args.target;
    var vol = volume(target);
    var file = vol.file(target);
    
    if (vol && file) {
        file.putContents(target, args.content)
        .then(
            function(file) {
                putDeferred.resolve({'changed': file});
            }, function(err) {
                ElFinder.error(volume.error(), ERRORS.ERROR_SAVE, function(response) {
                    response.error.push(vol.path(target));
                    putDeferred.reject(response);
                });
            });
    } else {
        ElFinder.error({}, ERRORS.ERROR_SAVE, function(response) {
            response.error.push('#'+target);
            ElFinder.error(response, ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
                putDeferred.reject(response);
            });
        });
    }
}

/**
 * Extract files from an archive
 * 
 * @param args the command arguments.
 * @return a response object.
 **/
function extract(args) {
    var extractDeferred = Q.defer();
    var target = args.target;
    var mimes = [];
    if (!_.isEmpty(args.mimes)) {
        mimes = args.mimes;
    }
    var vol = volume(target);
    var file = vol.file(target);
    if (vol && file) {
        file = vol.extract(target);
        if (file) {
            extractDeferred.resolve({'added': file});
        } else {
            ElFinder.error(vol.error(), ERRORS.ERROR_EXTRACT, function(response) {
                response.error.push(vol.path(target));
                extractDeferred.reject(response);
            });
        }
    } else {
        ElFinder.error({}, ERRORS.ERROR_EXTRACT, function(response) {
            response.error.push('#' + target);
            ElFinder.error(response, ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
                extractDeferred.reject(response);
            });
        });
    }
    
    return extractDeferred.promise;
}

/**
 * Create an archive.
 * 
 * @param args the command arguments.
 * @return a response object.
 **/
function archive(args) {
    var archiveDeferred = Q.defer();
    var type = args.type;
    var targets = args.targets ? args.targets: [];
    
    var vol = volume(targets[0]);
    if (!vol) {
        ElFinder.error({}, ERRORS.ERROR_ARCHIVE, function(response) {
            ElFinder.error(response, ERRORS.ERROR_TRGDIR_NOT_FOUND, function(res) {
                archiveDeferred.reject(res);
            });
        });
    } else {
        var file = vol.archive(targets, args.type);
        if (file) {
            archiveDeferred.resolve({'added': file});
        } else {
            ElFinder.error(vol.error(), ERRORS.ERROR_ARCHIVE, function(response) {
                archiveDeferred.reject(response);
            });
        }
    }
}

/**
 * Search files.
 * 
 * @param args the command arguments.
 * @return a response object.
 **/
function search(args) {
    var q = args.q;
    var mimes = args.mimes ? args.mimes : [];
    var result = {};
    var searchDeferred = Q.defer();
    
    iterateVolumes(0, volumeKeys,
    function(volume) {
        volume.search(q.mimes).then(function(results) {
            result = _.extend(result, results);
        })
    }, function() {
        searchDeferred.resolve({'files': result});
    });
    
    return searchDeferred.promise;
}

/**
 * Return file info (used by client "places" ui)
 * @param args command arguments.
 * @return response object.
 **/
 function info(args) {
    var deferred = Q.defer();
     
    if (!_.isUndefined(args.targets) && !_.isNull(args.targets)) {
        var targetKeys = _.keys(args.targets);
        var files = [];
        function iterateTargets(index) {
            if (index >= _.size(targetKeys)) {
                deferred.resolve({'files': files});
            } else {
                if (args.targets[targetKeys[index]]) {
                    var hash = args.targets[targetKeys[index]];
                    var vol = volume(args.targets[targetKeys[index]]);
                    if (vol) {
                        var info = vol.file(hash);
                        if (info) {
                            files.push(info);
                        }
                    }
                }
                iterateTargets(++index);
            }
        }
        iterateTargets(0);
    }
     return deferred.promise;
 }
 
/**
 * Return image dimensions.
 * 
 * @param args the command arguments.
 * @return a return object.
 **/
function dim(args) {
    if (volume(args.target)) {
        var dim = volume.dimensions(args.target);
        if (dim) {
            return {
                'dim': dim
            }
        } else {
            return {};
        }
    }
}
/**
 * Resize an image
 * 
 * @param args command arguments.
 * @return a response object.
 **/
function resize(args) {
    var resizeDefer = Q.defer();
    
    var target = args.target;
    var width = args.width;
    var height = args.height;
    var x = args.x;
    var y = args.y;
    var mode = args.mode;
    var bg = null;
    var degree = args.degree;
    var vol = volume(target);
    var file = null;
    if (!_.isUndefined(vol) && !_.isNull(vol) && vol) {
        var fileDefer = vol.file(target);
        fileDefer
        .then(function(file) {
            if (!_.isUndefined(file) && !_.isNull(file) && file) {
                return vol.resize(target, width, height, x, y, mode, bg, degree);
            } else {
                ElFinder.error({}, ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
                    fileDefer.reject(response);
                });
            }
        }).then(function(file) {
            if (file) {
                resizeDefer.resolve({'changed': file});
            } else {
                ElFinder.error({}, ERRORS.ERROR_RESIZE, function(response) {
                    resizeDefer.reject(response);
                });
            }
        })
    } else {
        ElFinder.error(vol.error(), ERRORS.ERROR_FILE_NOT_FOUND, function(response) {
            resizeDefer.reject(response);
        });
    }
    
    return resizeDefer.promise;
}

/** Utilities **/

/**
 * Return root - file's owner
 * @param file hash
 * @return elFinderStorageDriver
 **/
function volume(hash) {
    if (_.has(volumes, hash)) {
        return volumes[hash];
    } else {
        return false;
    }
}

/**
 * Returnes a files hashes list.
 * 
 * @param an array of files info.
 * @return an array of file hashes.
 **/
function hashes(files) {
    var ret = [];
    
    return (function iterateFiles(index) {
        if (index >= _.size(files) - 1) {
            return ret;
        } else {
            ret.push(files[index]['hash']);
            return iterateFiles(++index);
        }
    });
}

/**
 * Remove hidden files and files with required mime times from files list.
 * 
 * @param files the file info.
 * @return the filtered files.
 **/
function filter(files) {
    var ret = [];
    var self = this;
    return (function iterateFiles(index) {
        if (index >= _.size(files) - 1) {
            return ret;
        } else {
            if (!files[index].hidden && self.defaultVolume.mimeAccepted(files[index].mime)) {
                ret.push(files[index]);
            }
            return iterateFiles(++index);
        }
    });
    // How does this work?
}
/** Make this an event emitter **/
ElFinder.prototype.__proto__ = eventEmitter.prototype;

module.exports = ElFinder;
