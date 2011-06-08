var log = function(msg) { if (console && console.log) console.debug(msg); }

var baseURL = 'http://localhost:8042/query';
var data = {};

// used in reload
var sort = {};
var start = 0, end = 100, currentSort;

// divClicked
var showing = {};

/**
 * Pulls contacts from Locker API
 * skip - offset number
 * limit - limit used (unused)
 * callback
 */
function getContacts(skip, limit, callback) {
    log(baseURL + '/getContact'); 
    $.getJSON(baseURL + '/getContact', {offset:skip, limit:100}, callback);
}

/**
 * Adds a Row to the contactsTable.
 * contact
 */
function addRow(contact) {
    log('adding contact:', contact);
    data[contact._id] = contact;
    var contactsTable = $("#table #contacts");
    contactsTable.append('<div id="' + contact._id + '" class="contact"><span class="basic-data"></span></div>');
    var theNewDiv = $("#table #contacts #" + contact._id);
    var theDiv = theNewDiv.find('.basic-data');
    theDiv.click(function() {
        divClicked(contact._id);
    });
    addPhoto(theNewDiv, contact);
    addName(theDiv, contact);
    addEmail(theDiv, contact);
    addTwitter(theDiv, contact);
    // addLinkedIn(theDiv, contact);
    // addGitHub(theDiv, contact);
    contactsTable.append('<br>');
}

/**
 * Adds a photo or silhouette to the div
 * div - $(HTMLElement) to append to
 * contact - contact obj
 */
function addPhoto(div, contact) {
    var image_url = getPhotoUrl(contact);
    if(image_url)
        div.append('<span class="column photo"><img src="' + image_url + '"></span>');
    else
        div.append('<span class="column photo"><img src="img/silhouette.png"></span>');
}

/**
 * Get the URL for a contact 
 * contact - contact obj
 * fullsize - does nothing
 */
function getPhotoUrl(contact, fullsize) {
    if(contact.photos && contact.photos.length)
        return contact.photos[0];
    return 'img/silhouette.png';
}

/** 
 * add the person's name to a div
 * div - $(HTMLElement) to append to
 * contact - contact obj
 */
function addName(div, contact) {
    div.append('<span class="column name">' + (contact.name || '') + '</span>');
}

/**
 * Add the person's email to a div
 * div - $(HTMLElement)
 * contact - contact obj
 */
function addEmail(div, contact) {
    var email;
    if(contact.emails && contact.emails.length)
        email = contact.emails[0].value;
    div.append('<span class="column email">' + (email || '&nbsp;') + '</span>');
}

/**
 * Add the person's twitter username to a div
 * div - $(HTMLElement)
 * contact - contact obj
 */
function addTwitter(div, contact) {
    var twitterUsername;
    if(contact.accounts.twitter && contact.accounts.twitter[0].data 
        && contact.accounts.twitter[0].data.screen_name)
        twitterUsername = contact.accounts.twitter[0].data.screen_name;
    
    if(twitterUsername) {
        div.append('<span class="column twitter">' +
                         '<a target="_blank" href="https://twitter.com/' + twitterUsername + '">@' 
                         + twitterUsername + '</a></span>');
    } else
        div.append('<span class="column twitter"></span>');
}

/**
 * Add the person's facebook details to a div
 * div
 * contact 
 */
function addFacebook(div, contact) {
    var facebookUsername;
    if(contact.accounts.twitter && contact.accounts.twitter[0].data 
        && contact.accounts.twitter[0].data.screen_name)
        twitterUsername = contact.accounts.twitter[0].data.screen_name;
    
    if(twitterUsername) {
        div.append('<span class="column twitter">' +
                         '<a target="_blank" href="https://twitter.com/' + twitterUsername + '">@' 
                         + twitterUsername + '</a></span>');
    } else
        div.append('<span class="column twitter"></span>');
}

/**
 * get the location of a contact 
 * contact - contact obj
 */
function getLocation(contact) {
    if(contact.addresses && contact.addresses) {
        for(var i in contact.addresses) {
            if(contact.addresses[i].type === 'location')
                return contact.addresses[i].value;
        }
    }
    return '';
}

/**
 * Reload the display (get contacts, render them)
 * sortField
 * _start
 * _end
 * callback
 */
function reload(sortField, _start, _end, callback) {
    var usedSortField = getSort(sortField);
    log(usedSortField);
    log('_start _end:', _start, _end);
    start = _start || 0; end = _end || 100;
    var queryText = $('#query-text').val();
    var getContactsCB = function(contacts) {
	log('contacts',contacts);
        var contactsTable = $("#table #contacts");
        if(start == 0 || sortField) {
            showing = {};
            contactsTable.html('');
        }
        for(var i in contacts)
            addRow(contacts[i]);
        if(callback) callback();
    };
    getContacts(start, end - start, getContactsCB);
}

/**
 * Get the sort info 
 * sortField 
 **/
function getSort(sortField) {
    if(sortField) {
        var direction = 'asc';
        if(sort[sortField]) {
            if(sort[sortField] == 'asc') 
                direction = 'desc';
            else
                direction = 'asc';
        }
        sort[sortField] = direction;
        currentSort = [sortField, direction];
    }
    return currentSort;
}

/**
 * Load more users to the list. TODO: Add magic
 * callback - function
 */
function loadMore(callback) {
    log('loading maaawr!!!');
    start = end;
    end += 100;
    reload(null, start, end, function() {
        if(callback) callback();
    });
}

/**
 * Div Clicked 
 * id 
 **/
function divClicked(id) {
    log(id);
    if(showing[id] === undefined) {
        var div = $("#table #contacts #" + id);
        div.append('<div class="more_info"></div>');
        var newDiv = $("#table #contacts #" + id + " .more_info");
        getMoreDiv(newDiv, data[id]);
        showing[id] = true;
    } else if(showing[id] === true) {
        var div = $("#table #contacts #" + id + " .more_info");
        div.hide();
        showing[id] = false;
    } else { //showing[id] === false
        var div = $("#table #contacts #" + id + " .more_info");
        div.show();
        showing[id] = true;
    }

}

/**
 * Get More Div
 * newDiv - 
 * contact - 
 **/
var moreDiv = '<div.'
function getMoreDiv(newDiv, contact) {
    var text = $("#more_blank").html();
    newDiv.addClass('more_info').append(text);
    newDiv.find('.pic').html('<img src=\'' + getPhotoUrl(contact, true) + '\'>');
    newDiv.find('.name_and_loc .realname').html(contact.name);
    newDiv.find('.name_and_loc .location').html(getLocation(contact));
    
    if(contact.accounts.twitter)
        addTwitterDetails(newDiv, contact.accounts.twitter[0]);
    if(contact.accounts.facebook)
        addFacebookDetails(newDiv, contact.accounts.facebook[0]);    
    if(contact.accounts.foursquare)
        addFoursquareDetails(newDiv, contact.accounts.foursquare[0]);
}

/**
 * Add Twitter Details
 * newDiv - 
 * twitter
 */
function addTwitterDetails(newDiv, twitter) {
    log('twitter:', twitter);
    if(twitter && twitter.data) {
        newDiv.find('.twitter-details .username')
                 .append('<a target="_blank" href="https://twitter.com/' + twitter.data.screen_name + '">@' + twitter.data.screen_name + '</a>');
        newDiv.find('.twitter-details .followers').append(twitter.data.followers_count);
        newDiv.find('.twitter-details .following').append(twitter.data.friends_count);
        newDiv.find('.twitter-details .tagline').append(twitter.data.description);
        newDiv.find('.twitter-details').css({display:'block'});
    }
}

/**
 * Add Facebook Details
 * newDiv - 
 * fb - 
 */
function addFacebookDetails(newDiv, fb) {
    log('fb:', fb);
    var name = fb.data.name || (fb.data.first_name + ' ' + fb.data.last_name);
    if(fb && fb.data) {
        newDiv.find('.facebook-details .name')
                 .append('<a target="_blank" href="https://facebook.com/profile.php?id=' + fb.data.id + '">' + name + '</a>');
        newDiv.find('.facebook-details').css({display:'block'});
    }
}

/**
 * Add Foursquare Details
 * newDiv - 
 * foursquare - 
 */
function addFoursquareDetails(newDiv, foursquare) {
    log('foursquare:', foursquare);
    var name = foursquare.data.name || (foursquare.data.firstName + ' ' + foursquare.data.lastName);
    log('foursquare.name:', name);
    if(foursquare && foursquare.data) {
        newDiv.find('.foursquare-details .name')
                 .append('<a target="_blank" href="https://foursquare.com/user/' + foursquare.data.id + '">' + name + '</a>');
        newDiv.find('.foursquare-details .checkins').append(foursquare.data.checkins.count);
        newDiv.find('.foursquare-details .mayorships').append(foursquare.data.mayorships.count);
        newDiv.find('.foursquare-details').css({display:'block'});
    }
}

/** 
 * Show Full
 * id - 
 */
function showFull(id) {
    log(id);
    var div = $("#table #contacts #" + id);
    div.css({'height':'400px'});
    div.append('<div>' + JSON.stringify(data[id]) + '</div>');
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    console.debug("dom ready");
    reload('dates.rapportive.engaged', start, end);
    $('#query-text').keyup(function(key) {
        if(key.keyCode == 13)
            reload();
    });
});
