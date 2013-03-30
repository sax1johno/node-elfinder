/**
 * A set of utilities used throughout the elfinder connector.
 **/
var _       =   require('underscore'),
    path    =   require('path');
    
var Utils = function() {};

/** 
 * Create a hash of the path, which will be sent to the client.
 * Path hashes should be repeatable and decode-able by the client.
 * The also must have the ability to be an HTML ID, so base64 is used.
 **/
Utils.prototype.hashPath = function(path) {
    return Utils.encode(path);
}

/**
 * Encode a utf8 string in base64 ascii.
 **/
Utils.prototype.encode = function(str) {
    return btoa(unescape(encodeURIComponent( str )));
}

/**
 * Decodes a utf8 string from base64 ascii.
 **/
Utils.prototype.decode = function(str) {
    return decodeURIComponent(escape(atob( str )));    
}
