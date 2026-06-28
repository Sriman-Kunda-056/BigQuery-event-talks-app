/**
 * BigQuery Release Pulse - Client App Script
 * Handles feed fetching, search, filter, select, character count, and Tweet sharing.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        activeFilter: 'all',
        searchQuery: '',
        isLoading: false
    };

    // DOM Elements
    const elements = {
        btnRefresh: document.getElementById('btn-refresh'),
        refreshIcon: document.getElementById('refresh-icon'),
        connectionBadge: document.getElementById('connection-badge'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        themeIconSun: document.getElementById('theme-icon-sun'),
        themeIconMoon: document.getElementById('theme-icon-moon'),
        btnExportCSV: document.getElementById('btn-export-csv'),
        inputSearch: document.getElementById('input-search'),
        btnClearSearch: document.getElementById('btn-clear-search'),
        pillsContainer: document.getElementById('filter-pills-container'),
        feedContainer: document.getElementById('feed-stream-container'),
        
        detailCardEmpty: document.getElementById('detail-card-empty'),
        detailCardActive: document.getElementById('detail-card-active'),
        detailBadge: document.getElementById('detail-badge'),
        detailDate: document.getElementById('detail-date'),
        detailBody: document.getElementById('detail-body-html'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        btnSelectForTweet: document.getElementById('btn-select-for-tweet'),
        
        textareaTweet: document.getElementById('textarea-tweet'),
        charCounter: document.getElementById('char-counter'),
        progressCircle: document.getElementById('progress-circle'),
        btnShortenTweet: document.getElementById('btn-shorten-tweet'),
        btnTweet: document.getElementById('btn-tweet'),
        toastContainer: document.getElementById('toast-container'),
        
        // Counter labels in pills
        countAll: document.getElementById('count-all'),
        countFeature: document.getElementById('count-feature'),
        countChange: document.getElementById('count-change'),
        countDeprecation: document.getElementById('count-deprecation'),
        countGeneral: document.getElementById('count-general')
    };

    // Constants
    const TWEET_LIMIT = 280;
    const BIGQUERY_NOTES_URL = "https://cloud.google.com/bigquery/docs/release-notes";

    // Progress Ring configuration
    const circleRadius = 9;
    const circleCircumference = 2 * Math.PI * circleRadius;
    elements.progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    elements.progressCircle.style.strokeDashoffset = circleCircumference;

    // Toast System helper
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = '';
        if (type === 'success') {
            iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }
        
        toast.innerHTML = `${iconHtml} <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Helper to get Category Icon
    function getTypeIcon(type) {
        switch (type.toLowerCase()) {
            case 'feature': return '🚀';
            case 'change': return '🔧';
            case 'deprecation': return '⚠️';
            default: return '📝';
        }
    }

    // Helper for Search Keyword Highlighting
    function highlightQuery(text, query) {
        if (!query) return text;
        const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }

    // Load Release Notes from API
    async function loadFeed() {
        if (state.isLoading) return;
        
        state.isLoading = true;
        elements.btnRefresh.classList.add('loading');
        elements.feedContainer.innerHTML = `
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
        `;
        
        try {
            const response = await fetch('/api/feed');
            const data = await response.json();
            
            if (data.success) {
                state.updates = data.updates;
                
                // Show connection status
                elements.connectionBadge.classList.remove('hidden');
                const formattedTime = data.cache_time ? ` (${data.cache_time})` : '';
                
                if (data.cached) {
                    elements.connectionBadge.textContent = `Cached${formattedTime}`;
                    elements.connectionBadge.className = "badge badge-success";
                    elements.connectionBadge.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
                    elements.connectionBadge.style.color = "#f59e0b";
                    showToast("Feed loaded from local cache (offline).", "info");
                } else {
                    elements.connectionBadge.textContent = `Live Feed`;
                    elements.connectionBadge.className = "badge badge-success";
                    elements.connectionBadge.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
                    elements.connectionBadge.style.color = "#10b981";
                    showToast("Successfully fetched fresh release notes!", "success");
                }
                
                updatePillCounts();
                applyFilterAndSearch();
            } else {
                throw new Error(data.error || "Unknown server error");
            }
        } catch (error) {
            console.error("Error fetching release notes:", error);
            elements.feedContainer.innerHTML = `
                <div class="card-empty-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3 style="margin-top: 0.5rem;">Failed to load notes</h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px;">${error.message || 'Please check your backend logs.'}</p>
                    <button class="btn btn-secondary btn-sm" id="btn-retry" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
            document.getElementById('btn-retry')?.addEventListener('click', loadFeed);
            showToast("Failed to retrieve release notes.", "error");
        } finally {
            state.isLoading = false;
            elements.btnRefresh.classList.remove('loading');
        }
    }

    // Helper to calculate total count per type
    function updatePillCounts() {
        const counts = { all: state.updates.length, feature: 0, change: 0, deprecation: 0, general: 0 };
        
        state.updates.forEach(u => {
            const type = u.type.toLowerCase();
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            } else {
                counts.general++;
            }
        });

        elements.countAll.textContent = counts.all;
        elements.countFeature.textContent = counts.feature;
        elements.countChange.textContent = counts.change;
        elements.countDeprecation.textContent = counts.deprecation;
        elements.countGeneral.textContent = counts.general;
    }

    // Filter & Search Logic
    function applyFilterAndSearch() {
        const query = state.searchQuery.toLowerCase().trim();
        
        state.filteredUpdates = state.updates.filter(update => {
            // 1. Filter by Type
            const typeMatches = (state.activeFilter === 'all') || 
                                (update.type.toLowerCase() === state.activeFilter) ||
                                (state.activeFilter === 'general' && !['feature', 'change', 'deprecation'].includes(update.type.toLowerCase()));
            
            // 2. Filter by Search Query
            const searchMatches = !query || 
                                  update.plain_text.toLowerCase().includes(query) || 
                                  update.date.toLowerCase().includes(query) || 
                                  update.type.toLowerCase().includes(query);
            
            return typeMatches && searchMatches;
        });

        renderFeed();
    }

    // Render cards to list view
    function renderFeed() {
        elements.feedContainer.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            elements.feedContainer.innerHTML = `
                <div class="card-empty-state">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <h3 style="margin-top: 0.5rem; font-size: 0.95rem;">No results found</h3>
                    <p style="font-size: 0.8rem;">Try clearing your search query or choosing another category.</p>
                </div>
            `;
            return;
        }

        state.filteredUpdates.forEach(update => {
            const card = document.createElement('div');
            const typeClass = update.type.toLowerCase();
            const isSelected = state.selectedUpdate && state.selectedUpdate.id === update.id;
            
            card.className = `note-card ${['feature', 'change', 'deprecation'].includes(typeClass) ? typeClass : 'general'} ${isSelected ? 'active' : ''}`;
            card.dataset.id = update.id;
            
            // Generate a short excerpt
            let excerpt = update.plain_text;
            if (excerpt.length > 120) {
                excerpt = excerpt.substring(0, 115) + '...';
            }
            
            // Apply search term highlighting to card body text
            const highlightedExcerpt = highlightQuery(excerpt, state.searchQuery);
            const icon = getTypeIcon(update.type);
            
            card.innerHTML = `
                <div class="note-card-header">
                    <span class="note-card-date">${update.date}</span>
                    <div class="note-card-actions">
                        <button class="card-copy-btn" title="Copy update text">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="card-share-btn" title="Quick tweet on X">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                            </svg>
                        </button>
                        <span class="type-badge ${['feature', 'change', 'deprecation'].includes(typeClass) ? typeClass : 'general'}">${icon} ${update.type}</span>
                    </div>
                </div>
                <div class="note-card-excerpt">${highlightedExcerpt}</div>
            `;
            
            // Copy Card Button
            const copyBtn = card.querySelector('.card-copy-btn');
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(update.plain_text);
                    showToast("Copied card text!", "success");
                } catch (err) {
                    const input = document.createElement('textarea');
                    input.value = update.plain_text;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    showToast("Copied card text!", "success");
                }
            });

            // Quick Tweet Card Button
            const shareBtn = card.querySelector('.card-share-btn');
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectUpdate(update);
                loadIntoComposer();
                shareOnTwitter();
            });

            card.addEventListener('click', () => selectUpdate(update));
            elements.feedContainer.appendChild(card);
        });
    }

    // Select note update and load details
    function selectUpdate(update) {
        state.selectedUpdate = update;
        
        // Highlight active card
        document.querySelectorAll('.note-card').forEach(card => {
            if (card.dataset.id === update.id) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // Show detail view
        elements.detailCardEmpty.classList.add('hidden');
        elements.detailCardActive.classList.remove('hidden');
        
        // Update details elements
        const typeClass = update.type.toLowerCase();
        elements.detailBadge.className = `badge ${['feature', 'change', 'deprecation'].includes(typeClass) ? 'badge-' + (typeClass === 'feature' ? 'success' : typeClass === 'change' ? 'info' : 'danger') : 'badge-general'}`;
        
        const icon = getTypeIcon(update.type);
        elements.detailBadge.textContent = `${icon} ${update.type}`;
        elements.detailBadge.style.backgroundColor = typeClass === 'feature' ? 'var(--color-success-light)' : typeClass === 'change' ? 'var(--color-info-light)' : typeClass === 'deprecation' ? 'var(--color-danger-light)' : 'rgba(255, 255, 255, 0.08)';
        elements.detailBadge.style.color = typeClass === 'feature' ? 'var(--color-success)' : typeClass === 'change' ? 'var(--color-info)' : typeClass === 'deprecation' ? 'var(--color-danger)' : 'var(--text-secondary)';
        
        elements.detailDate.textContent = update.date;
        elements.detailBody.innerHTML = update.raw_html;
        
        // Auto-scroll detail view to top
        elements.detailBody.parentElement.scrollTop = 0;
    }

    // Load Selected Update Into Tweet Composer
    function loadIntoComposer() {
        if (!state.selectedUpdate) return;
        
        const update = state.selectedUpdate;
        // Draft format template:
        // [Google Cloud BigQuery Update]
        // Date: [Date]
        // Type: [Type]
        // Description: [Text...]
        // Link: [URL]
        
        const typeHeader = update.type.toUpperCase();
        let tweetContent = `📢 BigQuery Update (${update.date}) [${typeHeader}]:\n\n${update.plain_text}`;
        
        // Add link
        const linkStr = `\n\nRelease notes: ${BIGQUERY_NOTES_URL}`;
        
        // If content is too long, we will truncate the plain_text component to fit exactly
        const baseLength = `📢 BigQuery Update (${update.date}) [${typeHeader}]:\n\n`.length + linkStr.length;
        const maxTextLength = TWEET_LIMIT - baseLength - 4; // -4 for the "..."
        
        if (tweetContent.length + linkStr.length > TWEET_LIMIT) {
            const cleanExcerpt = update.plain_text.substring(0, maxTextLength).trim() + "...";
            tweetContent = `📢 BigQuery Update (${update.date}) [${typeHeader}]:\n\n${cleanExcerpt}${linkStr}`;
        } else {
            tweetContent = tweetContent + linkStr;
        }

        elements.textareaTweet.value = tweetContent;
        updateTweetStats();
        showToast("Loaded update into Composer!", "success");
    }

    // Update Tweet character counter and circular progress ring
    function updateTweetStats() {
        const text = elements.textareaTweet.value;
        const len = text.length;
        
        elements.charCounter.textContent = `${len} / ${TWEET_LIMIT}`;
        
        // Update circular indicator
        if (len === 0) {
            elements.progressCircle.style.strokeDashoffset = circleCircumference;
            elements.progressCircle.style.stroke = "var(--color-primary)";
            elements.btnTweet.disabled = true;
            return;
        }

        elements.btnTweet.disabled = false;
        
        const percent = Math.min((len / TWEET_LIMIT) * 100, 100);
        const offset = circleCircumference - (percent / 100) * circleCircumference;
        elements.progressCircle.style.strokeDashoffset = offset;
        
        // Color changes near limit
        const remaining = TWEET_LIMIT - len;
        if (remaining < 0) {
            elements.progressCircle.style.stroke = "var(--color-danger)";
            elements.charCounter.style.color = "var(--color-danger)";
            elements.btnTweet.disabled = true;
        } else if (remaining <= 20) {
            elements.progressCircle.style.stroke = "var(--color-warning)";
            elements.charCounter.style.color = "var(--color-warning)";
        } else {
            elements.progressCircle.style.stroke = "var(--color-primary)";
            elements.charCounter.style.color = "var(--text-secondary)";
        }
    }

    // Smart-Shorten Template
    function smartShortenTweet() {
        const text = elements.textareaTweet.value;
        if (!text) return;
        
        if (text.length <= TWEET_LIMIT) {
            showToast("Tweet already fits within the 280-char limit!", "info");
            return;
        }
        
        // Extract type and date if possible, otherwise create basic template
        const match = text.match(/📢 BigQuery Update \((.*?)\) \[(.*?)\]:/);
        const date = match ? match[1] : (state.selectedUpdate ? state.selectedUpdate.date : "Recent");
        const type = match ? match[2] : (state.selectedUpdate ? state.selectedUpdate.type.toUpperCase() : "UPDATE");
        
        const header = `⚡ BQ ${type} (${date}): `;
        const footer = `\n🔗 ${BIGQUERY_NOTES_URL}`;
        
        const availableTextLen = TWEET_LIMIT - header.length - footer.length - 4; // -4 for "..."
        
        // Try to retrieve text content to shorten
        let bodyText = text.replace(/📢 BigQuery Update \(.*?\) \[.*?\]:/, '').replace(/Release notes: .*/, '').trim();
        if (!bodyText && state.selectedUpdate) {
            bodyText = state.selectedUpdate.plain_text;
        }
        
        const shortenedBody = bodyText.substring(0, availableTextLen).trim() + "...";
        elements.textareaTweet.value = `${header}${shortenedBody}${footer}`;
        updateTweetStats();
        showToast("Tweet automatically shortened to fit limit!", "success");
    }

    // Tweet Execution on X (Web Intent)
    function shareOnTwitter() {
        const tweetText = elements.textareaTweet.value;
        if (!tweetText || tweetText.length > TWEET_LIMIT) return;
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        showToast("Redirecting to X...", "success");
    }

    // Theme Toggle Function
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            elements.themeIconSun.classList.add('hidden');
            elements.themeIconMoon.classList.remove('hidden');
        } else {
            document.body.classList.remove('light-theme');
            elements.themeIconSun.classList.remove('hidden');
            elements.themeIconMoon.classList.add('hidden');
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            elements.themeIconSun.classList.add('hidden');
            elements.themeIconMoon.classList.remove('hidden');
            showToast("Switched to Light Mode", "info");
        } else {
            localStorage.setItem('theme', 'dark');
            elements.themeIconSun.classList.remove('hidden');
            elements.themeIconMoon.classList.add('hidden');
            showToast("Switched to Dark Mode", "info");
        }
    }

    // Export to CSV Function
    function exportToCSV() {
        if (state.filteredUpdates.length === 0) {
            showToast("No updates available to export.", "error");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // CSV Headers
        csvContent += '"Date","Type","Content"\r\n';
        
        // CSV Rows
        state.filteredUpdates.forEach(update => {
            // Escape double quotes by doubling them
            const escapedContent = update.plain_text.replace(/"/g, '""');
            const escapedType = update.type.replace(/"/g, '""');
            const escapedDate = update.date.replace(/"/g, '""');
            
            csvContent += `"${escapedDate}","${escapedType}","${escapedContent}"\r\n`;
        });
        
        // Trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bigquery_release_notes_${state.activeFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${state.filteredUpdates.length} updates!`, "success");
    }

    // Event Listeners
    elements.btnRefresh.addEventListener('click', loadFeed);
    
    // Theme Toggle
    elements.btnThemeToggle.addEventListener('click', toggleTheme);

    // CSV Export
    elements.btnExportCSV.addEventListener('click', exportToCSV);

    // Search event
    elements.inputSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery.trim().length > 0) {
            elements.btnClearSearch.classList.remove('hidden');
        } else {
            elements.btnClearSearch.classList.add('hidden');
        }
        applyFilterAndSearch();
    });
    
    elements.btnClearSearch.addEventListener('click', () => {
        elements.inputSearch.value = '';
        state.searchQuery = '';
        elements.btnClearSearch.classList.add('hidden');
        applyFilterAndSearch();
    });

    // Filtering Pills
    elements.pillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        state.activeFilter = pill.dataset.type;
        applyFilterAndSearch();
    });

    // Copy URL helper
    elements.btnCopyLink.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(BIGQUERY_NOTES_URL);
            showToast("Release Notes link copied to clipboard!", "success");
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = BIGQUERY_NOTES_URL;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast("Release Notes link copied to clipboard!", "success");
        }
    });

    // Select for Tweet button click
    elements.btnSelectForTweet.addEventListener('click', loadIntoComposer);
    
    // Tweet composer keyboard tracking
    elements.textareaTweet.addEventListener('input', updateTweetStats);
    
    // Shorten button
    elements.btnShortenTweet.addEventListener('click', smartShortenTweet);
    
    // Tweet button
    elements.btnTweet.addEventListener('click', shareOnTwitter);

    // Initial load
    initTheme();
    loadFeed();
});
