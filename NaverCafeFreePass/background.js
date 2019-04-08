"use strict";

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'cafe.naver.com'},
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

function getLocation(href) {
  var l = document.createElement("a");
  l.href = href;
  return l;
};

function getArticleId(href) {
  var url = getLocation(href);

  var articleidFullPattern = /articleid(=|%3D)\d+/i;
  var articleidNamePattern = /articleid(=|%3D)/i;

  var articleid = url.search.match(articleidFullPattern);

  if (articleid)
    return articleid[0].replace(articleidNamePattern, "");
  else
    return articleid;
}

function getCafeName(href) {
  var url = getLocation(href);

  var cafeNamePattern = /[^\/\?\.]+/;
  var cafeName = url.pathname.match(cafeNamePattern);

  if (cafeName)
    return cafeName[0];
  else
    return cafeName;
}

function isShortCafeAddress(href) {
  var url = getLocation(href);

  return /\/\d+$/.test(url.pathname);
}

function createTab(details) {
  var articleid = getArticleId(details.url);

  if (articleid) {
    chrome.tabs.get(details.tabId, function(tab) {
      var cafeName = getCafeName(tab.url);
      var originalTabId = tab.id;

      if (cafeName)
        chrome.tabs.create({url: "https://cafe.naver.com/"
          + cafeName + "/" + articleid}, function(tab) {
          chrome.tabs.executeScript(originalTabId,
            {code: "window.history.back()"});
        });
    });

    return {cancel: true};
  }

  return {cancel: false};
}

function updateTab(details) {
  var articleid = getArticleId(details.url);

  if (articleid) {
    var cafeName = getCafeName(details.url);

    if (cafeName) {
      chrome.tabs.update(details.tabId, {url: "https://cafe.naver.com/"
        + cafeName + "/" + articleid});

      return {cancel: true};
    }
  }

  return {cancel: false};
}

chrome.webRequest.onBeforeRequest.addListener(createTab,
  {urls: ["*://cc.naver.com/*articleid*"]},
  ["blocking"]);

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    var url = getLocation(details.url);

    if (/iframe/i.test(url.search))
      return updateTab(details);
    else if (/ArticleRead.nhn/i.test(url.pathname)
      && !/where=search/i.test(url.search)
      && !/tc=naver_search/i.test(url.search)
      && !/referrer/i.test(url.search)
      && details.frameId)
      return createTab(details);

    return {cancel: false};
  },
  {urls: ["*://cafe.naver.com/*articleid*"]},
  ["blocking"]);

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    var i;

    if (isShortCafeAddress(details.url)) {
      for (i = 0; i < details.requestHeaders.length; i++)
        if (details.requestHeaders[i].name === "Referer") {
          details.requestHeaders[i].value = "https://search.naver.com/";
          break;
        }

      if (i >= details.requestHeaders.length)
        for (i = 0; i < details.requestHeaders.length; i++)
          if (details.requestHeaders[i].name === "Accept") {
            details.requestHeaders.splice(i + 1, 0,
              {name: "Referer", value: "https://search.naver.com/"});
            break;
          }
    }

    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["*://cafe.naver.com/*"]},
  ["blocking", "requestHeaders", "extraHeaders"]);