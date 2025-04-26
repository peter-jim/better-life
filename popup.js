document.addEventListener('DOMContentLoaded', function() {
    const banList = document.getElementById('ban-list');
    const banUrlInput = document.getElementById('ban-url');
    const addBanButton = document.getElementById('add-ban');
    const redirectUrlInput = document.getElementById('redirect-url');
    const setRedirectButton = document.getElementById('set-redirect');
    const currentRedirect = document.getElementById('current-redirect');

    // Load existing settings
    chrome.storage.sync.get(['banList', 'redirectUrl'], function(data) {
        if (data.banList && data.banList.length > 0) {
            data.banList.forEach(url => addBanListItem(url));
        }
        if (data.redirectUrl) {
            currentRedirect.textContent = `Current Redirect: ${data.redirectUrl}`;
        }
    });

    // Extract domain function - handles special cases
    function extractDomain(url) {
        // Add protocol if not present
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        try {
            const parsed = new URL(url);
            let hostname = parsed.hostname;
            
            // Remove www. if present
            if (hostname.startsWith('www.')) {
                hostname = hostname.substring(4);
            }
            
            // Check for IP addresses (simple check)
            if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
                return hostname; // Return as is for IP addresses
            }
            
            // For regular domains, get the main domain + TLD
            const parts = hostname.split('.');
            
            // Special case for Chinese sites and other common TLDs
            if (parts.length >= 2) {
                // Common 2-part TLDs
                const specialTLDs = ['com.cn', 'co.jp', 'co.uk', 'com.hk', 'co.kr'];
                const lastTwoParts = parts[parts.length-2] + '.' + parts[parts.length-1];
                
                // If it's a special 2-part TLD and we have enough parts
                if (specialTLDs.includes(lastTwoParts) && parts.length >= 3) {
                    return parts[parts.length-3] + '.' + lastTwoParts;
                }
                
                // Normal case - return domain + TLD
                return parts[parts.length-2] + '.' + parts[parts.length-1];
            }
            
            return hostname;
        } catch (e) {
            console.error("Invalid URL:", e);
            // If parsing fails, return the original input
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
    }

    // Add URL to ban list
    addBanButton.addEventListener('click', function() {
        let url = banUrlInput.value.trim();
        if (url) {
            try {
                const domain = extractDomain(url);
                console.log(`Extracted domain: ${domain} from input: ${url}`);
                
                chrome.storage.sync.get('banList', function(data) {
                    const banListData = data.banList || [];
                    // Check if already in the list
                    if (!banListData.includes(domain)) {
                        banListData.push(domain);
                        chrome.storage.sync.set({banList: banListData}, function() {
                            console.log(`Added ${domain} to ban list`);
                            addBanListItem(domain);
                            banUrlInput.value = '';
                        });
                    } else {
                        console.log(`${domain} is already in the ban list`);
                        alert(`${domain} is already in the ban list`);
                        banUrlInput.value = '';
                    }
                });
            } catch (e) {
                console.error("Invalid URL:", e);
                alert("Please enter a valid URL or domain name");
            }
        }
    });

    // Set redirect URL
    setRedirectButton.addEventListener('click', function() {
        let url = redirectUrlInput.value.trim();
        if (url) {
            // Ensure URL has a protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            try {
                // Validate URL
                new URL(url);
                chrome.storage.sync.set({redirectUrl: url}, function() {
                    currentRedirect.textContent = `Current Redirect: ${url}`;
                    redirectUrlInput.value = '';
                    console.log(`Redirect URL set to ${url}`);
                });
            } catch (e) {
                console.error("Invalid redirect URL:", e);
                alert("Please enter a valid redirect URL");
            }
        }
    });

    // Allow Enter key to trigger add button
    banUrlInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            addBanButton.click();
        }
    });

    // Allow Enter key to trigger set redirect button
    redirectUrlInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            setRedirectButton.click();
        }
    });

    // Helper function to add a ban list item with remove button
    function addBanListItem(url) {
        const li = document.createElement('li');
        li.textContent = url;
        
        // Add a delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.addEventListener('click', function() {
            removeBanListItem(url, li);
        });
        
        li.appendChild(deleteBtn);
        banList.appendChild(li);
    }
    
    // Function to remove a site from the ban list
    function removeBanListItem(url, listItem) {
        chrome.storage.sync.get('banList', function(data) {
            if (data.banList) {
                const updatedList = data.banList.filter(item => item !== url);
                chrome.storage.sync.set({banList: updatedList}, function() {
                    listItem.remove();
                    console.log(`Removed ${url} from ban list`);
                });
            }
        });
    }
}); 