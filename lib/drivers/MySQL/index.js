/**
 * The volume driver for the MySQL data storage backend.
 **/
 
/** Variables that are global to this module. **/
var opts;

// Default options specific to this driver.
opts = {
    'driver': 'MySQL',
    'host': 'localhost',
    'socket': '/tmp/mysql.sock',
    'user': 'eluser',
    'pass': 'elpass',
    'db': 'elfinder',
    'files_table': 'elfinder_file',
    'path': 1,
    'tmpPath': '/tmp'
};