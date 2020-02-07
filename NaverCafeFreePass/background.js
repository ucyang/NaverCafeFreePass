"use strict";

if (typeof browser === "undefined")
  var browser = chrome;

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

function getShortCafeAddress(cafeName, articleid) {
  return "https://cafe.naver.com/" + cafeName + "/" + articleid;
}

function createTab(details) {
  var articleid = getArticleId(details.url);

  if (articleid) {
    browser.tabs.get(details.tabId, function(tab) {
      var cafeName = getCafeName(tab.url);
      var originalTabId = tab.id;

      if (cafeName)
        browser.tabs.create({url: getShortCafeAddress(cafeName, articleid)},
          function(tab) {
            browser.tabs.executeScript(originalTabId,
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
      browser.tabs.update(details.tabId,
        {url: getShortCafeAddress(cafeName, articleid)});

      return {cancel: true};
    }
  }

  return {cancel: false};
}

function onBeforeRequestListenerCC(details) {
  var url = getLocation(details.url);

  if (/a=cfa\.atitle/i.test(url.search))
    return createTab(details);

  return {cancel: false};
}

function onBeforeRequestListenerCafe(details) {
  var url = getLocation(details.url);

  if (/iframe/i.test(url.search))
    return updateTab(details);
  else if (/ArticleRead\.nhn/i.test(url.pathname)
    && !/where=search/i.test(url.search)
    && !/tc=naver_search/i.test(url.search)
    && details.frameId)
    return createTab(details);

  return {cancel: false};
}

function onBeforeRequestListenerAPIS(details) {
  var url = getLocation(details.url);

  if (/articles\/\d+/i.test(url.pathname)
    && /buid(=|%3D)/i.test(url.search)
    && !/or(=|%3D)/i.test(url.search)
    && !/query(=|%3D)/i.test(url.search))
    return {redirectUrl: details.url + "&or=m.search.naver.com&query=t"};

  return {cancel: false};
}

function onBeforeSendHeadersListenerCafe(details) {
  if (isShortCafeAddress(details.url)) {
    var naverSearchReferer = "https://search.naver.com/";
    var i;

    for (i = 0; i < details.requestHeaders.length; i++)
      if (details.requestHeaders[i].name.toLowerCase() === "referer") {
        details.requestHeaders[i].value = naverSearchReferer;
        break;
      }

    if (i >= details.requestHeaders.length)
      details.requestHeaders.push(
        {name: "Referer", value: naverSearchReferer});
  }

  return {requestHeaders: details.requestHeaders};
}

browser.webRequest.onBeforeRequest.addListener(
  onBeforeRequestListenerCC,
  {urls: ["*://cc.naver.com/*articleid*"]},
  ["blocking"]);

browser.webRequest.onBeforeRequest.addListener(
  onBeforeRequestListenerCafe,
  {urls: ["*://cafe.naver.com/*articleid*"]},
  ["blocking"]);

browser.webRequest.onBeforeRequest.addListener(
  onBeforeRequestListenerAPIS,
  {urls: ["*://apis.naver.com/*articles*buid*"]},
  ["blocking"]);

try {
  browser.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeadersListenerCafe,
    {urls: ["*://cafe.naver.com/*"]},
    ["blocking", "requestHeaders", "extraHeaders"]);
} catch (e) {
  browser.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeadersListenerCafe,
    {urls: ["*://cafe.naver.com/*"]},
    ["blocking", "requestHeaders"]);
}