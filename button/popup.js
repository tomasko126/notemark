// Main Sites object, which includes methods for adding/removing site etc.
class Sites {
    constructor() {
        this._items = 0;
    }

    // Create an UI for a note, which is going to be added
    createSiteUI(title, faviconUrl, url) {
        $("#deck").prepend(
            "<div class='site' data-id='" + this._items + "'>" +
                "<img class='favicon' src='" + (faviconUrl || chrome.runtime.getURL("../img/favicon.png")) + "' />" +
                "<span class='siteTitle' data-href='" + url + "' title='" + title + "'>" + title + "</span>" +
                "<img class='openLink' />" +
            "</div>"
        );
    }

    // Remove UI of a note, which is going ot be removed
    removeSiteUI(element) {
        // Begin removal animation
        $(element).addClass("removeNote");

        $(element).on("animationend webkitAnimationEnd", () => {
            // When the removal animation ends, we start another animation
            // which slides up the content after "removed" note
            $(element).addClass("removeNote2");

            $(element).on("animationend webkitAnimationEnd", () => {
                $(element).remove();

                // A safer way to check number of saved notes
                this._items = document.querySelectorAll(".site").length;

                // Update footer text
                this.updateFooterText();

                // Update heart icon
                this.updateIconState();

                // Show/hide how-to site
                if (this._items === 0) {
                    $("#howTo").slideDown({duration: 350, easing: "easeOutExpo"});
                }
            });
        });
    }

    checkSite(url) {
        // URL may be undefined in some cases, GH #16
        if (url === undefined) {
            return false;
        }

        const sites = $(".siteTitle");

        if (!sites) {
            return true;
        }

        let allowed = true;

        for (let i=0; i<sites.length; i++) {
            const siteUrl = $(sites[i]).data().href;
            if (siteUrl === url) {
                allowed = false;
                break;
            }
        }

        return allowed;
    }

    init() {
        chrome.storage.sync.get(null, (storage) => {
            const sites = storage.sites;
            const openInNewTab = storage && storage.settings && storage.settings.openInNewTab;

            // A new installation, open new tabs in current window
            if (openInNewTab === undefined) {
                chrome.storage.sync.set({ settings: { openInNewTab: true } });
            }

            // Add existing notes to deck
            if (sites) {
                for (const site of sites) {
                    this._items++;
                    this.createSiteUI(site.title, site.faviconUrl, site.url);
                }
            }

            // Hide how-to site, when user has saved some sites
            if (this._items !== 0) {
                $("#howTo").hide();
            }

            // Initialize click handlers
            this.initClickHandlers();

            // Update icon
            this.updateIconState();

            // Update number of saved notes
            this.updateFooterText();

            // Update "Open in new tab" checkbox
            this.updateCheckBox();
        });
    }

    initClickHandlers() {
        // "Heart" has been clicked
        $("#addNoteButton").unbind().click(() => {

            // Get info about current tab
            chrome.runtime.sendMessage({ action: "getCurrentTabInfo" }, (tabs) => {
                const tab = tabs[0];

                // When site has already been stored, remove it
                if ($("#addNoteButton").hasClass("heart-red")) {
                    const elem = this.getElement(tab.url);

                    chrome.runtime.sendMessage({ action: "removeSite", url: tab.url }, () => {
                        this.removeSiteUI(elem);
                    });

                    return;
                }

                // When site has not been added yet
                if (this.checkSite(tab.url)) {

                    const note = [];
                    note.push(tab);

                    chrome.runtime.sendMessage({ action: "addSites", notes: note }, () => {
                        this._items++;
                        this.createSiteUI(tab.title, tab.favIconUrl, tab.url);

                        // Scroll to the top to see latest note
                        $("#deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});

                        // Hide how-to site
                        $("#howTo").hide();

                        // Call handlers
                        this.initClickHandlers();
                        this.updateIconState();
                        this.updateFooterText();
                    });
                }
            });
        });

        // Settings icon click event
        $("#settingsIcon").unbind().click(() => {
            document.getElementById("settingsIcon").style.animation = "settingsIcon 0.3s 1";

            // Remove animation attribute, so the animation can play x-times
            $("#settingsIcon").on("animationend webkitAnimationEnd", () => {
                $("#settingsIcon").css("animation", "");
            });

            if ($("#settingsContainer:hidden").length === 1) {
                $("#settingsContainer").css("display", "flex");
            } else {
                $("#settingsContainer").css("display", "none");
            }
        });

        // "Open in new tab" checkbox
        $("#checkboxOption").unbind().click(() => {
            const checked = $("#checkboxIcon").hasClass("enabled");

            chrome.storage.sync.set({ settings: { openInNewTab: !checked } }, () => {
                this.updateCheckBox();
            });
        });

        // Add current tabs to notes
        $("#addNotesOption").unbind().click(() => {
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
                const tabsToBeAdded = [];

                for (const tab of tabs) {
                    if (this.checkSite(tab.url)) {
                        tabsToBeAdded.push(tab);
                    }
                }

                chrome.runtime.sendMessage({ action: "addSites", notes: tabsToBeAdded }, () => {
                    
                    // Process every added note
                    for (const tab of tabsToBeAdded) {
                        // Increment no of items
                        this._items++;

                        // Create a site UI
                        this.createSiteUI(tab.title, tab.favIconUrl, tab.url);

                        // Scroll to the top to see latest note
                        $("#deck").animate({ scrollTop: 0 }, { duration: 150, easing: "easeOutExpo"});

                        // Hide how-to site
                        $("#howTo").slideUp({duration: 350, easing: "easeOutExpo"});
                    }

                    // Call handlers
                    this.initClickHandlers();
                    this.updateIconState();
                    this.updateFooterText();
                });
            });
        });

        // Open all notes
        $("#openNotesOption").unbind().click(() => {
            chrome.runtime.sendMessage({ action: "openAllSites" });
        });

        // Site title click event
        $(".openLink").unbind().click((event) => {
            const url = event.target.previousSibling.dataset.href;
            const checked = $("#checkboxIcon").hasClass("enabled");

            if (checked) {
                chrome.tabs.create({ url });
            } else {
                chrome.tabs.query({ active: true }, (tabs) => {
                    const tab = tabs[0];

                    chrome.tabs.update(tab.id, { url });

                    // Extension's popup doesn't automatically close,
                    // so close it manually
                    window.close();
                });
            }
        });

        // Remove button click event
        $(".favicon").unbind().click((event) => {
            const elem = event.currentTarget.parentElement;
            const url = event.currentTarget.parentElement.children[1].dataset.href;

            chrome.runtime.sendMessage({ action: "removeSite", url }, () => {
                this.removeSiteUI(elem);
            });
        });
    }

    getElement(url) {
        return $("[data-href='" + url + "']").parent();
    }

    updateCheckBox() {
        chrome.storage.sync.get("settings", (data) => {
            const openInNewTab = data.settings.openInNewTab;

            if (openInNewTab) {
                $("#checkboxIcon").css("background-position", "0px -23px").addClass("enabled").removeClass("disabled");
            } else {
                $("#checkboxIcon").css("background-position", "0px 0px").addClass("disabled").removeClass("enabled");
            }
        });
    }

    updateIconState() {
        chrome.runtime.sendMessage({ action: "getCurrentTabInfo"}, (tabs) => {

            const alreadyAddedTab = this.checkSite(tabs[0].url);

            // If site has already been added
            if (!alreadyAddedTab) {
                $("#addNoteButton").addClass("heart-red");
                $("#addNoteButton").mouseleave(() => {
                    $("#addNoteButton").addClass("heart-red");
                });
            } else {
                // If site hasn't been added yet
                $("#addNoteButton").removeClass("heart-red");
                $("#addNoteButton").mouseleave(() => {
                    $("#addNoteButton").removeClass("heart-red");
                });
            }
        });
    }

    updateScrollbarState() {
        if (this._items < 9) {
            $("#deck").css("overflow-y", "hidden");
        } else {
            $("#deck").css("overflow-y", "auto");
        }
    }

    updateFooterText() {
        // Update scrollbar visibility
        this.updateScrollbarState();

        // Update footer text
        const items = this._items;
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

        $("footer").text(items + notetext + " \u2014 " + text);
    }
};

// Initialize Notemark
const sites = new Sites();
sites.init();
