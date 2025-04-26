// Placeholder for background script logic
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['banList', 'redirectUrl'], function(data) {
        const banList = data.banList || [];
        const redirectUrl = data.redirectUrl || '';
        const url = new URL(details.url);

        if (banList.includes(url.hostname)) {
          if (redirectUrl) {
            resolve({redirectUrl: redirectUrl});
          } else {
            resolve({cancel: true});
          }
        } else {
          resolve({});
        }
      });
    });
  },
  {urls: ["<all_urls>"]},
  ["blocking"]
); 