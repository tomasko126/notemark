// Main Sites object, which includes methods for adding/removing site etc.
class Sites {
    constructor() {
        this.noOfStoredNotes = 0;
    }

    addNewNotes(tabs, addedByHeart) {
        const tabsToBeStored = [];

        // Check, whether we have already stored some tab as a note or not
        // In a case, where we have stored some tab as a note,
        // do not add another one
        for (const tab of tabs) {
            if (this.checkSite(tab.url)) {
                tabsToBeStored.push(tab);
            }
        }

        // Store all tabs as notes in the storage
        chrome.runtime.sendMessage({ action: "addNotes", notes: tabsToBeStored }, () => {
                    
            // Create UI for every tab
            for (const tab of tabsToBeStored) {
                this.createNoteUI(tab.title, tab.favIconUrl, tab.url, addedByHeart);
            }

            // Call handlers
            this.updatePopupState(true);
        });
    }

    checkSite(url) {
        // URL may be undefined in some cases, GH #16
        // In this case, do not add a new note
        if (!url) {
            return false;
        }

        // We have not stored any note yet..
        if (this.noOfStoredNotes === 0) {
            return true;
        }

        // Check |url| against urls in notes
        const sites = $(".siteTitle");

        for (let i=0; i<sites.length; i++) {
            const siteUrl = $(sites[i]).data().href;
            if (siteUrl === url) {
                return false;
            }
        }

        return true;
    }

    removeNote(noteToRemove, url) {
        // Call BG's method in order to remove note from storage
        chrome.runtime.sendMessage({ action: "removeNote", url }, () => {

            // Update how-to visibility
            this.updateHowToVisibility();

            // Remove note's UI afterwards
            this.removeNoteUI(noteToRemove).then(() => {

                // A safer way to check number of saved notes
                this.noOfStoredNotes = document.querySelectorAll(".site").length;

                this.updatePopupState();
            });
        });
    }

    // Create an UI for a note
    createNoteUI(title, faviconUrl, url, addedByUser = false) {

        // Prepend the UI after deck
        $("#deck").prepend(
            "<div class='site' data-id='" + this.noOfStoredNotes + "'>" +
                "<img class='favicon' src='" + (faviconUrl || chrome.runtime.getURL("../img/favicon.png")) + "' />" +
                "<span class='siteTitle' data-href='" + url + "' title='" + title + "'>" + title + "</span>" +
            "</div>"
        );

        // Increment no of notes
        this.noOfStoredNotes++;

        // Add an opacity animation just for the first note
        if (this.noOfStoredNotes === 1 && addedByUser) {
            $("#deck :first").addClass("addNote");
        }
    }

    // Remove UI of a note, which is going ot be removed
    removeNoteUI(noteToRemove) {

        return new Promise((resolve) => {
            // Begin removal animation
            $(noteToRemove).addClass("removeNote");

            $(noteToRemove).on("transitionend", () => {
                // When the removal animation ends, we start another animation
                // which slides up the content after "removed" note
                $(noteToRemove).addClass("removeNote2");

                $(noteToRemove).on("transitionend", () => {
                    $(noteToRemove).remove();

                    resolve();                    
                });
            });
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
                    const noteToRemove = $("[data-href='" + tab.url + "']").parent();

                    this.removeNote(noteToRemove, tab.url);
                    return;
                }

                this.addNewNotes([tab], true);
            });
        });

        // Settings icon click event
        $("#settingsIcon").unbind().click(() => {
            document.getElementById("settingsIcon").style.animation = "settingsIcon 0.3s 1";

            // Remove animation attribute, so the animation can play x-times
            $("#settingsIcon").on("animationend", () => {
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
            chrome.tabs.query({}, (tabs) => {
                this.addNewNotes(tabs, false);
            });
        });

        // Open all notes
        $("#openNotesOption").unbind().click(() => {
            chrome.runtime.sendMessage({ action: "openAllNotes" });
        });

        // Site title click event
        $(".siteTitle").unbind().click((event) => {
            const url = event.target.dataset.href;
            const openInNewTab = $("#checkboxIcon").hasClass("enabled");

            if (openInNewTab) {
                chrome.tabs.create({ url });
            } else {
                chrome.tabs.query({ active: true }, (tabs) => {
                    const tab = tabs[0];

                    chrome.tabs.update(tab.id, { url });

                    // Extension's popup doesn't automatically close,
                    // so close it manually
                    //window.close();
                });
            }
        });

        // Remove button click event
        $(".favicon").unbind().click((event) => {
            const noteToRemove = event.currentTarget.parentElement;
            const url = event.currentTarget.parentElement.children[1].dataset.href;

            this.removeNote(noteToRemove, url);
        });
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

    // Updates footer text according to number of stored notes
    updateFooterText() {
        const items = this.noOfStoredNotes;
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

        $("footer").text(this.noOfStoredNotes + notetext + " \u2014 " + text);
    }

    updateHowToVisibility() {
        if (this.noOfStoredNotes > 1) {
            $("#howTo").css("opacity", "0");
        } else {
            $("#howTo").css("opacity", "1");
        }
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
        if (this.noOfStoredNotes < 9) {
            $("#deck").css("overflow-y", "hidden");
        } else {
            $("#deck").css("overflow-y", "auto");
        }
    }

    updatePopupState(shallInitClickHandlers = false) {
        
        // When we've added new note/notes, we need to initialize
        // click handler for new note as well (it's open/remove buttons..)
        if (shallInitClickHandlers) {
            // Initialize click handlers for different elements
            this.initClickHandlers();
        }

        // Update footer text
        this.updateFooterText();

        // Update heart icon state
        this.updateIconState();

        // Update scrollbar visibility
        this.updateScrollbarState();
    }

    /* MAIN METHOD */

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
                    this.createNoteUI(site.title, site.faviconUrl, site.url);
                }
            }

            // Update popup's state
            this.updatePopupState(true);

            // Update "Open in new tab" checkbox
            this.updateCheckBox();
        });
    }
};

// Initialize Notemark
const sites = new Sites();
sites.init();
