/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");
var events = require("events");
var fs = require("fs");
var path = require("path");
var locker = require("../Common/node/locker.js");
var lconfig = require("../Common/node/lconfig.js");
var levents = require('../Common/node/levents.js');
var request = require('request');
var testUtils = require('./test-utils');

lconfig.load("Config/config.json");

vows.describe("Locker Client API").addBatch({
    "Initialization" : {
        "sets the base service URL" : function() {
            var baseURL = lconfig.lockerBase;
            locker.initClient({workingDirectory:lconfig.me + "/testURLCallback", lockerUrl:"test"});
            locker.initClient({workingDirectory:lconfig.me + "/testURLCallback", lockerUrl:baseURL});
        }
    }
}).addBatch({
    "Public APIs" : {
        "making a call to locker.map" : {
            topic: function() {
                locker.map(this.callback);
            },
            "retrieves the service map" : function (err, data) {
                assert.isNull(err);
                assert.include(data, "installed");
                assert.include(data, "available");
            }
        },
        "getting providers of type testtype/testproviders " : {
            topic: function() {
                locker.providers("testtype/testproviders", this.callback);
            },
            "returns 1 valid service" : function (err, data) {
                assert.isNull(err);
                assert.include(data[0], "title");
                assert.include(data[0], "provides");
                assert.include(data[0], "srcdir");
                assert.include(data[0], "is");
                assert.include(data[0], "id");
                assert.equal(data[0].title, 'Test /providers');
            }
        },
        "getting providers of type badtype/badsvc " : {
            topic: function() {
                locker.providers("badtype/badsvc", this.callback);
            },
            "returns an empty array" : function (err, data) {
                assert.isNull(err);
                assert.length(data, 0);
            }
        },
        "getting providers of types testtype/testproviders,testtype/anotherprovider" : {
            topic: function() {
                locker.providers("testtype/testproviders,testtype/anotherprovider", this.callback);
            },
            "returns an array of 2 valid providers" : function (err, data) {
                assert.isNull(err);
                assert.length(data, 2);

                for(var i in data) {
                    if (data.hasOwnProperty(i)) {
                        assert.include(data[i], "title");
                        assert.include(data[i], "provides");
                        assert.include(data[i], "srcdir");
                        assert.include(data[i], "is");
                        assert.include(data[i], "id");
                    }
                }

                if (data[0].title === 'Test /providers') {
                    assert.equal(data[0].title, "Test /providers");
                    assert.equal(data[1].title, "Test /providers 2");
                } else {
                    assert.equal(data[1].title, "Test /providers");
                    assert.equal(data[0].title, "Test /providers 2");
                }
            }
        },
        "getting providers of types testtype " : {
            topic: function() {
                locker.providers("testtype", this.callback);
            },
            "returns an array of 2 valid providers" : function (err, data) {
                assert.isNull(err);
                assert.length(data, 2);

                for(var i in data) {
                    if (data.hasOwnProperty(i)) {
                        assert.include(data[i], "title");
                        assert.include(data[i], "provides");
                        assert.include(data[i], "srcdir");
                        assert.include(data[i], "is");
                        assert.include(data[i], "id");
                    }
                }

                if (data[0].title === 'Test /providers') {
                    assert.equal(data[0].title, "Test /providers");
                    assert.equal(data[1].title, "Test /providers 2");
                } else {
                    assert.equal(data[1].title, "Test /providers");
                    assert.equal(data[0].title, "Test /providers 2");
                }
            }
        }
    }
}).addBatch({
    "Service APIs" : {
        "scheduler" : {
            topic:function() {
                var promise = new events.EventEmitter();
                var fired = false;
                try {
                    path.exists(lconfig.me + "/testURLCallback/result.json", function (exists) {
                        if (exists) {
                            fs.unlinkSync(lconfig.me + "/testURLCallback/result.json");
                        }
                    });
                } catch (E) {
                    // Make sure it's file not found and throw others
                }
                locker.at("/write", 1);
                setTimeout(function() {
                    fs.stat(lconfig.me + "/testURLCallback/result.json", function(err, stats) {
                        if (!err)
                            promise.emit("success", true);
                        else
                            promise.emit("error", err);
                    });
                }, 1500);
                return promise;
            },
            "fires a scheduled callback":function(err, result) {
                assert.isNull(err);
                assert.isTrue(result);
            }
        }
    }
}).addBatch({
    "Global migrations" : {
        topic: JSON.parse(fs.readFileSync(path.join(lconfig.me, 'state.json'))),
        "update the version of the locker successfully" : function(topic) {
            assert.equal(topic.version, 1315435666981);
        },
        "are run successfully" : function(topic) {
            assert.equal(topic.migrated, true);
        }
   }
}).export(module);

