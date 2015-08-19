var BG = chrome.extension.getBackgroundPage();

// Add button
var addbtn = document.getElementById("addbtn");
addbtn.addEventListener("click", function() {
    // Get info about current tab
    BG.getCurrentTabInfo(function(info) {
        var tab = info[0];
        var title = tab.title;
        var faviconUrl = tab.favIconUrl;
        var url = tab.url;
        addSite(title, faviconUrl, url);
    });
}, true);

function addSite(title, faviconUrl, url) {
    $(".more").before(
        "<div class='site'>" +
            "<div class='add'>" +
                "<img class='favicon' src='" + faviconUrl + "'>" +
            "</div>" +
            "<div class='sitetitle'>" + title + "</div>" +
        "</div>"
    );
}
