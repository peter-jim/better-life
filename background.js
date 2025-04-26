// background.js
let cachedBanList = [];
let cachedRedirectUrl = '';
console.log('Self-Discipline background script loaded');

// Initialize cached data from storage
chrome.storage.sync.get(['banList', 'redirectUrl'], (data) => {
  console.log('Initial storage data:', data);
  cachedBanList = data.banList || [];
  cachedRedirectUrl = data.redirectUrl || '';
  updateRules();
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('Storage changed:', changes);
  if (area === 'sync' && (changes.banList || changes.redirectUrl)) {
    chrome.storage.sync.get(['banList', 'redirectUrl'], (data) => {
      cachedBanList = data.banList || [];
      cachedRedirectUrl = data.redirectUrl || '';
      updateRules();
    });
  }
});

// Function to update the declarativeNetRequest rules
async function updateRules() {
  try {
    console.log('Updating rules with ban list:', cachedBanList);
    console.log('Redirect URL:', cachedRedirectUrl);
    
    // First remove all existing rules
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = currentRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    if (!cachedBanList || cachedBanList.length === 0) {
      console.log('No sites to block, rules cleared');
      return; // No sites to block
    }

    // Create individual rules for each banned site for better reliability
    const rules = [];
    let ruleId = 1;
    
    for (const site of cachedBanList) {
      console.log(`Creating rule for site: ${site}`);
      
      // Create a rule for each site
      if (cachedRedirectUrl && cachedRedirectUrl.trim() !== '') {
        // Create redirect rules for this site
        rules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: cachedRedirectUrl }
          },
          condition: {
            urlFilter: `||${site}^`,
            resourceTypes: ['main_frame']
          }
        });
        
        // Add a second rule with www prefix if not already present
        if (!site.startsWith('www.')) {
          rules.push({
            id: ruleId++,
            priority: 1,
            action: {
              type: 'redirect',
              redirect: { url: cachedRedirectUrl }
            },
            condition: {
              urlFilter: `||www.${site}^`,
              resourceTypes: ['main_frame']
            }
          });
        }
      } else {
        // Create block rules for this site
        rules.push({
          id: ruleId++,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: `||${site}^`,
            resourceTypes: ['main_frame']
          }
        });
        
        // Add a second rule with www prefix if not already present
        if (!site.startsWith('www.')) {
          rules.push({
            id: ruleId++,
            priority: 1,
            action: { type: 'block' },
            condition: {
              urlFilter: `||www.${site}^`,
              resourceTypes: ['main_frame']
            }
          });
        }
      }
    }
    
    if (rules.length > 0) {
      console.log(`Adding ${rules.length} rules:`, rules);
      
      // Add the rules to Chrome
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
      
      console.log('Rules updated successfully');
    }
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// Handle override requests - temporarily disabled until we implement proper override in Manifest V3
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'setTemporaryOverride') {
    const { hostname, minutes } = request.data;
    console.log(`Received override request for ${hostname} for ${minutes} minutes`);
    
    // For Manifest V3, we could implement a different approach for temporary overrides
    // For now, we just log the request
    
    sendResponse({success: true, message: "Temporary overrides feature being updated for Manifest V3"});
    return true;
  }
  
  if (request.action === 'getStatus') {
    sendResponse({
      banList: cachedBanList,
      redirectUrl: cachedRedirectUrl,
      status: 'active'
    });
    return true;
  }
});