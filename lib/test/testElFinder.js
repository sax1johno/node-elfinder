var ElFinder = require('../index.js'),
    logger = require('ghiraldi-simple-logger');
    
var elFinder;
var testOpts = {
        roots: [
            {
                'driver': "Test"
            }
        ]
    };
exports.testBaseConstructor = function(test) {
    // Test ElFinder with default options.
    try {
        elFinder = new ElFinder();
        test.ok(true, "ElFinder no-opt constructor was successful");
    } catch(e) {
        test.ok(false, e.stack);
    }
    
    test.done();
}

exports.testOptConstructor = function(test) {
    try {
        elFinder = new ElFinder(testOpts);
        if (elFinder.getMountErrors()) {
            logger.log("debug", JSON.stringify(elFinder.getMountErrors()));
        }
        test.ok(true, "See debug for test opts.");
    } catch (e) {
        test.ok(false, e.stack);
    }
    test.done();
};

exports.testOpen = function(test) {
    test.done();
}

exports.testLs = function(test) {
    elFinder = new ElFinder(testOpts);
    elFinder.ls(function(files) {
        console.log("Files = " + JSON.stringify(files));
        test.ok(true, "ls command works.");
        test.done();
    }, function(err) {
        test.ok(false, err);
        test.done();
    });
}

exports.testTree = function(test) {
    test.done();
}

exports.testParents = function(test) {
    test.done();
}

exports.testTmb = function(test) {
    test.done();
}

exports.testFile = function(test) {
    test.done();
}

exports.testSize = function(test) {
    test.done();
}

exports.testMkdir = function(test) {
    test.done();
}

exports.testMkfile = function(test) {
    test.done();
}
    
exports.testRm = function(test) {
    test.done();
}

exports.testRename = function(test) {
    test.done();
}
    
exports.testDuplicate = function(test) {
    test.done();
}
    
exports.testPaste = function(test) {
    test.done();
}

exports.testUpload = function(test) {
    test.done();
}

exports.testGet = function(test) {
    test.done();
}
    
exports.testPut = function(test) {
    test.done();
}
    
exports.testArchive = function(test) {
    test.done();
}
    
exports.testExtract = function(test) {
    test.done();
}
    
exports.testSearch = function(test) {
    test.done();
}
    
exports.testInfo = function(test) {
    test.done();
}
    
exports.testDim = function(test) {
    test.done();
}
    
exports.testResize = function(test) {
    test.done();
}
    
exports.testNetmount = function(test) {
    test.done();
}
