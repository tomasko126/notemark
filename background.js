// Main logic of Notemark extension

"use strict";

var getCurrentTabInfo = function(callback) {
    chrome.tabs.query({active: true}, function(info) {
        callback(info);
    });
}
