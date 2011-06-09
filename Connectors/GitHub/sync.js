/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request'),
    dataStore = require('../../Common/node/connector/dataStore'),
    shallowCompare = require('../../Common/node/shallowCompare'),
    app = require('../../Common/node/connector/api');
    EventEmitter = require('events').EventEmitter,
    GitHubApi = require("github").GitHubApi,
    utils = require('../../Common/node/connector/utils');
    github = new GitHubApi();

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theauth, mongoCollections) {
    auth = theauth;
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {following:[], followers:[], repos:[]}; }    
    dataStore.init("id", mongoCollections);
}

exports.syncRepos = function(callback) {
    var total = 0,
        added = 0,
        deleted = 0,
        modified = 0,
        newIDs = [],
        knownIDs = allKnownIDs["repos"];
        
    var parseRepo = function(data) {
        if (data && data.length) {
            js = data.splice(0, 1)[0];
            // this super sucks, but github doesn't give us an id for repos.  URL is the only thing unique
            //
            js.id = js.url
            dataStore.getCurrent("repos", js.id, function(err, resp) {
                if (resp === undefined) {
                    dataStore.addObject("repos", js, function(err) {
                        added++;
                        parseRepo(data);
                    });
                } else {
                    delete resp['_id'];
                    if (shallowCompare(js, resp)) {
                        parseRepo(data);
                    } else {
                        dataStore.addObject("repos", js, function(err) {
                            modified++;
                            parseRepo(data);
                        });                            
                    }
                }
            })                
        } else {
            if (deleted > 0) {
                return callback(null, 3600, "examined " + total + " repos, added " + added + " new repos, modified " + modified + " repos, and deleted " + deleted + " repos.");
            } else {
                return callback(null, 3600, "examined " + total + " repos, added " + added + " repos, and modified " + modified + " repos.");
            }
        }
    };

    github.getRepoApi().getUserRepos(auth.username, function(err, data) {
        if(!err) {
            total = data.length || 0;
            
            var knownIDs = data.map(function(item) {return item.url});
            var removedIDs = utils.checkDeletedIDs(allKnownIDs['repos'], knownIDs);
            deleted = removedIDs.length;
            
            allKnownIDs["repos"] = knownIDs;
            fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
            
            if(removedIDs.length > 0) {
                logRemoved("repos", removedIDs, function(err) {
                    parseRepo(data);
                });
            }
            else {
                parseRepo(data);
            }
        }
    });
}

exports.syncProfile = function(callback) {
    github.getUserApi().show(auth.username, function(err, user) {
        fs.writeFile('profile.json', JSON.stringify(user), function(err) {
            return callback(err, 3600, "finished updating " + auth.username + "'s profile.");
        });
    })
}

exports.syncUsers = function(friendsOrFollowers, callback) {
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'following';

    var processData = function(err, data) {
        var total = data.length,
            added = 0,
            deleted = 0,
            modified = 0;
        
        var processUser = function(data) {
            if (data && data.length) {
                js = data.splice(0, 1)[0];
                github.getUserApi().show(js, function(err, user) {
                    dataStore.getCurrent(friendsOrFollowers, user.id, function(err, resp) {
                        if (resp === undefined) {
                            dataStore.addObject(friendsOrFollowers, user, function(err) {
                                var eventObj = {source:friendsOrFollowers, type:'add', data:user};
                                exports.eventEmitter.emit('contact/github', eventObj);
                                added++;
                                processUser(data);
                            });
                        } else {
                            delete resp['_id'];
                            if (shallowCompare(user, resp)) {
                                processUser(data);
                            } else {
                                dataStore.addObject(friendsOrFollowers, user, function(err) {
                                    var eventObj = {source:friendsOrFollowers, type:'update', data:user};
                                    exports.eventEmitter.emit('contact/github', eventObj);
                                    modified++;
                                    processUser(data);
                                })
                            }
                        }
                    })
                });           
            } else {
                if (deleted > 0) {
                    return callback(err, 3600, "examined " + total + " users, added " + added + " new users, modified " + modified + " users, and removed " + deleted + " users.");
                } else {
                    return callback(err, 3600, "examined " + total + " users, added " + added + " new users, and modified " + modified + " users.");
                }
            }
        };
        
        var removedIDs = utils.checkDeletedIDs(allKnownIDs[friendsOrFollowers], data);
        deleted = removedIDs.length;
        allKnownIDs[friendsOrFollowers] = data.slice(0);
        
        if(removedIDs.length > 0) {
            logRemoved(friendsOrFollowers, removedIDs, function(err) {
                processUser(data);
            });
        }
        else {
            fs.writeFileSync('allKnownIDs.json', JSON.stringify(allKnownIDs));
            processUser(data);
        }
    }
    
    if (friendsOrFollowers === 'following') github.getUserApi().getFollowing(auth.username, function(err, data) {
        processData(err, data);
    });
    if (friendsOrFollowers === 'followers') github.getUserApi().getFollowers(auth.username, function(err, data) {
        processData(err, data);
    });
}

function logRemoved(type, ids, callback) {
    if(!ids || !ids.length) {
        fs.writeFileSync('allKnownIDs.json', JSON.stringify(allKnownIDs));
        callback();
        return;
    }
    var id = ids.shift();
    if (type !== 'repos') {
        github.getUserApi().show(id, function(err, user) {
            dataStore.removeObject(type, user.id, function(err) {
                delete allKnownIDs[type][allKnownIDs[type].indexOf(id)];
                logRemoved(type, ids, callback);
            });
        });
    } else {
        dataStore.removeObject(type, id+'', function(err) {
            var eventObj = {source:type, type:'delete', data:{id:id, deleted: true}};
            exports.eventEmitter.emit('contact/github', eventObj);
            delete allKnownIDs[type][allKnownIDs[type].indexOf(id)];
            logRemoved(type, ids, callback);
        });
    }
}