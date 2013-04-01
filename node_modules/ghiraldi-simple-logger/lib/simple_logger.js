var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter;

/**
 * SimpleLogger is a basic logging utility that uses events to let developers manage logging facilities.
 * By default, events are merely fired when the appropriate loglevels are encountered and provides a basic
 * console logger that can be used by the developer.  Logging functionality can be overridden by 
 * removing the listeners that are attached to this EventEmitter.
 * 
 * By default, a catchall logging event called 'log' provides a console message with the loglevel and message.
 * To disable the default catchall logger, remove the 'log' listener from this object using the following the following:
 * MyLog.removeListener('log');
 * 
 * You can also register for the "log" event if you want to be notified when a log is fired.
 **/
function SimpleLogger() {
        /* This class is a singleton */
    if (arguments.callee._singletonInstance) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
    
    EventEmitter.call(this);
    
    // First, some basic loglevels.  These can be overridden by the developer if desired.
    this.LOGLEVELS = {
        'fatal': 0,
        'error': 100,
        'warning': 200,
        'debug': 300,
        'info': 400,
        'trace': 500
    };
    
    // defaults to debug.
    this.loglevel = 'debug';
    
    this.getLogLevelValue = function() {
        return this.LOGLEVELS[this.loglevel];
    };
    
    this.log = function(level, message, fn) {
        var logNumber = this.LOGLEVELS[level];
        if (logNumber <= this.getLogLevelValue()) {
            this.emit('log', level, message);
            this.emit(level, message);
            if (!_.isUndefined(fn) && !_.isNull(fn)) {
                fn(message);
            }
        }
    };
    
    this.on('log', function(level, message) {
        console.log(level + ": " + message);
    })
}

SimpleLogger.prototype.__proto__ = EventEmitter.prototype;

module.exports = new SimpleLogger();