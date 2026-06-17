/**
 * BigQuery Release Board - Frontend Application Logic
 * Implements fetching, filtering, searching, selection, and tweet composition.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        searchTerm: '',
        activeFilter: 'all',
        hashtagStates: {
            '#BigQuery': true,
            '#GoogleCloud': true,
            '#DataEngineering': false,
            '#GenerativeAI': false
        }
    };

    // --- DOM Elements ---
    const elements = {
        btnRefresh: document.getElementById('btn-refresh'),
        refreshIcon: document.getElementById('refresh-icon'),
        btnExportCSV: document.getElementById('btn-export-csv'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        updateCount: document.getElementById('update-count'),
        statsBadge: document.getElementById('stats-badge'),
        
        searchInput: document.getElementById('search-input'),
        btnClearSearch: document.getElementById('btn-clear-search'),
        filterChips: document.querySelectorAll('#filter-chips .chip'),
        
        feedContainer: document.getElementById('feed-container'),
        loadingState: document.getElementById('loading-state'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        emptyState: document.getElementById('empty-state'),
        notesList: document.getElementById('notes-list'),
        btnRetry: document.getElementById('btn-retry'),
        btnResetFilters: document.getElementById('btn-reset-filters'),
        
        composerPlaceholder: document.getElementById('composer-placeholder'),
        composerForm: document.getElementById('composer-form'),
        composerDate: document.getElementById('composer-date'),
        composerTypeBadge: document.getElementById('composer-type-badge'),
        composerExcerpt: document.getElementById('composer-excerpt'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        charProgressCircle: document.getElementById('char-progress-circle'),
        charCount: document.getElementById('char-count'),
        btnCopy: document.getElementById('btn-copy'),
        btnTweet: document.getElementById('btn-tweet'),
        tagChipsContainer: document.querySelector('.hashtag-chips'),
        
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message')
    };

    // --- Constants ---
    const OFFICIAL_URL = "https://cloud.google.com/bigquery/docs/release-notes";
    const TWITTER_CHAR_LIMIT = 280;
    // Circular progress ring length (2 * PI * r) where r=14
    const CIRCLE_CIRCUMFERENCE = 88;

    // Initialize circular progress ring
    elements.charProgressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    elements.charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;

    // --- API Interactions ---
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoading(true);
        try {
            const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message);
            }
            
            state.updates = data.updates;
            applyFilters();
            
            // Show toast if forced refresh succeeded
            if (forceRefresh) {
                showToast("Releases synchronized successfully!");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            elements.errorMessage.textContent = error.message || "Failed to load release notes. Check server connection.";
            setErrorState(true);
        } finally {
            setLoading(false);
        }
    }

    // --- UI Helper Functions ---
    function setLoading(isLoading) {
        if (isLoading) {
            elements.loadingState.style.display = 'flex';
            elements.notesList.style.display = 'none';
            elements.errorState.style.display = 'none';
            elements.emptyState.style.display = 'none';
            elements.refreshIcon.classList.add('fa-spin-fast');
            elements.btnRefresh.disabled = true;
        } else {
            elements.loadingState.style.display = 'none';
            elements.refreshIcon.classList.remove('fa-spin-fast');
            elements.btnRefresh.disabled = false;
        }
    }

    function setErrorState(isError) {
        if (isError) {
            elements.errorState.style.display = 'flex';
            elements.notesList.style.display = 'none';
            elements.loadingState.style.display = 'none';
            elements.emptyState.style.display = 'none';
        } else {
            elements.errorState.style.display = 'none';
        }
    }

    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }

    // --- Search & Filtering Logic ---
    function applyFilters() {
        // Reset selections
        state.selectedUpdate = null;
        updateComposerUI();

        let filtered = [...state.updates];

        // 1. Text Search Filter
        if (state.searchTerm) {
            const query = state.searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.raw_text.toLowerCase().includes(query) || 
                item.type.toLowerCase().includes(query) ||
                item.date.toLowerCase().includes(query)
            );
            elements.btnClearSearch.style.display = 'block';
        } else {
            elements.btnClearSearch.style.display = 'none';
        }

        // 2. Category Type Filter
        if (state.activeFilter !== 'all') {
            filtered = filtered.filter(item => item.type === state.activeFilter);
        }

        state.filteredUpdates = filtered;
        renderFeed();
        
        // Update stats badge
        elements.updateCount.textContent = `${state.filteredUpdates.length} notes found`;
    }

    // --- Render Feed Lists ---
    function renderFeed() {
        elements.notesList.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            elements.notesList.style.display = 'none';
            elements.emptyState.style.display = 'flex';
            return;
        }

        elements.emptyState.style.display = 'none';
        elements.notesList.style.display = 'flex';

        // Group cards by date for cleaner visual organization if preferred,
        // or render flat timeline. A flat timeline of cards with date badges is cleaner
        // for selecting individual updates.
        state.filteredUpdates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.id = `card-${update.id}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            
            // Check if selected
            if (state.selectedUpdate && state.selectedUpdate.id === update.id) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-date">
                        <i class="far fa-calendar-alt"></i> ${update.date}
                    </span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="btn-card-copy" title="Copy raw text to clipboard" aria-label="Copy text">
                            <i class="far fa-copy"></i>
                        </button>
                        <span class="type-badge" data-type="${update.type}">${update.type}</span>
                    </div>
                </div>
                <div class="card-content-wrapper">
                    ${update.content_body_html}
                </div>
                <div class="card-hover-prompt">
                    <i class="far fa-edit"></i> Select to Tweet
                </div>
            `;

            // Card Copy Button Event Listener
            const btnCopyCard = card.querySelector('.btn-card-copy');
            btnCopyCard.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card selection from firing
                navigator.clipboard.writeText(update.raw_text)
                    .then(() => {
                        showToast("Release text copied to clipboard!");
                    })
                    .catch(err => {
                        console.error("Card copy failed:", err);
                        showToast("Failed to copy card text.");
                    });
            });

            // Event Listeners for Selection
            card.addEventListener('click', () => selectUpdate(update));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectUpdate(update);
                }
            });

            elements.notesList.appendChild(card);
        });
    }

    // --- Selection & Composer UI Sync ---
    function selectUpdate(update) {
        // Toggle selection off if already selected
        if (state.selectedUpdate && state.selectedUpdate.id === update.id) {
            state.selectedUpdate = null;
        } else {
            state.selectedUpdate = update;
        }

        // Update card selected classes in UI
        document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
        if (state.selectedUpdate) {
            const selectedCard = document.getElementById(`card-${update.id}`);
            if (selectedCard) selectedCard.classList.add('selected');
        }

        updateComposerUI();
    }

    function updateComposerUI() {
        if (!state.selectedUpdate) {
            elements.composerPlaceholder.style.display = 'flex';
            elements.composerForm.style.display = 'none';
            return;
        }

        const update = state.selectedUpdate;

        // Show form & populate details
        elements.composerPlaceholder.style.display = 'none';
        elements.composerForm.style.display = 'flex';
        
        elements.composerDate.textContent = update.date;
        elements.composerTypeBadge.textContent = update.type;
        elements.composerTypeBadge.setAttribute('data-type', update.type);
        
        // Show rich HTML preview of original note
        elements.composerExcerpt.innerHTML = update.content_body_html;
        
        // Construct Initial Tweet text
        const tweetText = generateTweetTemplate(update);
        elements.tweetTextarea.value = tweetText;
        
        updateCharacterCounter();
        renderHashtagChips();
    }

    // --- Tweet Template Builder ---
    function generateTweetTemplate(update) {
        const typeEmoji = getEmojiForType(update.type);
        const prefix = `${typeEmoji} Google Cloud #BigQuery ${update.type} (${update.date}):\n`;
        const link = `\n\nRelease notes: ${OFFICIAL_URL}`;
        
        // Let's see how much space we have for the main content
        const activeHashtags = Object.keys(state.hashtagStates)
            .filter(tag => state.hashtagStates[tag])
            .join(' ');
            
        const suffix = (activeHashtags ? `\n\n${activeHashtags}` : '') + link;
        
        const reservedLength = prefix.length + suffix.length;
        const availableLength = TWITTER_CHAR_LIMIT - reservedLength;
        
        let bodyText = update.raw_text;
        
        // Truncate body if it exceeds available space
        if (bodyText.length > availableLength) {
            bodyText = bodyText.substring(0, availableLength - 4).trim() + "...";
        }
        
        return `${prefix}${bodyText}${suffix}`;
    }

    function getEmojiForType(type) {
        switch(type) {
            case 'Feature': return '🚀';
            case 'Announcement': return '📢';
            case 'Breaking': return '⚠️';
            case 'Change': return '🔄';
            case 'Deprecation': return '🛑';
            case 'Fixed': return '✅';
            default: return '⚡';
        }
    }

    // --- Character Counter Circular Progress ---
    function updateCharacterCounter() {
        const text = elements.tweetTextarea.value;
        const count = text.length;
        const remaining = TWITTER_CHAR_LIMIT - count;
        
        // Update text counter
        elements.charCount.textContent = remaining;
        
        // Manage warning states
        elements.charCount.classList.remove('warning', 'danger');
        if (remaining <= 30 && remaining > 0) {
            elements.charCount.classList.add('warning');
        } else if (remaining <= 0) {
            elements.charCount.classList.add('danger');
        }
        
        // Update SVG Progress Ring
        const progress = Math.min(count, TWITTER_CHAR_LIMIT);
        const offset = CIRCLE_CIRCUMFERENCE - (progress / TWITTER_CHAR_LIMIT) * CIRCLE_CIRCUMFERENCE;
        elements.charProgressCircle.style.strokeDashoffset = offset;
        
        // Change ring color based on capacity
        if (remaining <= 0) {
            elements.charProgressCircle.style.stroke = 'var(--type-breaking)';
            elements.btnTweet.disabled = true;
        } else if (remaining <= 30) {
            elements.charProgressCircle.style.stroke = 'var(--type-change)';
            elements.btnTweet.disabled = false;
        } else {
            elements.charProgressCircle.style.stroke = 'var(--color-accent)';
            elements.btnTweet.disabled = false;
        }
    }

    // --- Hashtags Chips Rendering & Interactivity ---
    function renderHashtagChips() {
        elements.tagChipsContainer.innerHTML = '';
        
        Object.keys(state.hashtagStates).forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-chip ${state.hashtagStates[tag] ? 'active' : ''}`;
            btn.textContent = tag.startsWith('#') ? tag : `#${tag}`;
            btn.setAttribute('type', 'button');
            
            btn.addEventListener('click', () => toggleHashtag(tag));
            elements.tagChipsContainer.appendChild(btn);
        });
    }

    function toggleHashtag(tag) {
        state.hashtagStates[tag] = !state.hashtagStates[tag];
        
        // Re-generate tweet with new tag configurations, 
        // but preserve user modifications as much as possible.
        // For a seamless UX, if the user turns on a tag: append it. If off: remove it.
        let text = elements.tweetTextarea.value;
        
        if (state.hashtagStates[tag]) {
            // Append tag right before the release notes URL link
            const urlIndex = text.indexOf(OFFICIAL_URL);
            if (urlIndex !== -1) {
                const textBeforeUrl = text.substring(0, urlIndex).trim();
                const textAfterUrl = text.substring(urlIndex);
                
                // Add a newline if there are no tags yet, otherwise space
                const hasOtherTags = Object.keys(state.hashtagStates)
                    .some(t => t !== tag && state.hashtagStates[t] && textBeforeUrl.includes(t));
                
                const separator = hasOtherTags ? ' ' : '\n\n';
                elements.tweetTextarea.value = `${textBeforeUrl}${separator}${tag}\n\n${textAfterUrl}`;
            } else {
                elements.tweetTextarea.value = `${text.trim()} ${tag}`;
            }
        } else {
            // Remove tag from text (including surrounding whitespace)
            const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const tagRegex = new RegExp(`(\\s*${escapedTag})`, 'g');
            elements.tweetTextarea.value = text.replace(tagRegex, '').trim();
            
            // Ensure double linebreaks before URL are cleaned up if no hashtags remain
            const urlIndex = elements.tweetTextarea.value.indexOf(OFFICIAL_URL);
            if (urlIndex !== -1) {
                let partBefore = elements.tweetTextarea.value.substring(0, urlIndex);
                const partAfter = elements.tweetTextarea.value.substring(urlIndex);
                
                // Clean up trailing whitespace and standard double space formatting
                partBefore = partBefore.replace(/\n\s*\n$/, '\n\n');
                elements.tweetTextarea.value = partBefore + partAfter;
            }
        }
        
        renderHashtagChips();
        updateCharacterCounter();
    }

    // --- Clipboard & Tweeting Integrations ---
    function copyTweetToClipboard() {
        const text = elements.tweetTextarea.value;
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast("Tweet text copied to clipboard!");
            })
            .catch(err => {
                console.error("Clipboard copy failed:", err);
                // Fallback to select & copy manually alert if fails
                elements.tweetTextarea.select();
                showToast("Failed to copy automatically. Please copy selected text.");
            });
    }

    function shareOnTwitter() {
        const text = elements.tweetTextarea.value;
        const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    // --- Export current notes to CSV ---
    function exportToCSV() {
        const dataToExport = state.filteredUpdates;
        if (dataToExport.length === 0) {
            showToast("No release notes to export.");
            return;
        }

        // Helper to escape CSV values properly
        const escapeCSVValue = (val) => {
            if (val === null || val === undefined) return '';
            let formatted = val.toString().replace(/"/g, '""');
            if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
                formatted = `"${formatted}"`;
            }
            return formatted;
        };

        const headers = ["ID", "Date", "ISO Date", "Type", "Raw Text"];
        const rows = dataToExport.map(update => [
            update.id,
            update.date,
            update.iso_date,
            update.type,
            update.raw_text
        ]);

        const csvContent = [
            headers.map(escapeCSVValue).join(','),
            ...rows.map(row => row.map(escapeCSVValue).join(','))
        ].join('\n');

        // Create Blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        // Dynamic file name based on current date & filters
        const filterStr = state.activeFilter !== 'all' ? `_${state.activeFilter.toLowerCase()}` : '';
        const searchStr = state.searchTerm ? `_search` : '';
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `bigquery_release_notes_${dateStr}${filterStr}${searchStr}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CSV export started!");
    }

    // --- Theme Switcher Logic ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update toggle icon classes
        if (theme === 'light') {
            elements.themeIcon.className = 'fas fa-sun';
            elements.btnThemeToggle.title = 'Switch to Dark Mode';
        } else {
            elements.themeIcon.className = 'fas fa-moon';
            elements.btnThemeToggle.title = 'Switch to Light Mode';
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }

    // --- Event Listeners Setup ---
    
    // Sync Button Click
    elements.btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Export CSV Click
    elements.btnExportCSV.addEventListener('click', exportToCSV);

    // Theme Toggle Click
    elements.btnThemeToggle.addEventListener('click', toggleTheme);

    // Retry Button Click
    elements.btnRetry.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search Input Change
    elements.searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        applyFilters();
    });

    // Clear Search Click
    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchTerm = '';
        applyFilters();
    });

    // Filter Chips Click
    elements.filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            elements.filterChips.forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-checked', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-checked', 'true');
            
            state.activeFilter = chip.getAttribute('data-filter');
            applyFilters();
        });
    });

    // Reset Filters Click
    elements.btnResetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchTerm = '';
        
        elements.filterChips.forEach(c => c.classList.remove('active'));
        const allChip = document.querySelector('[data-filter="all"]');
        if (allChip) allChip.classList.add('active');
        
        state.activeFilter = 'all';
        applyFilters();
    });

    // Text Area Input Changes (manual typing)
    elements.tweetTextarea.addEventListener('input', updateCharacterCounter);

    // Copy Button Click
    elements.btnCopy.addEventListener('click', copyTweetToClipboard);

    // Tweet Button Click
    elements.btnTweet.addEventListener('click', shareOnTwitter);

    // --- Initial Load ---
    initTheme();
    fetchReleaseNotes(false);
});
