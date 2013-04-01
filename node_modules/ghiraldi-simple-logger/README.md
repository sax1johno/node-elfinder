simple-logger
=============

A simple logging utility that uses event emitters to extend and customize log responses.

#Install
    npm install ghiraldi-simple-logger

#Basic Usage
The basic SimpleLogger usage is the following:
    var logger = require('ghiraldi-simple-logger');
    
    logger.log(<loglevel>, message)
    
SimpleLogger defines log levels to determine when a log should be shown (or, more accurately, when a log event is fired).  The default is the 'debug' log level, and it can be changed by doing the following:
    logger.loglevel = <loglevel>

Log levels are defined in the SimpleLogger along with a 'level of priority', with 0 being the highest priority level. 
    LOGLEVELS = {
        'fatal': 0,
        'error': 100,
        'warning': 200,
        'debug': 300,
        'info': 400,
        'trace': 500
    };
 
If the loglevel is set to less than a log level, then log events at that level won't be shown.  For example, if the log level is set to "debug" and a `logger.log('info', message)` is encountered, the log will not display.

While you can overwrite these with your own loglevels, you are encouraged to add loglevels to the loglevels array rather than overwriting them.  For example, the following would create a new loglevel between "error" and "warning", which
means it will be triggered when the loglevel is set to "warning", but not if it's set to "error".
    logger.LOGLEVELS.myCustomLogLevel = 150

You can use the same logger from multiple modules in your application, so setting the loglevel once or adding a loglevel will persist throughout your application.

#Advanced Usage
Under the hood, the SimpleLogger triggers and uses events to determine logging activities and to generate the log message.  By default, a single event called 'log' is triggered whenever a log with the appropriate loglevel is fired.

You can add additional logging functions by adding your own listener.  This is helpful if you want to write logs to a file in addition to writing to the terminal.
    logger.on('log', function(level, message) {
        // level is the log level text and message is the message to be displayed.
        // NOTE: The log event still obeys loglevels in your function, so no need to check for the levels here.
        writeToFile("this is my custom logger with level " + level + " and message " + message);
    }

Or you can disable logging entirely by removing all listeners from the log event.
    logger.removeAllListeners('log');
    
You can also listen to specific loglevel events
    logger.on('error', function(message) {
        // this will only fire when an error log occurs.
    }
    
    logger.on('debug', function(message) {
        // this will only fire when a debug log occurs.
    }

#Using Simple Logger in a module
If you're using Simple Logger in a module you plan on publishing, you should create your own logger that extends SimpleLogger to avoid any collisions with changes made to SimpleLogger in other modules.

#I'm on Cloud9!
Join my public development workspace for this project at http://c9.io/sax1johno/simple-logger

#COPYRIGHT AND LICENSE
Copyright (C) 2012, John O'Connor

This project is licensed under the Mozilla Public License (MPL) Version 2.0, found in the LICENSE file or at http://mozilla.org/MPL/2.0/.
