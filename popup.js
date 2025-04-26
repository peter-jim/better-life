document.addEventListener('DOMContentLoaded', function() {
    const banList = document.getElementById('ban-list');
    const banUrlInput = document.getElementById('ban-url');
    const addBanButton = document.getElementById('add-ban');
    const redirectUrlInput = document.getElementById('redirect-url');
    const setRedirectButton = document.getElementById('set-redirect');
    const currentRedirect = document.getElementById('current-redirect');

    // Load existing settings
    chrome.storage.sync.get(['banList', 'redirectUrl'], function(data) {
        if (data.banList) {
            data.banList.forEach(url => addBanListItem(url));
        }
        if (data.redirectUrl) {
            currentRedirect.textContent = `Current Redirect: ${data.redirectUrl}`;
        }
    });

    // Add URL to ban list
    addBanButton.addEventListener('click', function() {
        const url = banUrlInput.value.trim();
        if (url) {
            chrome.storage.sync.get('banList', function(data) {
                const banList = data.banList || [];
                banList.push(url);
                chrome.storage.sync.set({banList: banList}, function() {
                    addBanListItem(url);
                    banUrlInput.value = '';
                });
            });
        }
    });

    // Set redirect URL
    setRedirectButton.addEventListener('click', function() {
        const url = redirectUrlInput.value.trim();
        if (url) {
            chrome.storage.sync.set({redirectUrl: url}, function() {
                currentRedirect.textContent = `Current Redirect: ${url}`;
                redirectUrlInput.value = '';
            });
        }
    });

    // Helper function to add a ban list item
    function addBanListItem(url) {
        const li = document.createElement('li');
        li.textContent = url;
        banList.appendChild(li);
    }
}); 