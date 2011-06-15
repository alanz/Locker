/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

//just a place for lockerd.js to populate config info
var fs = require('fs');

exports.lockerHost = 'localhost';
exports.lockerPort = 8042;
setLockerBase();
exports.lockerDir = process.cwd();

exports.load = function(filepath) {
    var config = JSON.parse(fs.readFileSync(filepath));
    exports.lockerHost = config.lockerHost || "localhost";
    exports.lockerPort = config.lockerPort || 8042;
    setLockerBase();
    exports.scannedDirs = config.scannedDirs;
    exports.displayUnstable = config.displayUnstable;
    exports.mongo = config.mongo;
    exports.me = config.me;
    exports.lockerDir = process.cwd();
}

function setLockerBase() {
    exports.lockerBase = 'http://' + exports.lockerHost + 
                         (exports.lockerPort && exports.lockerPort != 80 ? ':' + exports.lockerPort : '');
}
