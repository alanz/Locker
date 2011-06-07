/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    sys = require('sys'),
    url = require('url'),
    https = require('https'),
    http = require('http'),
    spawn = require('child_process').spawn;

/**
 * Appends an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.appendObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf-8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Writes an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.writeObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'encoding': 'utf-8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Reads an array of objects as lined-delimited JSON from the file at the specified path
 */
exports.readObjectsFromFile = function(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i])
                items.push(JSON.parse(itemStrings[i]));
        }
        callback(items);
    });
    stream.on('error', function(err) {
        callback([]);
    });
}

/**
 * Reads an array of objects as lined-delimited JSON from the file at the specified path
 */
exports.readObjectFromFile = function(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var item = {};
        try {
            item = JSON.parse(data);
        } catch(err) {
        }
        callback(item);
    });
    stream.on('error', function(err) {
        callback({});
    });
}

exports.writeObjectToFile = function(path, object) {
    fs.writeFileSync(path, JSON.stringify(object));
}

/**
 * Writes the me object to the me file (me.json)
 */
exports.syncMeData = function(metadata) {
    fs.writeFileSync('me.json', JSON.stringify(metadata)); // write this back to locker service?
}

/**
 * Reads the metadata file (meta.json) from the specified account, or the first one found
 * if no account is specified
 */
exports.loadMeData = function() {
    try {
        return JSON.parse(fs.readFileSync('me.json'));
    } catch(err) {
        return {};
    }
}

function getFile(requestURL, filename) {
    var port = (url.parse(requestURL).protocol == 'http:') ? 80 : 443;
    var host = url.parse(requestURL).hostname;
    var client;
    if(port == 80) 
        client = http;
    else 
        client = https;
    var request = https.get({ host: host, path: url.parse(requestURL).pathname }, function(res) {
        var downloadfile = fs.createWriteStream(filename, {'flags': 'a'});
        res.setEncoding('binary');
        res.on('data', function (chunk) {
            downloadfile.write(chunk, encoding='binary');
        });
        res.on('end', function() {
            downloadfile.end();
        });
    })    .on('error', function(error) {
            console.log('errorrs!!! '+requestURL);
        });;
}

function curlFile(url, filename, callback) {
    if(!url || !filename) {
        callback(new Error);
        return;
    }
    var curl = spawn('curl', [url, '-o', filename, '-L']);
    if(callback) {
        curl.on('exit', function() {
            callback();
        });
    }
}

exports.curlFile = function(url, filename, callback) {
    curlFile(url, filename, callback);
}

exports.writeContentsOfURLToFile = function(url, filename, retryCount, encoding, callback) {
//    curlFile(url, filename);
    getFile(url, filename);
}

/**
 * Lists the subdirectories at the specified path
 */
function listSubdirectories(path) {
    var files = fs.readdirSync(path);
    var dirs = [];
    for(i in files) {    
        var fullPath = path + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(!stats.isDirectory())
            continue;
        dirs.push(files[i]);
    }
    return dirs;
}