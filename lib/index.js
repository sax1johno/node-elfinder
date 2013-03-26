/**
 * This connector is used to interface with the ElFinder file manager (elfinder.org).
 * @author John O'Connor
 **/

/** Requires for this class **/
var path = require('path');

/** Global variables for this module. **/
var opts, defaultRoot;

/** First, lets set up some default options. **/
opts = {
    'locale': 'en_US.UTF-8', /** Sets the user locale. **/
    'debug': false, /** Set to true to send debug to the client. **/
    'bind': '[]', /** Bind callbacks to certain commands **/
    'roots': [  /** A list of roots for each driver.  This is a required param. A default is provided **/
        defaultRoot
    ],
    
};

defaultRoot = {
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
