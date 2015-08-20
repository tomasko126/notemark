var BG = chrome.extension.getBackgroundPage();

var Sites = {
    _items: 0,
    _createSiteUI: function(title, faviconUrl, url) {
        $(".more").before(
            "<div class='site' data-id='" + this._items + "'>" +
                "<div class='add'>" +
                    "<img class='favicon' src='" + faviconUrl + "'>" +
                "</div>" +
                "<div class='sitetitle'>" + title + "</div>" +
            "</div>"
        );
    },
    init: function() {
        var self = this;
        chrome.storage.local.get("sites", function(storage) {
            var sites = storage["sites"];
            if (!sites) {
                return;
            }
            for (var site in sites) {
                self._items++;
                var details = sites[site];
                self._createSiteUI(details.title, details.faviconUrl, details.url);
            }
            BG.getCurrentTabInfo(function(info) {
                var tab = info[0];
                var url = tab.url;
                self.checkSite(url, function(allowed) {
                    if (allowed) {
                        $("#addbtn").addClass("icon-gray");
                        $("#addbtn").mouseover(function() {
                            $(this).removeClass("icon-gray");
                        });
                        $("#addbtn").mouseleave(function() {
                            $(this).addClass("icon-gray");
                        });
                    }
                });
            });
        });
    },
    addSite: function(title, faviconUrl, url) {
        var self = this;
        this.checkSite(url, function(allowed) {
            if (!allowed) {
                alert("You have already saved this page!");
                return;
            }
            self._items++;
            self._createSiteUI(title, faviconUrl, url);
            chrome.storage.local.get("sites", function(storage) {
                var storage = storage["sites"];
                var site = { title: title, faviconUrl: faviconUrl, url: url };
                if (!storage) {
                    var arr = [];
                    arr.push(site);
                    chrome.storage.local.set({sites: arr}, function() {});
                } else {
                    storage.push(site);
                    chrome.storage.local.set({sites: storage}, function() {});
                }
            });
        });
    },
    checkSite: function(url, callback) {
        chrome.storage.local.get("sites", function(storage) {
            var sites = storage["sites"];
            if (!sites) {
                callback(true);
            }
            var allowed = true;
            for (var site in sites) {
                var details = sites[site];
                if (details.url === url) {
                    allowed = false;
                    break;
                }
            }
            callback(allowed);
        });
    },
    removeSite: function(id) {

    },
    saveToStorage: function(args) {

    }
}

Sites.init();

// "Heart" button click event
var addbtn = document.getElementById("addbtn");
addbtn.addEventListener("click", function() {
    // Get info about current tab
    BG.getCurrentTabInfo(function(info) {
        var tab = info[0];
        var title = tab.title;
        var faviconUrl = tab.favIconUrl || chrome.runtime.getURL("/img/favicon.png");
        var url = tab.url;
        Sites.addSite(title, faviconUrl, url);
    });
}, true);