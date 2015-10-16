// Main Sites object, which includes methods for adding/removing site etc.
var Sites = {
    _items: 0,
    _createSiteUI: function(title, faviconUrl, url, custom) {
        var top = custom ? -45 : -1;
        $(".deck").prepend(
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
            $("[data-id='" + this._items.toString() + "']").animate({ marginTop: "-1px" }, { duration: 300, easing: "easeOutExpo"});
        }
    },
    init: function() {
        var self = this;
        chrome.storage.local.get(null, function(storage) {
            var sites = storage.sites;
            var openInNewTab = storage && storage.settings && storage.settings.openInNewTab;

            // A new installation, open new tabs in current window
            if (openInNewTab === undefined) {
                chrome.storage.local.set({ settings: { openInNewTab: true } });
            }

            // Add existing notes to deck
            for (var site of sites) {
                self._items++;
                self._createSiteUI(site.title, site.faviconUrl, site.url);
            }

            // Initialize click handlers
            self.initClickHandlers();

            // Update icon
            self.updateIconState();

            // Update number of saved notes
            self.updateFooterText();

            // Update "Open in new tab" checkbox
            self.updateCheckBox();
        });
    },
    initClickHandlers: function() {
        var self = this;
        // "Heart" button click event
        $("#addbtn").unbind().click(function() {
            // Get info about current tab
            self.getCurrentTabInfo(function(info) {
                var tab = info[0];
                // Add or remove a note?
                if ($("#addbtn").hasClass("heart-red")) {
                    var elem = self.getElement(tab.url);
                    self.removeSite(tab.url, elem);
                } else {
                    self.addSite(tab);
                }
            });
        });

        // Settings icon click event
        $(".settingsicon").unbind().click(function() {
            $(".settings").slideToggle({ duration: 250, easing: "easeOutExpo"});
        });

        // "Open in new tab" checkbox
        $("#checkboxoption").unbind().click(function() {
            var checked = $(".checkboxicon").hasClass("enabled");
            chrome.storage.local.set({ settings: { openInNewTab: !checked } }, function() {
                self.updateCheckBox();
            });
        });

        // Add current tabs to notes
        $("#addnotesoption").unbind().click(function() {
            chrome.tabs.query({ currentWindow: true }, function(tabs) {
                for (var tab of tabs) {
                    self.addSite(tab);
                }
            });
        });

        // Open all notes
        $("#opennotesoption").unbind().click(function() {
            var sites = $(".sitetitle");
            if (!sites) {
                return;
            }
            var checked = $(".checkboxicon").hasClass("enabled");
            for (var i=0; i<sites.length; i++) {
                var url = $(sites[i]).data().href;
                if (checked) {
                    chrome.tabs.create({ url: url });
                } else {
                    chrome.windows.create({ url: url, focused: true });
                }
            }
        });

        // Site title click event
        $(".sitetitle").unbind().click(function(event) {
            var url = event.target.dataset.href;
            var checked = $(".checkboxicon").hasClass("enabled");
            if (checked) {
                chrome.tabs.create({ url: url });
            } else {
                chrome.windows.create({ url: url, focused: true });
            }
        });

        // Remove button click event
        $(".removebtn").unbind().click(function(event) {
          var elem = event.currentTarget.parentElement.parentElement;
          var url = event.currentTarget.parentElement.nextSibling.dataset.href;
          self.removeSite(url, elem);
        });
    },
    addSite: function(tab) {
        var self = this;
        this.checkSite(tab.url, function(allowed) {
            if (!allowed) {
                return;
            }
            self._items++;
            // Get a favicon properly
            if (!tab.favIconUrl || tab.favIconUrl.indexOf("chrome://theme") > -1) {
                tab.favIconUrl = chrome.runtime.getURL("../img/favicon.png");
            }
            self._createSiteUI(tab.title, tab.favIconUrl, tab.url, true);
            chrome.storage.local.get("sites", function(storage) {
                var storage = storage["sites"];
                var site = { title: tab.title, faviconUrl: tab.favIconUrl, url: tab.url };
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
                $(".deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});
            });
        });
    },
    checkSite: function(url, callback) {
        // URL may be undefined in some cases, GH #16
        if (url === undefined) {
            callback(false);
            return;
        }
        var sites = $(".sitetitle");
        if (!sites) {
            callback(false);
            return;
        }
        var allowed = true;
        for (var i=0; i<sites.length; i++) {
            var siteUrl = $(sites[i]).data().href;
            if (siteUrl === url) {
                allowed = false;
                break;
            }
        }
        callback(allowed);
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

                // When removal animation ends, add top up animation
                // TODO: Don't use setTimeout, switch to jQuery/CSS animations
                setTimeout(function() {
                    $(elem).addClass("removenote2");
                    var id = $(elem).data().id;
                    $("[data-id='" + id + "'] > .sitetitle").css("margin", "0px");
                }, 400);

                // Remove a note after end of both animations
                setTimeout(function() {
                   $(elem).remove();
                   self.updateFooterText();
                   self.updateIconState();
                }, 600);
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
    updateCheckBox: function() {
        chrome.storage.local.get("settings", function(data) {
            var openInNewTab = data.settings.openInNewTab;
            if (openInNewTab) {
                $(".checkboxicon").css("background-position", "0px -23px").addClass("enabled").removeClass("disabled");
            } else {
                $(".checkboxicon").css("background-position", "0px 0px").addClass("disabled").removeClass("enabled");
            }
        });
    },
    updateIconState: function() {
        var self = this;
        self.getCurrentTabInfo(function(info) {
            var tab = info[0];
            var url = tab.url;
            self.checkSite(url, function(allowed) {
                // If site has already been added
                if (!allowed) {
                    $("#addbtn").addClass("heart-red");
                    $("#addbtn").mouseleave(function() {
                        $(this).addClass("heart-red");
                    });
                // If site hasn't been added yet
                } else {
                    $("#addbtn").removeClass("heart-red");
                    $("#addbtn").mouseleave(function() {
                        $(this).removeClass("heart-red");
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
            text = "that's kind of Zen";
        } else if (items < 6) {
            text = "the magic number";
        } else if (items < 12) {
            text = "you can do more with less";
        } else if (items < 22) {
            text = "starting to look like work";
        } else if (items < 28) {
            text = "they're all important yeah?";
        } else if (items < 44) {
            text = "eeny meeny miney mo";
        } else if (items < 50) {
            text = "bookmark some for keepsake";
        } else if (items < 60) {
            text = "still checking these?";
        } else if (items < 70) {
            text = "that's 3 hours of browsing";
        } else if (items < 90) {
            text = "let's see, where were we?";
        } else {
            text = "Notemark loves you back";
        }

        var notetext = " notes";
        if (items === 1) {
           notetext = " note";
        }

        $(".footnote").text(items + notetext + " \u2014 " + text);
    }
};

// Initialize Notemark
Sites.init();
