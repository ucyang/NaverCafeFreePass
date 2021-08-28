"use strict";

if (typeof browser === "undefined")
  var browser = chrome;

var isFirefox = false;

if (typeof browser.runtime.getBrowserInfo === "function")
  browser.runtime.getBrowserInfo(function(info) {
    isFirefox = /firefox/i.test(info.name);
  });

function getLocation(href) {
  var l = document.createElement("a");
  l.href = href;
  return l;
}

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

function isStaffAddress(href) {
  return /StaffArticleRead\.nhn/i.test(href);
}

function getShortCafeAddress(cafeName, articleid, staffOnly) {
  return "https://cafe.naver.com/" + cafeName + (staffOnly ? "/staff" : "") + "/" + articleid;
}

function createTab(details) {
  var articleid = getArticleId(details.url);

  if (articleid) {
    browser.tabs.get(details.tabId, function(tab) {
      var cafeName = getCafeName(tab.url);
      var originalTabId = tab.id;

      if (cafeName && cafeName !== "undefined") {
        var staffOnly = isStaffAddress(details.url);

        browser.tabs.create({url: getShortCafeAddress(cafeName, articleid, staffOnly),
          index: tab.index + 1},
          function(tab) {
            browser.tabs.executeScript(originalTabId, {code: isFirefox ? "" : "window.history.back()"});
          });
      } else {
        browser.notifications.create({
          type: "basic",
          iconUrl: "images/icon_48.png",
          title: "게시글 주소를 인식하지 못했습니다",
          message: "Naver Cafe Free Pass 확장 프로그램이 게시글 주소를 인식하지 못했습니다. "
            + "페이지를 새로고침하고 게시글 링크를 우클릭하여 새 탭에서 열어보시거나 "
            + "일시적으로 확장 프로그램을 끄고 접속해주시기 바랍니다. "
            + "불편이 계속되실 경우 개발자에게 문의를 남겨주시면 성실히 답변드리겠습니다."
        }, function(notificationId) {
          browser.tabs.executeScript(originalTabId, {code: isFirefox ? "" : "window.history.back()"},
            function(result) {
              browser.runtime.lastError;
            });
        });
      }
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
      var staffOnly = isStaffAddress(details.url);

      browser.tabs.update(details.tabId,
        {url: getShortCafeAddress(cafeName, articleid, staffOnly)});

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

function onBeforeRequestListenerDaum(details) {
  var url = getLocation(details.url);

  if (isShortCafeAddress(details.url) && !/q(=|%3D)/i.test(url.search))
    return {redirectUrl: details.url + (url.search ? "&" : "?&") + "q=t"};

  if (/bbs_read/i.test(url.pathname)
    && (/page(=|%3D)/i.test(url.search) || /regdt(=|%3D)/i.test(url.search))) {
    var fldidFullPattern = /fldid(=|%3D)[^&]+/i;
    var fldidNamePattern = /fldid(=|%3D)/i;
    var fldid = url.search.match(fldidFullPattern);

    if (fldid) {
      fldid = fldid[0].replace(fldidNamePattern, "");

      var datanumFullPattern = /datanum(=|%3D)\d+/i;
      var datanumNamePattern = /datanum(=|%3D)/i;
      var datanum = url.search.match(datanumFullPattern);

      if (datanum) {
        datanum = datanum[0].replace(datanumNamePattern, "");

        browser.tabs.get(details.tabId, function(tab) {
          var cafeName = getCafeName(tab.url);
          var originalTabId = tab.id;

          if (cafeName && cafeName !== "undefined")
            browser.tabs.create({url: "https://cafe.daum.net/" + cafeName
              + "/" + fldid + "/" + datanum + "?q=t", index: tab.index + 1},
              function(tab) {
                browser.tabs.executeScript(originalTabId, {code: isFirefox ? "" : "window.history.back()"});
              });
          else
            browser.tabs.remove(tab.id, function() {
              browser.notifications.create({
                type: "basic",
                iconUrl: "images/icon_48.png",
                title: "지원하지 않는 접속 방법입니다",
                message: "Naver Cafe Free Pass 확장 프로그램이 지원하지 않는 접속 방법입니다. "
                  + "다음 카페의 경우 새 탭에서 열기 등의 방식은 지원되지 않으므로 "
                  + "다른 방법으로 다시 접속하시거나 일시적으로 확장 프로그램을 끄고 접속해주세요. "
                  + "불편이 계속되실 경우 개발자에게 문의를 남겨주시면 성실히 답변드리겠습니다."
              });
            });
        });

        return {cancel: true};
      }
    }
  }

  return {cancel: false};
}

function onBeforeSendHeadersListenerCafe(details) {
  if (isShortCafeAddress(details.url)) {
    var naverSearchReferer = "https://search.naver.com/";
    var i;

    for (i = 0; i < details.requestHeaders.length; ++i)
      if (details.requestHeaders[i].name.toLowerCase() === "referer") {
        details.requestHeaders[i].value = naverSearchReferer;
        break;
      }

    if (i >= details.requestHeaders.length)
      details.requestHeaders.push({name: "Referer", value: naverSearchReferer});
  }

  return {requestHeaders: details.requestHeaders};
}

var onBeforeRequestListeners = [
  onBeforeRequestListenerCC,
  onBeforeRequestListenerCafe,
  onBeforeRequestListenerAPIS,
  onBeforeRequestListenerDaum
];

var onBeforeRequestUrls = [
  "*://cc.naver.com/*articleid*",
  "*://cafe.naver.com/*articleid*",
  "*://apis.naver.com/*articles*buid*",
  "*://*.cafe.daum.net/*"
];

var onBeforeSendHeadersListeners = [
  onBeforeSendHeadersListenerCafe
];

var onBeforeSendHeadersUrls = [
  "*://cafe.naver.com/*"
];

function addListeners() {
  var i;

  for (i = 0; i < onBeforeRequestListeners.length; ++i)
    if (!browser.webRequest.onBeforeRequest.hasListener(onBeforeRequestListeners[i]))
      browser.webRequest.onBeforeRequest.addListener(
        onBeforeRequestListeners[i],
        {urls: [onBeforeRequestUrls[i]]},
        ["blocking"]);

  for (i = 0; i < onBeforeSendHeadersListeners.length; ++i)
    if (!browser.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeadersListeners[i]))
      try {
        browser.webRequest.onBeforeSendHeaders.addListener(
          onBeforeSendHeadersListeners[i],
          {urls: [onBeforeSendHeadersUrls[i]]},
          ["blocking", "requestHeaders", "extraHeaders"]);
      } catch (e) {
        browser.webRequest.onBeforeSendHeaders.addListener(
          onBeforeSendHeadersListeners[i],
          {urls: [onBeforeSendHeadersUrls[i]]},
          ["blocking", "requestHeaders"]);
      }
}

function removeListeners() {
  var i;

  for (i = 0; i < onBeforeRequestListeners.length; ++i)
    if (browser.webRequest.onBeforeRequest.hasListener(onBeforeRequestListeners[i]))
      browser.webRequest.onBeforeRequest.removeListener(onBeforeRequestListeners[i]);

  for (i = 0; i < onBeforeSendHeadersListeners.length; ++i)
    if (browser.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeadersListeners[i]))
      browser.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersListeners[i]);
}

function setIcon(enable) {
  var prefix = enable ? "images/icon_" : "images/icon_disabled_";

  browser.browserAction.setIcon({path: {
    16: prefix + "16.png",
    32: prefix + "32.png",
    48: prefix + "48.png",
    128: prefix + "128.png"
  }});
}

browser.runtime.onInstalled.addListener(function(details) {
  switch (details.reason) {
    case "install":
      browser.storage.local.set({enabled: true});
      break;
    case "update":
      browser.browserAction.setBadgeText({text: "New!"});
      browser.browserAction.setBadgeBackgroundColor({color: "#cc0"});

      browser.storage.local.get("enabled", function(items) {
        if (typeof items.enabled === "undefined")
          if (isFirefox)
              browser.storage.local.set({enabled: true});
          else
            browser.storage.sync.get("enabled", function(items) {
              if (typeof items.enabled === "undefined")
                browser.storage.local.set({enabled: true});
              else
                browser.storage.local.set({enabled: items.enabled});
            });
      });
      break;
  }
});

browser.storage.local.get("enabled", function(items) {
  if (items.enabled || typeof items.enabled === "undefined")
    addListeners();
  else
    setIcon(false);
});

browser.storage.onChanged.addListener(function(changes) {
  if ("enabled" in changes && typeof changes.enabled.oldValue !== "undefined")
    if (changes.enabled.newValue) {
      setIcon(true);
      addListeners();
    } else {
      setIcon(false);
      removeListeners();
    }
});
