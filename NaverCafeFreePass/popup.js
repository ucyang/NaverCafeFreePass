"use strict";

if (typeof browser === "undefined")
  var browser = chrome;

var inputEnabled = document.getElementById("enabled");

browser.storage.sync.get("enabled", function(items) {
  inputEnabled.checked = items.enabled;
});

inputEnabled.onclick = function (event) {
  browser.storage.sync.set({enabled: event.target.checked});
};

browser.browserAction.getBadgeText({}, function(result) {
  if (result) {
    document.getElementById("updated-alert").style.display = "inline";
    browser.browserAction.setBadgeText({text: ""});
  }
});