"use strict";

let BG = chrome.extension.getBackgroundPage();

// Main Sites object, which includes methods for adding/removing site etc.
let Sites = {
    _items: 0,
    createSiteUI: function(title, faviconUrl, url, custom) {
        let top = custom ? -45 : -1;
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
            $("[data-id='" + this._items + "']").animate({ marginTop: "-1px" }, { duration: 300, easing: "easeOutExpo"});
        }
    },
    removeSiteUI: function(element) {
        // Begin removal animation
        $(element).addClass("removenote");

        let self = this;

        // When removal animation ends, add top up animation
        // TODO: Don't use setTimeout, switch to jQuery/CSS animations
        setTimeout(function() {
            $(element).addClass("removenote2");
            let id = $(element).data().id;
            $("[data-id='" + id + "'] > .sitetitle").css("margin", "0px");
        }, 400);

        // Remove a note after end of both animations
        setTimeout(function() {
            $(element).remove();
            // A safer way to check number of saved notes
            self._items = document.querySelectorAll(".site").length;
            self.updateFooterText();
            self.updateIconState();
            // Show/hide how-to site
            if (self._items === 0) {
                $(".howto").show();
            }
        }, 600);
    },
    checkSite: function(url, callback) {
        // URL may be undefined in some cases, GH #16
        if (url === undefined) {
            callback(false);
            return;
        }
        let sites = $(".sitetitle");
        if (!sites) {
            callback(true);
            return;
        }
        let allowed = true;
        for (let i=0; i<sites.length; i++) {
            let siteUrl = $(sites[i]).data().href;
            if (siteUrl === url) {
                allowed = false;
                break;
            }
        }
        callback(allowed);
    },
    init: function() {
        let self = this;
        chrome.storage.local.get(null, function(storage) {
            let sites = storage.sites;
            let openInNewTab = storage && storage.settings && storage.settings.openInNewTab;

            // A new installation, open new tabs in current window
            if (openInNewTab === undefined) {
                chrome.storage.local.set({ settings: { openInNewTab: true } });
            }

            // Add existing notes to deck
            if (sites) {
                for (let site of sites) {
                    self._items++;
                    self.createSiteUI(site.title, site.faviconUrl, site.url);
                }
            }

            // Hide how-to site, when user has saved some sites
            if (self._items !== 0) {
                $(".howto").hide();
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
        let self = this;
        // "Heart" button click event
        $("#addbtn").unbind().click(function() {
            // Get info about current tab
            BG.getCurrentTabInfo(function(info) {
                let tab = info[0];
                // Add or remove a note?
                if ($("#addbtn").hasClass("heart-red")) {
                    let elem = self.getElement(tab.url);
                    BG.removeSite(tab.url, function() {
                        self.removeSiteUI(elem);
                    });
                } else {
                    self.checkSite(tab.url, function(allowed) {
                        if (!allowed) {
                            return;
                        }
                        let note = [];
                        note.push(tab);
                        BG.addSites(note, function() {
                            self._items++;
                            self.createSiteUI(tab.title, tab.favIconUrl, tab.url, true);

                            // Scroll to the top to see latest note
                            $(".deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});

                            // Hide how-to site
                            $(".howto").hide();

                            // Call handlers
                            self.initClickHandlers();
                            self.updateIconState();
                            self.updateFooterText();
                        });
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
            let checked = $(".checkboxicon").hasClass("enabled");
            chrome.storage.local.set({ settings: { openInNewTab: !checked } }, function() {
                self.updateCheckBox();
            });
        });

        // Add current tabs to notes
        $("#addnotesoption").unbind().click(function() {
            chrome.tabs.query({ currentWindow: true }, function(tabs) {
                let tabsToBeAdded = [];
                for (let tab of tabs) {
                    self.checkSite(tab.url, function(allowed) {
                        if (allowed) {
                            tabsToBeAdded.push(tab);
                        }
                    });
                }
                BG.addSites(tabsToBeAdded, function() {
                    for (let tab of tabsToBeAdded) {
                        self._items++;
                        // Create a site UI
                        self.createSiteUI(tab.title, tab.favIconUrl, tab.url, true);
                        // Scroll to the top to see latest note
                        $(".deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});
                        // Hide how-to site
                        $(".howto").hide();
                    }
                    // Call handlers
                    self.initClickHandlers();
                    self.updateIconState();
                    self.updateFooterText();
                });
            });
        });

        // Open all notes
        $("#opennotesoption").unbind().click(function() {
            BG.openAllSites();
        });

        // Site title click event
        $(".sitetitle").unbind().click(function(event) {
            let url = event.target.dataset.href;
            let checked = $(".checkboxicon").hasClass("enabled");
            if (checked) {
                chrome.tabs.create({ url: url });
            } else {
                chrome.tabs.query({ active: true }, function(tabs) {
                    let tab = tabs[0];
                    chrome.tabs.update(tab.id, { url: url });
                    // Extension's popup doesn't automatically close,
                    // so close it manually
                    window.close();
                });
            }
        });

        // Remove button click event
        $(".removebtn").unbind().click(function(event) {
            let elem = event.currentTarget.parentElement.parentElement;
            let url = event.currentTarget.parentElement.nextSibling.dataset.href;
            BG.removeSite(url, function() {
                self.removeSiteUI(elem);
            });
        });
    },
    getElement: function(url) {
        return $("[data-href='" + url + "']").parent();
    },
    updateCheckBox: function() {
        chrome.storage.local.get("settings", function(data) {
            let openInNewTab = data.settings.openInNewTab;
            if (openInNewTab) {
                $(".checkboxicon").css("background-position", "0px -23px").addClass("enabled").removeClass("disabled");
            } else {
                $(".checkboxicon").css("background-position", "0px 0px").addClass("disabled").removeClass("enabled");
            }
        });
    },
    updateIconState: function() {
        let self = this;
        BG.getCurrentTabInfo(function(info) {
            let tab = info[0];
            let url = tab.url;
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
        let items = this._items;
        let text = null;

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

        let notetext = " notes";
        if (items === 1) {
            notetext = " note";
        }

        $(".footnote").text(items + notetext + " \u2014 " + text);
    }
};

// Initialize Notemark
Sites.init();
