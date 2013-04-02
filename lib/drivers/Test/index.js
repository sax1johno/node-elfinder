/**
 * The volume driver for the TEST data storage backend.
 * 
 * This volume driver is only meant to be used as a testing driver, or as 
 * a template for creating other drivers, and is not designed to be used in
 * production.
 * 
 * @author John O'Connor
 **/
 var _ = require('underscore'),
    Q = require('q'),
    pathLib = require('path');
 
/** Variables that are global to this module. **/

/** Default options specific to this driver **/
var opts = {
    'driver': 'TEST',
};

/**
 * Driver id
 * Must be started from letter and contains [a-z0-9]
 * Used as part of volume id
 *
 **/
var driverId = 't';

/**
 * Required to count total archive files size
 *
 **/
var archiveSize = 0;

/**
 * Constructor. Extends options with required fields.
 **/
var TestDriver = function() {
    this.options.alias  =   '';  // alias to replace root dir name
	this.options.dirMode  = '0755';            // new dirs mode
	this.options.fileMode = '0644';            // new files mode
	this.options.quarantine = '.quarantine';  // quarantine folder name - required to check archive (must be hidden)
	this.options.maxArcFilesSize = 0;        // max allowed archive files size (0 - no limit)
};

/**
 * Configure the volume after a successful mount.
 * Not used in the test driver.  Returns true always;
 **/
TestDriver.prototype.configure = function() {
    return true;
}

/*********************************************************************/
/*                               FS API                              */
/*********************************************************************/

/*********************** paths/urls *************************/

/**
 * Return parent directory path
 *
 * @param  string  $path  file path
 * @return string
 **/
TestDriver.prototype._dirname = function (path) {
    return Q.resolve(path);
}

/**
 * Return file name
 *
 * @param  string  $path  file path
 * @return string
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._basename = function(path) {
    return Q.resolve(path);
}

/**
 * Join dir name and file name and retur full path
 *
 * @param  string  $dir
 * @param  string  $name
 * @return string
 **/
TestDriver.prototype._joinPath = function(dir, name) {
	return Q.resolve(dir+pathLib.sep+name);
}

/** Adding a repeate to the string object. **/
String.prototype.repeat = function( num )
{
    return new Array( num + 1 ).join( this );
}



/**
 * Return normalized path, this works the same as os.path.normpath() in Python
 *
 * @param  string  $path  path
 * @return string
 **/
TestDriver.prototype._normpath = function(path) {
	if (!path) {
		return Q.resolve('.');
	}
    
    var initialSlashes = false;
	if (path.indexOf('/') === 0) {
		initialSlashes = true;
	}

	if ((initialSlashes) 
	&& (path.indexOf('//') === 0) 
	&& (path.indexOf('///') < 0)) {
		initialSlashes = 2;
	}

	var comps = path.split('/');
	var newComps = [];
	_.each(comps, function(comp, index, list) {
        if (comp !== '' || comp !== '.') {
            if (
                comp !== '..' || 
                (!initialSlashes && !newComps) ||
                (newComps && _.last(newComps) == '..')) {
                    newComps.push(comp);
                } else if (newComps) {
                    newComps.pop;
                }
        }
        if (index >= _.size(list) -1) {
            comps = newComps;
            path.join('/', comps);
            if (initialSlashes) {
                path.join('/'.repeat(initialSlashes));
            }
        }
	});
    
    return path ? Q.resolve(path) : Q.resolve('.');
}

/**
 * Return file path related to root dir
 *
 * @param  string  $path  file path
 * @return string
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._relpath = function(pth) {
	return pth == this.root ? '' : pth.substring(_.size(this.root)+1);
}

/**
 * Convert path related to root dir into real path
 *
 * @param  string  $path  file path
 * @return string
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._abspath = function(pth) {
	return pth == pathLib.sep ? this.root : this.root+pathLib.sep+pth;
}

/**
 * Return fake path started from root dir
 *
 * @param  string  $path  file path
 * @return string
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._path = function(pth) {
	return this.rootName+(pth == this.root ? '' : this.separator+this._relpath(pth));
}

/**
 * Return true if $path is children of $parent
 *
 * @param  string  $path    path to check
 * @param  string  $parent  parent path
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._inpath = function(pth, parent) {
	return pth == parent || pth.indexOf(parent+pathLib.sep) === 0;
}



/***************** file stat ********************/

/**
 * Return stat for given path.
 * Stat contains following fields:
 * - (int)    size    file size in b. required
 * - (int)    ts      file modification time in unix time. required
 * - (string) mime    mimetype. required for folders, others - optionally
 * - (bool)   read    read permissions. required
 * - (bool)   write   write permissions. required
 * - (bool)   locked  is object locked. optionally
 * - (bool)   hidden  is object hidden. optionally
 * - (string) alias   for symlinks - link target path relative to root path. optionally
 * - (string) target  for symlinks - link target path. optionally
 *
 * If file does not exists - returns empty array or false.
 *
 * @param  string  $path    file path 
 * @return array|false
 **/
TestDriver.prototype._stat = function(pth) {
    var stat = {};
    stat.size = 0;
    stat.ts = 0;
    stat.mime = 'x-testobject';
    stat.read = true;
    stat.write = true;
    stat.locked = false;
    stat.hidden = false;
    return Q.resolve(stat);
}


/**
 * Return true if path is dir and has at least one childs directory
 *
 * @param  string  $path  dir path
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._subdirs = function(pth) {
    return true;
}

/**
 * Return object width and height
 * Usualy used for images, but can be realize for video etc...
 *
 * @param  string  $path  file path
 * @param  string  $mime  file mime type
 * @return string
 **/
TestDriver.prototype._dimensions = function(pth, mime) {
    return '0x0';
}

/******************** file/dir content *********************/

/**
 * Return symlink target file
 *
 * @param  string  $path  link path
 * @return string
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._readlink = function(pth) {
	return false;
}

/**
 * Return files list in directory.
 *
 * @param  string  $path  dir path
 * @return array
 **/
TestDriver.prototype._scandir = function(pth) {
    return Q.resolve([]);
}

/**
 * Open file and return file pointer
 *
 * @param  string  $path  file path
 * @param  bool    $write open file for writing
 * @return resource|false
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._fopen = function(pth, mode) {
    if (!_.isUndefined(mode) && !_.isNull(mode)) {
        // Do something.
    }
	return Q.resolve();
}

/**
 * Close opened file
 *
 * @param  resource  $fp  file pointer
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._fclose = function(fp, pth) {
    return Q.resolve();
}

/********************  file/dir manipulations *************************/

/**
 * Create dir and return created dir path or false on failed
 *
 * @param  string  $path  parent dir path
 * @param string  $name  new directory name
 * @return string|bool
 **/
TestDriver.prototype._mkdir = function(pth, name) {
	pth = pth+pathLib.sep.name;
    return Q.resolve(pth);
}

/**
 * Create file and return it's path or false on failed
 *
 * @param  string  $path  parent dir path
 * @param string  $name  new file name
 * @return string|bool
 **/
TestDriver.prototype._mkfile = function(pth, name) {
	pth = pth+pathLib.sep+name;

    return Q.resolve(pth);
}

/**
 * Create symlink
 *
 * @param  string  $source     file to link to
 * @param  string  $targetDir  folder to create link in
 * @param  string  $name       symlink name
 * @return bool
 **/
TestDriver.prototype._symlink = function(source, targetDir, name) {
    return Q.resolve();
}

/**
 * Copy file into another file
 *
 * @param  string  $source     source file path
 * @param  string  $targetDir  target directory path
 * @param  string  $name       new file name
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._copy = function(source, targetDir, name) {
	return Q.resolve();
}

/**
 * Move file into another parent dir.
 * Return new file path or false.
 *
 * @param  string  $source  source file path
 * @param  string  $target  target dir path
 * @param  string  $name    file name
 * @return string|bool
 **/
TestDriver.prototype._move = function(source, targetDir, name) {
	var target = targetDir+pathLib.sep+name;
    return Q.resolve(target);
}

/**
 * Remove file
 *
 * @param  string  $path  file path
 * @return bool
 **/
TestDriver.prototype._unlink = function(pth) {
    return Q.resolve();
}

/**
 * Remove dir
 *
 * @param  string  $path  dir path
 * @return bool
 **/
TestDriver.prototype._rmdir = function(pth) {
    return Q.resolve();
}

/**
 * Create new file and write into it from file pointer.
 * Return new file path or false on error.
 *
 * @param  resource  $fp   file pointer
 * @param  string    $dir  target dir path
 * @param  string    $name file name
 * @param  array     $stat file stat (required by some virtual fs)
 * @return bool|string
 **/
TestDriver.prototype._save = function(fp, dir, name, stat) {
	var pth = dir+pathLib.sep+name;
    return Q.resolve(pth);
}

/**
 * Get file contents
 *
 * @param  string  $path  file path
 * @return string|false
 **/
TestDriver.prototype._getContents = function(pth) {
	return Q.resolve(pth);
}

/**
 * Write a string to a file
 *
 * @param  string  $path     file path
 * @param  string  $content  new file content
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._filePutContents = function(pth, content) {
    Q.resolve();
}

/**
 * Detect available archivers
 *
 * @return void
 **/
TestDriver.prototype._checkArchivers = function() {
	var arcs = {
        'create': {},
        'extract': {}
	};

    this.archivers = arcs;
    return Q.resolve();
}

/**
 * Unpack archive
 *
 * @param  string  $path  archive path
 * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
 **/
TestDriver.prototype._unpack = function(pth, arc) {
    return Q.resolve();
}

/**
 * Recursive symlinks search
 *
 * @param  string  $path  file/dir path
 * @return bool
 * @author Dmitry (dio) Levashov
 **/
TestDriver.prototype._findSymlinks = function(pth) {
    return Q.resolve();
}

/**
 * Extract files from archive
 *
 * @param  string  $path  archive path
 * @param  array   $arc   archiver command and arguments (same as in $this->archivers)
 * @return true
 **/
TestDriver.prototype._extract = function(pth, arc) {
    return Q.resolve();
}

/**
 * Create archive and return its path
 *
 * @param  string  $dir    target dir
 * @param  array   $files  files names list
 * @param  string  $name   archive name
 * @param  array   $arc    archiver options
 * @return string|bool
 **/
TestDriver.prototype._archive = function(dir, files, name, arc) {
    var path = dir+pathLib.sep+name;
    return Q.resolve(path);
}

module.exports = TestDriver;