browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'getTabUrl') {
    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      sendResponse({ url: tab.url });
    });
    return true; // Keep the message channel open for sendResponse
  }
});
