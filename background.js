"use strict";

// Add sites to storage
function addSites(tabs, callback) {
    chrome.storage.local.get("sites", function(storage) {
        let sites = storage["sites"] || [];
        for (let tab of tabs) {
            // Get a favicon properly
            if (!tab.favIconUrl || tab.favIconUrl.indexOf("chrome://theme") > -1) {
                tab.favIconUrl = chrome.runtime.getURL("/img/favicon.png");
            }
            let site = { title: tab.title, faviconUrl: tab.favIconUrl, url: tab.url, date: Date.now() };
            sites.push(site);
        }
        // Save modified |storage| object
        chrome.storage.local.set({sites}, function() {
            callback(Date.now());
        });
    });
}

// Open all saved sites
function openAllSites() {
    chrome.storage.local.get(null, function(storage) {
        let sites = storage["sites"] || [];
        if (sites.length < 1) {
            return;
        }
        if (sites.length > 8) {
            let confirm = window.confirm("Would you like to open " + sites.length + " notes?");
            if (!confirm) {
                return;
            }
        }
        let checked = storage["settings"] && storage["settings"].openInNewTab;
        if (checked) {
            for (let site of sites) {
                chrome.tabs.create({ url: site.url });
            }
        } else {
            let urls = [];
            for (let site of sites) {
                urls.push(site.url);
            }
            chrome.windows.create({ url: urls });
        }
    });
}

// Remove site from storage
function removeSite(url, callback) {
    chrome.storage.local.get("sites", function(storage) {
        let sites = storage["sites"];
        if (!sites) {
            return;
        }
        for (let i=0; i<sites.length; i++) {
            if (sites[i].url === url) {
                sites.splice(i, 1);
                break;
            }
        }
        chrome.storage.local.set({sites: sites}, function() {
            callback();
        });
    });
}

// Get some info about current tab
function getCurrentTabInfo(callback) {
    chrome.tabs.query({active: true}, function(tab) {
        callback(tab);
    });
}

// Get difference between now and date of note creation
function getDifference(date) {
  let dateOfNote = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  // Date of note's creation can be NaN,
  // because we weren't saving dates in the past
  if (isNaN(dateOfNote)) {
      return "Sometime in the past";
  }

  let day = 1000 * 60 * 60 * 24;
  let now = Date.now();

  let result = Math.floor((now - dateOfNote) / day);
  if (result === 0) {
      return "Today";
  } else if (result === 1) {
      return "Yesterday";
  } else {
      return result + " days ago";
  }
}
