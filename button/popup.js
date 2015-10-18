"use strict";

var BG = chrome.extension.getBackgroundPage();

// Main Sites object, which includes methods for adding/removing site etc.
var Sites = {
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
            $("[data-id='" + BG.items + "']").animate({ marginTop: "-1px" }, { duration: 300, easing: "easeOutExpo"});
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
            if (sites) {
                for (let site of sites) {
                    self._createSiteUI(site.title, site.faviconUrl, site.url);
                }
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
            BG.getCurrentTabInfo(function(info) {
                var tab = info[0];
                // Add or remove a note?
                if ($("#addbtn").hasClass("heart-red")) {
                    var elem = self.getElement(tab.url);
                    BG.removeSite(tab.url, function() {
                        // TODO: Move to extension's popup in callback
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
                } else {
                    BG.addSite(tab, function() {
                        console.log("callback");
                        self._createSiteUI(tab.title, tab.favIconUrl, tab.url, true);
                        // Call handlers
                        self.initClickHandlers();
                        self.updateIconState();
                        self.updateFooterText();

                        // Scroll to the top to see latest note
                        $(".deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});
                    });
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
                for (let tab of tabs) {
                    BG.addSite(tab, function() {
                        self._createSiteUI(tab.title, tab.favIconUrl, tab.url, true);
                        // Call handlers
                        self.initClickHandlers();
                        self.updateIconState();
                        self.updateFooterText();

                        // Scroll to the top to see latest note
                        $(".deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});
                    });
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
            for (let i=0; i<sites.length; i++) {
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
                chrome.tabs.query({ active: true }, function(tabs) {
                    var tab = tabs[0];
                    chrome.tabs.update(tab.id, { url: url });
                    // Extension's popup doesn't automatically close,
                    // so close it manually
                    window.close();
                });
            }
        });

        // Remove button click event
        $(".removebtn").unbind().click(function(event) {
            var elem = event.currentTarget.parentElement.parentElement;
            var url = event.currentTarget.parentElement.nextSibling.dataset.href;
            BG.removeSite(url, function() {
                // TODO: Move to extension's popup in callback
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
        BG.getCurrentTabInfo(function(info) {
            var tab = info[0];
            var url = tab.url;
            BG.checkSite(url, function(allowed) {
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
        if (BG.items < 9) {
            $(".deck").css("overflow-y", "hidden");
        } else {
            $(".deck").css("overflow-y", "auto");
        }
    },
    updateFooterText: function() {
        // Update scrollbar visibility
        this.updateScrollbarState();

        // Update footer text
        var items = BG.items;
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
