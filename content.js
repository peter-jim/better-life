// Content script for self-discipline extension
console.log('Self-Discipline Content script loaded');

// This script can be used to modify page content or add UI elements
// For now it just logs that it's loaded

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentStatus') {
    sendResponse({status: 'loaded'});
    return true;
  }
});