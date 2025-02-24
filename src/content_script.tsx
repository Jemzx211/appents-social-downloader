chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  switch (msg.action) {
    case "getPageHTML":
      if (document.readyState === "complete") {
        const html = document.documentElement.outerHTML;
        sendResponse({ html: html });
      } else {
        sendResponse("DOM not ready");
      }
      break;
    default:
      sendResponse("Unknown message.");
  }
});
