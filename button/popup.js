var BG = chrome.extension.getBackgroundPage();

var Sites = {
    _items: 0,
    _createSiteUI: function(title, faviconUrl, url, custom) {
        var top = custom ? -45 : -1;
        $(".options").after(
            "<div class='site' style='margin-top:" + top.toString() + "px;' data-id='" + this._items + "'>" +
                "<div class='faviconcontainer'>" +
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

        // Animate an added note
        if (custom) {
            $("[data-id='" + this._items.toString() + "']").animate({ marginTop: "-1px" }, 300);
        }
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

            // Update icon
            self.updateIconState();

            // Update number of saved notes
            self.updateFooterText();
        });
    },
    initClickHandlers: function() {
        var self = this;
        // "Heart" button click event
        $("#addbtn").unbind().click(function(event) {
            // Get info about current tab
            self.getCurrentTabInfo(function(info) {
                var tab = info[0];
                var title = tab.title;
                var faviconUrl = null;
                if (tab.favIconUrl) {
                    // Chrome throws an error, when bookmarking chrome://extensions
                    if (tab.favIconUrl.indexOf("chrome://theme") > -1) {
                        faviconUrl = chrome.runtime.getURL("/img/favicon.png");
                    } else {
                        faviconUrl = tab.favIconUrl;
                    }
                } else {
                    faviconUrl = chrome.runtime.getURL("/img/favicon.png");
                }
                var url = tab.url;
                // Add or remove a note?
                if ($("#addbtn").hasClass("hearticon-red")) {
                    var elem = self.getElement(url);
                    self.removeSite(url, elem);
                } else {
                    self.addSite(title, faviconUrl, url);
                }
            });
        });
        
        // Site title click event
        $(".sitetitle").unbind().click(function(event) {
            var url = event.target.dataset.href;
            chrome.tabs.create({ url:url });
        });

        // Remove button click event
        $(".removebtn").unbind().click(function() {
          var elem = event.currentTarget.parentElement.parentElement;
          var url = event.currentTarget.parentElement.nextSibling.dataset.href;
          self.removeSite(url, elem); 
        });

        /* DISABLE site click EXPANDSION
        $(".site").click(function(event) {
            if ($(this).height() === 75) {
                $(this).css("height", "40px");
            } else {
                $(this).css("height", "75px");
            }
            //console.log($(this).height());
            
        }); */
    },
    addSite: function(title, faviconUrl, url) {
        var self = this;
        this.checkSite(url, function(allowed) {
            if (!allowed) {
                return;
            }
            self._items++;
            self._createSiteUI(title, faviconUrl, url, true);
            chrome.storage.local.get("sites", function(storage) {
                var storage = storage["sites"];
                var site = { title: title, faviconUrl: faviconUrl, url: url };
                if (!storage) {
                    var arr = [];
                    arr.push(site);
                    chrome.storage.local.set({sites: arr});
                } else {
                    storage.push(site);
                    chrome.storage.local.set({sites: storage});
                }
                self.initClickHandlers();
                self.updateIconState();
                self.updateFooterText();

                // Scroll to the top to see latest note
                $(".deck").animate({ scrollTop: 0 }, 50); 
            });
        });
    },
    checkSite: function(url, callback) {
        // URL may be undefined in some cases, GH #16
        if (url === undefined) {
            callback(false);
            return;
        }
        chrome.storage.local.get("sites", function(storage) {
            var sites = storage["sites"];
            if (!sites) {
                callback(true);
                return;
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
    removeSite: function(url, elem) {
        var self = this;
        chrome.storage.local.get("sites", function(storage) {
            var sites = storage["sites"];
            for (var i=0; i<sites.length; i++) {
                if (sites[i].url === url) {
                    sites.splice(i, 1);
                    self._items--;
                    break;
                }
            }
            chrome.storage.local.set({sites: sites}, function() {
                // Begin removal animation
                $(elem).addClass("removenote");
                
                // Update icon
                self.updateIconState();

                // When removal animation ends, add top up animation
                // TODO: Don't use setTimeout, switch to jQuery/CSS animations
                setTimeout(function() {
                    $(elem).addClass("removenote2");
                    var id = $(elem).data().id;
                    $("[data-id='" + id + "'] > .sitetitle").css("margin", "0px");
                }, 500);

                // Remove a note after end of both animations
                setTimeout(function() {
                   $(elem).remove();
                   self.updateFooterText();
                }, 750);
            });
        });
    },
    getCurrentTabInfo: function(callback) {
        chrome.tabs.query({active: true}, function(info) {
            callback(info);
        });
    },
    getElement: function(url) {
        return $("[data-href='" + url + "']").parent();
    },
    updateIconState: function() {
        var self = this;
        self.getCurrentTabInfo(function(info) {
            var tab = info[0];
            var url = tab.url;
            self.checkSite(url, function(allowed) {
                // If site has already been added
                if (!allowed) {
                    $("#addbtn").addClass("hearticon-red");
                    $("#addbtn").mouseleave(function() {
                        $(this).addClass("hearticon-red");
                    });
                // If site hasn't been added yet
                } else {
                    $("#addbtn").removeClass("hearticon-red");
                    $("#addbtn").mouseleave(function() {
                        $(this).removeClass("hearticon-red");
                    });
                }
            });
        });  
    },
    updateScrollbarState: function() {
        if (this._items < 9) {
            $(".deck").css("overflow-y", "hidden");
        } else {
            $(".deck").css("overflow-y", "auto");
        }
    },
    updateFooterText: function() {
        // Update scrollbar visibility
        this.updateScrollbarState();

        // Update footer text
        var items = this._items;
        var text = null;
        
        if (items < 3) {
            text = "that’s kind of Zen";
        } else if (items < 6) {
            text = "the magic number";
        } else if (items < 12) {
            text = "you can do more with less";
        } else if (items < 22) {
            text = "starting to look like work";
        } else if (items < 28) {
            text = "they're all important yeah?";
        } else if (items < 44) {
            text = "if it's important, it will stand out";
        } else if (items < 50) {
            text = "bookmark some for keep sake";
        } else if (items < 60) {
            text = "still checking these?";
        } else if (items < 70) {
            text = "that's 3 hours of browsing";   
        } else if (items < 90) {
            text = "let's see, where were we?";   
        } else {
            text = "Notemark loves you back";
        }

        $(".footnote").text(items + " notes \u2014 " + text);
    }
}

Sites.init();