var BG = chrome.extension.getBackgroundPage();

var Sites = {
    _items: 0,
    _createSiteUI: function(title, faviconUrl, url) {
        $(".options").after(
            "<div class='site' data-id='" + this._items + "'>" +
                "<div class='add'>" +
                    "<img class='favicon' src='" + faviconUrl + "'>" +
                    "<div class='removebtn'>" + "</div>" +
                "</div>" +
                "<div class='sitetitle' data-href='" + url + "' title='" + title + "'>" + title + "</div>" +
                "<div class='siteoptions'>" +
                    "<div class='siteoptionleft'></div>" + 
                    "<div class='siteoptionright'></div>" +
                "</div>" +
            "</div>"
        );
    },
    init: function() {
        var self = this;
        chrome.storage.local.get("sites", function(storage) {
            var sites = storage["sites"];

            for (var site in sites) {
                self._items++;
                var details = sites[site];
                self._createSiteUI(details.title, details.faviconUrl, details.url);
            }

            // Initialize click handlers
            self.initClickHandlers();

            self.getCurrentTabInfo(function(info) {
                var tab = info[0];
                var url = tab.url;
                self.checkSite(url, function(allowed) {
                    if (allowed) {
                        $("#addbtn").addClass("hearticon-gray");
                        $("#addbtn").mouseover(function() {
                            $(this).removeClass("hearticon-gray");
                        });
                        $("#addbtn").mouseleave(function() {
                            $(this).addClass("hearticon-gray");
                        });
                    }
                });
            });
        });
    },
    initClickHandlers: function() {
        var self = this;
        // "Heart" button click event
        var addbtn = document.getElementById("addbtn");
        addbtn.addEventListener("click", function() {
            // Get info about current tab
            self.getCurrentTabInfo(function(info) {
                var tab = info[0];
                var title = tab.title;
                var faviconUrl = null;
                // Chrome throws an error, when bookmarking chrome://extensions
                if (tab.favIconUrl.indexOf("chrome://theme") > -1) {
                    faviconUrl = chrome.runtime.getURL("/img/favicon.png");
                } else {
                    faviconUrl = tab.favIconUrl;
                }
                var url = tab.url;
                self.addSite(title, faviconUrl, url);
            });
        }, true);
        
        // Site title click event
        $(".sitetitle").click(function(event) {
            var url = event.target.dataset.href;
            chrome.tabs.create({ url:url });
        });
        /* DISABLE site click EXPANDSION //////////
        $(".site").click(function(event) {
            if ($(this).height() === 75) {
                $(this).css("height", "40px");
            } else {
                $(this).css("height", "75px");
            }
            //console.log($(this).height());
            
        }); */////////////////////////////////
    },
    addSite: function(title, faviconUrl, url) {
        var self = this;
        this.checkSite(url, function(allowed) {
            if (!allowed) {
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

        /* $("somethingsomething").click(function() {    
     $(this).animate({ site': "-=260px" }, "fast" );
     }
     if (blabla)==250px" {
     // remove item from arraw, poof.
     // http://goo.gl/1TsYO3 <-- removing item tutorial
     }
    });
        */
    },

    getCurrentTabInfo: function(callback) {
        chrome.tabs.query({active: true}, function(info) {
            callback(info);
        });
    },
}

Sites.init();