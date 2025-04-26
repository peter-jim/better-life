document.addEventListener('DOMContentLoaded', function() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = `${button.dataset.tab}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });

    // DOM Elements
    const banList = document.getElementById('ban-list');
    const banUrlInput = document.getElementById('ban-url');
    const addBanButton = document.getElementById('add-ban');
    const redirectUrlInput = document.getElementById('redirect-url');
    const setRedirectButton = document.getElementById('set-redirect');
    const siteCounter = document.getElementById('site-counter');
    const emptyBanList = document.getElementById('empty-ban-list');
    const emptyRedirect = document.getElementById('empty-redirect');
    const currentRedirectDisplay = document.getElementById('current-redirect-display');
    const currentRedirect = document.getElementById('current-redirect');

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

    // Load existing settings
    chrome.storage.sync.get(['banList', 'redirectUrl'], function(data) {
        updateBanList(data.banList || []);
        updateRedirectDisplay(data.redirectUrl);
    });

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
                            banUrlInput.value = '';
                            updateBanList(banListData);
                            
                            // Show success animation
                            addBanButton.innerHTML = '<i class="fas fa-check"></i>';
                            setTimeout(() => {
                                addBanButton.innerHTML = '<i class="fas fa-plus"></i>';
                            }, 1500);
                        });
                    } else {
                        console.log(`${domain} is already in the ban list`);
                        // Show alert in the button
                        addBanButton.innerHTML = '<i class="fas fa-exclamation"></i>';
                        setTimeout(() => {
                            addBanButton.innerHTML = '<i class="fas fa-plus"></i>';
                        }, 1500);
                        banUrlInput.value = '';
                    }
                });
            } catch (e) {
                console.error("Invalid URL:", e);
                // Show error in the button
                addBanButton.innerHTML = '<i class="fas fa-times"></i>';
                setTimeout(() => {
                    addBanButton.innerHTML = '<i class="fas fa-plus"></i>';
                }, 1500);
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
                    redirectUrlInput.value = '';
                    console.log(`Redirect URL set to ${url}`);
                    updateRedirectDisplay(url);
                    
                    // Show success animation
                    setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                    }, 1500);
                });
            } catch (e) {
                console.error("Invalid redirect URL:", e);
                // Show error in the button
                setRedirectButton.innerHTML = '<i class="fas fa-times"></i>';
                setTimeout(() => {
                    setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                }, 1500);
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
    
    // Update the ban list display
    function updateBanList(list) {
        banList.innerHTML = '';
        siteCounter.textContent = list.length;
        
        if (list.length === 0) {
            emptyBanList.classList.remove('hidden');
        } else {
            emptyBanList.classList.add('hidden');
            
            list.forEach(domain => {
                const li = document.createElement('li');
                
                const domainSpan = document.createElement('span');
                domainSpan.textContent = domain;
                domainSpan.className = 'domain-name';
                li.appendChild(domainSpan);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.addEventListener('click', function() {
                    removeBanListItem(domain);
                });
                
                li.appendChild(deleteBtn);
                banList.appendChild(li);
            });
        }
    }
    
    // Update the redirect display
    function updateRedirectDisplay(url) {
        if (url && url.trim() !== '') {
            currentRedirect.textContent = url;
            emptyRedirect.classList.add('hidden');
            currentRedirectDisplay.classList.remove('hidden');
        } else {
            emptyRedirect.classList.remove('hidden');
            currentRedirectDisplay.classList.add('hidden');
        }
    }
    
    // Function to remove a site from the ban list
    function removeBanListItem(domain) {
        chrome.storage.sync.get('banList', function(data) {
            if (data.banList) {
                const updatedList = data.banList.filter(item => item !== domain);
                chrome.storage.sync.set({banList: updatedList}, function() {
                    console.log(`Removed ${domain} from ban list`);
                    updateBanList(updatedList);
                });
            }
        });
    }
}); 