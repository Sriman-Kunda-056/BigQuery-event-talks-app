const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const TWEET_LIMIT = 280;
const NOTES_URL = 'https://cloud.google.com/bigquery/docs/release-notes';
const FILTERS = [
    ['all', 'All'],
    ['feature', 'Features'],
    ['change', 'Changes'],
    ['deprecation', 'Deprecations'],
    ['general', 'General']
];

const ICONS = {
    database: ['M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
    refresh: ['M20 12a8 8 0 0 1-13.7 5.6', 'M4 12A8 8 0 0 1 17.7 6.4', 'M18 2v5h-5', 'M6 22v-5h5'],
    download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
    sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
    moon: ['M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8z'],
    search: ['M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4z', 'M16 16l4 4'],
    close: ['M18 6L6 18', 'M6 6l12 12'],
    copy: ['M9 9h11v11H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
    external: ['M14 3h7v7', 'M10 14L21 3', 'M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5'],
    pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'],
    spark: ['M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z', 'M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z'],
    change: ['M17 1l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 23l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
    alert: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
    note: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h5'],
    link: ['M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2', 'M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2'],
    magic: ['M15 4V2', 'M15 16v-2', 'M8 9H6', 'M20 9h-2', 'M3 21l9.5-9.5', 'M12.5 11.5l-2-2'],
    x: ['M4 4l16 16', 'M20 4L4 20']
};

function cx(...items) {
    return items.filter(Boolean).join(' ');
}

function Icon({ name, size = 18 }) {
    return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true'
    }, (ICONS[name] || ICONS.note).map((d, index) => h('path', { key: index, d })));
}

function Button({ children, icon, variant = 'secondary', size = 'md', className = '', ...props }) {
    return h('button', {
        ...props,
        className: cx('button', `button-${variant}`, `button-${size}`, className)
    }, icon ? h(Icon, { name: icon, size: size === 'sm' ? 15 : 17 }) : null, children ? h('span', null, children) : null);
}

function normalizeType(type) {
    const value = String(type || 'general').toLowerCase();
    return ['feature', 'change', 'deprecation'].includes(value) ? value : 'general';
}

function typeMeta(type) {
    const key = normalizeType(type);
    return {
        key,
        label: key === 'feature' ? 'Feature' : key === 'change' ? 'Change' : key === 'deprecation' ? 'Deprecation' : 'General',
        icon: key === 'feature' ? 'spark' : key === 'change' ? 'change' : key === 'deprecation' ? 'alert' : 'note'
    };
}

function compactText(value, maxLength) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    const cut = clean.slice(0, Math.max(0, maxLength - 3)).trim();
    const lastSpace = cut.lastIndexOf(' ');
    return `${lastSpace > 42 ? cut.slice(0, lastSpace) : cut}...`;
}

function highlighted(value, query) {
    const text = String(value || '');
    const term = String(query || '').trim();
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) => (
        index % 2 ? h('mark', { key: `${part}-${index}`, className: 'highlight' }, part) : part
    ));
}

function TypeBadge({ type }) {
    const meta = typeMeta(type);
    return h('span', { className: cx('type-badge', `type-${meta.key}`) },
        h(Icon, { name: meta.icon, size: 13 }),
        h('span', null, meta.label)
    );
}

function Toasts({ items }) {
    return h('div', { className: 'toast-stack', 'aria-live': 'polite' }, items.map(toast => h('div', {
        key: toast.id,
        className: cx('toast', `toast-${toast.type}`)
    }, h(Icon, { name: toast.type === 'error' ? 'alert' : toast.type === 'success' ? 'spark' : 'note', size: 16 }), h('span', null, toast.message))));
}

function Header({ status, theme, loading, onRefresh, onExport, onTheme }) {
    return h('header', { className: 'topbar' }, h('div', { className: 'topbar-inner' },
        h('div', { className: 'brand' },
            h('div', { className: 'brand-mark' }, h(Icon, { name: 'database', size: 23 })),
            h('div', { className: 'brand-copy' }, h('h1', null, 'BigQuery Release Pulse'), h('p', null, 'Release feed and post composer'))
        ),
        h('div', { className: 'topbar-actions' },
            status ? h('span', { className: cx('status-pill', status.cached ? 'status-cached' : 'status-live') }, h('span', { className: 'status-dot' }), status.label) : null,
            h(Button, { icon: theme === 'dark' ? 'sun' : 'moon', className: 'icon-only', title: 'Toggle theme', 'aria-label': 'Toggle theme', onClick: onTheme }),
            h(Button, { icon: 'download', title: 'Export filtered releases as CSV', onClick: onExport }, 'Export'),
            h(Button, { icon: 'refresh', variant: 'primary', className: loading ? 'is-loading' : '', disabled: loading, title: 'Refresh release notes', onClick: onRefresh }, loading ? 'Refreshing' : 'Refresh')
        )
    ));
}

function Metrics({ counts }) {
    const items = [['All', counts.all, 'all'], ['Features', counts.feature, 'feature'], ['Changes', counts.change, 'change'], ['Deprecations', counts.deprecation, 'deprecation']];
    return h('section', { className: 'metric-row', 'aria-label': 'Release summary' }, items.map(([label, value, key]) => h('div', {
        key,
        className: cx('metric', `metric-${key}`)
    }, h('span', { className: 'metric-label' }, label), h('strong', null, value))));
}

function Controls({ query, activeFilter, counts, setQuery, setFilter }) {
    return h('div', { className: 'controls' },
        h('label', { className: 'search-field' },
            h(Icon, { name: 'search', size: 17 }),
            h('span', { className: 'sr-only' }, 'Search release notes'),
            h('input', { value: query, onChange: event => setQuery(event.target.value), placeholder: 'Search dates, types, or release text', autoComplete: 'off' }),
            query ? h('button', { className: 'clear-button', type: 'button', title: 'Clear search', 'aria-label': 'Clear search', onClick: () => setQuery('') }, h(Icon, { name: 'close', size: 14 })) : null
        ),
        h('div', { className: 'segment-group', role: 'tablist', 'aria-label': 'Release type filters' }, FILTERS.map(([key, label]) => h('button', {
            key,
            className: cx('segment', activeFilter === key && 'is-active'),
            type: 'button',
            role: 'tab',
            'aria-selected': activeFilter === key,
            onClick: () => setFilter(key)
        }, h('span', null, label), h('strong', null, counts[key]))))
    );
}

function EmptyState({ icon = 'note', title, body, action }) {
    return h('div', { className: 'empty-state' },
        h('div', { className: 'empty-icon' }, h(Icon, { name: icon, size: 28 })),
        h('h2', null, title),
        body ? h('p', null, body) : null,
        action || null
    );
}

function SkeletonList() {
    return h('div', { className: 'feed-list' }, [0, 1, 2, 3].map(index => h('div', { key: index, className: 'feed-card skeleton-card' },
        h('div', { className: 'skeleton-line skeleton-short' }),
        h('div', { className: 'skeleton-line' }),
        h('div', { className: 'skeleton-line skeleton-mid' })
    )));
}

function FeedCard({ update, selected, query, onSelect, onCopy, onShare }) {
    const meta = typeMeta(update.type);
    return h('article', {
        className: cx('feed-card', `feed-card-${meta.key}`, selected && 'is-selected'),
        role: 'button',
        tabIndex: 0,
        onClick: () => onSelect(update),
        onKeyDown: event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(update);
            }
        }
    },
        h('div', { className: 'feed-card-top' },
            h('span', { className: 'feed-date' }, update.date),
            h('div', { className: 'feed-actions' },
                h('button', { type: 'button', title: 'Copy release text', 'aria-label': 'Copy release text', onClick: event => { event.stopPropagation(); onCopy(update.plain_text); } }, h(Icon, { name: 'copy', size: 15 })),
                h('button', { type: 'button', title: 'Open post composer', 'aria-label': 'Open post composer', onClick: event => { event.stopPropagation(); onShare(update); } }, h(Icon, { name: 'external', size: 15 })),
                h(TypeBadge, { type: update.type })
            )
        ),
        h('p', { className: 'feed-excerpt' }, highlighted(compactText(update.plain_text, 190), query))
    );
}

function FeedPanel({ loading, error, updates, selectedId, query, onSelect, onCopy, onShare, onRetry }) {
    if (loading) return h(SkeletonList);
    if (error) return h(EmptyState, { icon: 'alert', title: 'Release feed unavailable', body: error, action: h(Button, { icon: 'refresh', variant: 'primary', size: 'sm', onClick: onRetry }, 'Retry') });
    if (!updates.length) return h(EmptyState, { icon: 'search', title: 'No matching releases', body: 'Clear the search or switch filters.' });
    return h('div', { className: 'feed-list' }, updates.map(update => h(FeedCard, {
        key: update.id,
        update,
        selected: selectedId === update.id,
        query,
        onSelect,
        onCopy,
        onShare
    })));
}

function DetailPanel({ selected, onCopyLink, onLoadComposer }) {
    if (!selected) {
        return h('section', { className: 'panel detail-panel' }, h(EmptyState, { icon: 'note', title: 'No update selected', body: 'The selected release details appear here.' }));
    }
    return h('section', { className: 'panel detail-panel' },
        h('div', { className: 'panel-heading' },
            h('div', null, h('p', { className: 'eyebrow' }, 'Selected release'), h('h2', null, selected.date)),
            h(TypeBadge, { type: selected.type })
        ),
        h('div', { className: 'release-body', dangerouslySetInnerHTML: { __html: selected.raw_html } }),
        h('div', { className: 'panel-actions' },
            h(Button, { icon: 'link', size: 'sm', onClick: onCopyLink }, 'Copy Link'),
            h(Button, { icon: 'pencil', size: 'sm', variant: 'primary-soft', onClick: onLoadComposer }, 'Load Composer')
        )
    );
}

function Composer({ value, selected, setValue, onShorten, onPost, onUseSelected }) {
    const length = value.length;
    const remaining = TWEET_LIMIT - length;
    const percent = Math.min(100, Math.max(0, (length / TWEET_LIMIT) * 100));
    const state = remaining < 0 ? 'danger' : remaining <= 20 ? 'warning' : 'ok';
    return h('section', { className: 'panel composer-panel' },
        h('div', { className: 'panel-heading' },
            h('div', null, h('p', { className: 'eyebrow' }, 'X post'), h('h2', null, 'Composer')),
            h('span', { className: cx('char-pill', `char-${state}`) }, `${length} / ${TWEET_LIMIT}`)
        ),
        h('div', { className: 'post-preview' },
            h('div', { className: 'avatar' }, 'BQ'),
            h('div', { className: 'post-content' },
                h('div', { className: 'post-meta' }, h('strong', null, 'BigQuery Releases'), h('span', null, '@BQReleasePulse'), h('span', null, 'now')),
                h('textarea', { value, onChange: event => setValue(event.target.value), rows: 7, placeholder: selected ? 'Draft text for this release' : 'Choose a release or write a post' }),
                value.includes('cloud.google.com') ? h('div', { className: 'link-preview' }, h('span', null, 'cloud.google.com'), h('strong', null, 'BigQuery release notes'), h('p', null, 'Official Google Cloud documentation')) : null
            )
        ),
        h('div', { className: 'progress-track', 'aria-hidden': 'true' }, h('span', { className: cx('progress-fill', `progress-${state}`), style: { width: `${percent}%` } })),
        h('div', { className: 'composer-footer' },
            h('p', { className: cx('remaining-text', `remaining-${state}`) }, remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} remaining`),
            h('div', { className: 'composer-actions' },
                h(Button, { icon: 'pencil', size: 'sm', disabled: !selected, onClick: onUseSelected }, 'Use Selected'),
                h(Button, { icon: 'magic', size: 'sm', disabled: !value, onClick: onShorten }, 'Shorten'),
                h(Button, { icon: 'x', size: 'sm', variant: 'primary', disabled: !value || length > TWEET_LIMIT, onClick: onPost }, 'Post')
            )
        )
    );
}

function App() {
    const [updates, setUpdates] = useState([]);
    const [selected, setSelected] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState(null);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [composerText, setComposerText] = useState('');
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);

    function showToast(message, type = 'info') {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(current => [...current, { id, message, type }]);
        window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 3600);
    }

    async function copyText(text, message) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            const fallback = document.createElement('textarea');
            fallback.value = text;
            fallback.style.position = 'fixed';
            fallback.style.opacity = '0';
            document.body.appendChild(fallback);
            fallback.select();
            document.execCommand('copy');
            document.body.removeChild(fallback);
        }
        showToast(message, 'success');
    }

    async function loadFeed() {
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/feed');
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'The server returned an error.');
            setUpdates(data.updates);
            setStatus({ cached: data.cached, label: data.cached ? `Cached${data.cache_time ? ` ${data.cache_time}` : ''}` : 'Live feed' });
            if (selected && !data.updates.some(update => update.id === selected.id)) setSelected(null);
            showToast(data.cached ? 'Loaded cached release notes.' : 'Release notes refreshed.', data.cached ? 'info' : 'success');
        } catch (err) {
            setError(err.message || 'Unable to load release notes.');
            showToast('Could not load the release feed.', 'error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFeed();
    }, []);

    const counts = useMemo(() => {
        const next = { all: updates.length, feature: 0, change: 0, deprecation: 0, general: 0 };
        updates.forEach(update => { next[normalizeType(update.type)] += 1; });
        return next;
    }, [updates]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return updates.filter(update => {
            const type = normalizeType(update.type);
            const filterOk = activeFilter === 'all' || type === activeFilter;
            const searchOk = !term || `${update.date} ${update.type} ${update.plain_text}`.toLowerCase().includes(term);
            return filterOk && searchOk;
        });
    }, [updates, activeFilter, query]);

    function createPost(update) {
        if (!update) return '';
        const meta = typeMeta(update.type);
        const header = `BigQuery Update - ${update.date} [${meta.label}]\n\n`;
        const footer = `\n\nRelease notes: ${NOTES_URL}`;
        return `${header}${compactText(update.plain_text, TWEET_LIMIT - header.length - footer.length)}${footer}`;
    }

    function loadComposer(update = selected) {
        if (!update) return;
        setComposerText(createPost(update));
        showToast('Loaded release into composer.', 'success');
    }

    function quickShare(update) {
        setSelected(update);
        setComposerText(createPost(update));
        showToast('Release ready in composer.', 'success');
    }

    function smartShorten() {
        if (!composerText) return;
        if (composerText.length <= TWEET_LIMIT) return showToast('The post already fits.', 'info');
        const meta = selected ? typeMeta(selected.type) : { label: 'Update' };
        const date = selected ? selected.date : 'Recent';
        const header = `BQ ${meta.label} (${date}): `;
        const footer = `\n${NOTES_URL}`;
        const source = selected ? selected.plain_text : composerText.replace(NOTES_URL, '');
        setComposerText(`${header}${compactText(source, TWEET_LIMIT - header.length - footer.length)}${footer}`);
        showToast('Shortened to fit the post limit.', 'success');
    }

    function exportCSV() {
        if (!filtered.length) return showToast('No releases to export.', 'error');
        const rows = [['Date', 'Type', 'Content'], ...filtered.map(update => [update.date, update.type, update.plain_text])];
        const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bigquery_release_notes_${activeFilter}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Exported ${filtered.length} releases.`, 'success');
    }

    function postToX() {
        if (!composerText || composerText.length > TWEET_LIMIT) return;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(composerText)}`, '_blank', 'noopener,noreferrer');
        showToast('Opening X composer.', 'success');
    }

    return h(React.Fragment, null,
        h(Header, { status, theme, loading, onRefresh: loadFeed, onExport: exportCSV, onTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
        h('main', { className: 'app-shell' },
            h('div', { className: 'intro-band' },
                h('div', null, h('p', { className: 'eyebrow' }, 'Google Cloud BigQuery'), h('h2', null, 'Readable release notes, ready to share')),
                h('a', { href: NOTES_URL, target: '_blank', rel: 'noreferrer' }, 'Official notes')
            ),
            h(Metrics, { counts }),
            h(Controls, { query, activeFilter, counts, setQuery, setFilter: setActiveFilter }),
            h('div', { className: 'workspace-grid' },
                h('section', { className: 'panel feed-panel' },
                    h('div', { className: 'panel-heading feed-heading' },
                        h('div', null, h('p', { className: 'eyebrow' }, 'Release stream'), h('h2', null, `${filtered.length} showing`)),
                        query ? h('span', { className: 'query-chip' }, query) : null
                    ),
                    h(FeedPanel, { loading, error, updates: filtered, selectedId: selected && selected.id, query, onSelect: setSelected, onCopy: text => copyText(text, 'Release text copied.'), onShare: quickShare, onRetry: loadFeed })
                ),
                h('div', { className: 'work-stack' },
                    h(DetailPanel, { selected, onCopyLink: () => copyText(NOTES_URL, 'Release notes link copied.'), onLoadComposer: () => loadComposer() }),
                    h(Composer, { value: composerText, selected, setValue: setComposerText, onShorten: smartShorten, onPost: postToX, onUseSelected: () => loadComposer() })
                )
            )
        ),
        h(Toasts, { items: toasts })
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
