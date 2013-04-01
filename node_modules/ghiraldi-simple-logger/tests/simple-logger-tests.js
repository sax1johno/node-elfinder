var nodeunit = require('nodeunit');

exports.simpleLoggerTests = nodeunit.testCase({
    'testConstructor': function(test) {
        var simpleLogger = require('../lib/simple_logger');
        test.done();
    },
    'testLogging': function(test) {
        var simpleLogger = require('../lib/simple_logger');
        var testMessage = 'This is an error message';
        var textExit = false;
        
        simpleLogger.on('error', function(message) {
            test.equals(message, testMessage);
            test.done();
        });
        
        simpleLogger.log('error', testMessage);
    }
});