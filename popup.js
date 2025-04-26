document.addEventListener('DOMContentLoaded', function() {
    // App state
    let darkMode = false;
    let stats = {
        sitesBlocked: 0,
        blocksToday: 0,
        focusScore: 0
    };

    // DOM Elements - Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // DOM Elements - Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    
    // DOM Elements - Ban List
    const banList = document.getElementById('ban-list');
    const banUrlInput = document.getElementById('ban-url');
    const addBanButton = document.getElementById('add-ban');
    const siteCounter = document.getElementById('site-counter');
    const emptyBanList = document.getElementById('empty-ban-list');
    
    // DOM Elements - Redirect
    const redirectUrlInput = document.getElementById('redirect-url');
    const setRedirectButton = document.getElementById('set-redirect');
    const emptyRedirect = document.getElementById('empty-redirect');
    const currentRedirectDisplay = document.getElementById('current-redirect-display');
    const currentRedirect = document.getElementById('current-redirect');
    const redirectFavicon = document.getElementById('redirect-favicon');
    const redirectStatus = document.getElementById('redirect-status');
    
    // DOM Elements - Stats
    const sitesBlockedEl = document.getElementById('sites-blocked');
    const blocksTodayEl = document.getElementById('blocks-today');
    const focusScoreEl = document.getElementById('focus-score');

    // Initialize app
    initApp();

    function initApp() {
        // Load settings and stats
        loadSettings();
        loadStats();
        
        // Default to light mode
        toggleLightMode(true);
        
        // Set up event listeners
        setupEventListeners();
        
        // Animate app loading
        document.body.style.opacity = 1;
    }
    
    function setupEventListeners() {
        // Tab navigation
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
        
        // Theme toggle
        themeToggle.addEventListener('click', () => {
            if (darkMode) {
                toggleLightMode(true);
            } else {
                toggleDarkMode(true);
            }
        });
        
        // Ban URL input
        addBanButton.addEventListener('click', addUrlToBanList);
        banUrlInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                addUrlToBanList();
            }
        });
        
        // Redirect URL input
        setRedirectButton.addEventListener('click', setRedirectUrl);
        redirectUrlInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                setRedirectUrl();
            }
        });
    }

    // Dark mode toggle
    function toggleDarkMode(enable) {
        darkMode = enable;
        
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Save preference
        chrome.storage.sync.set({darkMode: darkMode});
    }
    
    // Light mode toggle
    function toggleLightMode(enable) {
        darkMode = !enable;
        
        if (!darkMode) {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Save preference
        chrome.storage.sync.set({darkMode: darkMode});
    }

    // Load settings from storage
    function loadSettings() {
        chrome.storage.sync.get(['banList', 'redirectUrl', 'darkMode'], function(data) {
            // Load dark mode preference
            if (data.darkMode !== undefined) {
                if (data.darkMode) {
                    toggleDarkMode(true);
                } else {
                    toggleLightMode(true);
                }
            } else {
                // Default to light mode if no preference is saved
                toggleLightMode(true);
            }
            
            // Load ban list
            updateBanList(data.banList || []);
            
            // Load redirect URL
            updateRedirectDisplay(data.redirectUrl);
        });
    }
    
    // Load stats from storage
    function loadStats() {
        chrome.storage.sync.get(['stats'], function(data) {
            if (data.stats) {
                stats = data.stats;
            } else {
                // Set default stats
                stats = {
                    sitesBlocked: 0,
                    blocksToday: 0,
                    focusScore: 76
                };
                saveStats();
            }
            updateStatsDisplay();
        });
    }
    
    // Save stats to storage
    function saveStats() {
        chrome.storage.sync.set({stats: stats});
    }
    
    // Update stats display
    function updateStatsDisplay() {
        sitesBlockedEl.textContent = stats.sitesBlocked;
        blocksTodayEl.textContent = stats.blocksToday;
        focusScoreEl.textContent = stats.focusScore;
        
        // Animate stats
        animateElement(sitesBlockedEl);
        animateElement(blocksTodayEl);
        animateElement(focusScoreEl);
    }
    
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
    function addUrlToBanList() {
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
                            
                            // Update stats
                            stats.sitesBlocked = banListData.length;
                            stats.focusScore = Math.min(100, 50 + Math.floor(banListData.length * 5));
                            saveStats();
                            updateStatsDisplay();
                            
                            // Show success animation
                            showToastNotification('Site added to block list', 'success');
                            addBanButton.innerHTML = '<i class="fas fa-check"></i>';
                            setTimeout(() => {
                                addBanButton.innerHTML = '<i class="fas fa-plus"></i>';
                            }, 1500);
                        });
                    } else {
                        console.log(`${domain} is already in the ban list`);
                        // Show alert
                        showToastNotification('Site already in block list', 'warning');
                        
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
                // Show error notification
                showToastNotification('Please enter a valid URL', 'error');
                
                // Show error in the button
                addBanButton.innerHTML = '<i class="fas fa-times"></i>';
                setTimeout(() => {
                    addBanButton.innerHTML = '<i class="fas fa-plus"></i>';
                }, 1500);
            }
        }
    }

    // Set redirect URL
    function setRedirectUrl() {
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
                    
                    // Show success notification
                    showToastNotification('Redirect URL set successfully', 'success');
                    
                    // Show success animation
                    setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                    }, 1500);
                });
            } catch (e) {
                console.error("Invalid redirect URL:", e);
                // Show error notification
                showToastNotification('Please enter a valid URL', 'error');
                
                // Show error in the button
                setRedirectButton.innerHTML = '<i class="fas fa-times"></i>';
                setTimeout(() => {
                    setRedirectButton.innerHTML = '<i class="fas fa-check"></i>';
                }, 1500);
            }
        }
    }
    
    // Update the ban list display
    function updateBanList(list) {
        banList.innerHTML = '';
        siteCounter.textContent = list.length;
        
        if (list.length === 0) {
            emptyBanList.classList.remove('hidden');
        } else {
            emptyBanList.classList.add('hidden');
            
            list.forEach((domain, index) => {
                const li = document.createElement('li');
                li.style.animationDelay = `${index * 0.05}s`;
                
                const domainSpan = document.createElement('span');
                domainSpan.className = 'domain-name';
                
                // Domain icon
                const icon = document.createElement('i');
                icon.className = 'fas fa-globe domain-icon';
                domainSpan.appendChild(icon);
                
                // Domain text
                const text = document.createTextNode(domain);
                domainSpan.appendChild(text);
                
                li.appendChild(domainSpan);
                
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
            redirectStatus.classList.remove('hidden');
            
            // Try to get favicon
            const favIconUrl = `https://www.google.com/s2/favicons?domain=${url}&sz=64`;
            redirectFavicon.src = favIconUrl;
            
            // Show active status
            redirectStatus.innerHTML = '<i class="fas fa-check-circle"></i> Active';
            redirectStatus.className = 'badge badge-success';
        } else {
            emptyRedirect.classList.remove('hidden');
            currentRedirectDisplay.classList.add('hidden');
            redirectStatus.classList.add('hidden');
        }
    }
    
    // Helper function for toast notifications
    function showToastNotification(message, type = 'info') {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        let icon = '';
        switch (type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            default: icon = '<i class="fas fa-info-circle"></i>';
        }
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);
        
        // Animate toast in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Helper function for animating elements
    function animateElement(element) {
        element.classList.add('animate-pop');
        setTimeout(() => {
            element.classList.remove('animate-pop');
        }, 500);
    }
}); 