// Auto-update detection and cache busting
// This script runs BEFORE React to detect and handle version updates

(function() {
  const STORAGE_KEY = 'wedding_app_version';
  const CLEARED_KEY = 'wedding_cache_cleared_at';
  const VERSION_URL = '/Wedding/version.json?t=' + Date.now();
  const RECENT_CLEAR_MS = 5 * 60 * 1000; // 5 minutes

  console.log('[AUTO-UPDATE] Checking for updates and cache state...');

  // If the page was just reloaded after clearing, mark and continue
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('cleared')) {
      localStorage.setItem(CLEARED_KEY, String(Date.now()));
      console.log('[AUTO-UPDATE] Page loaded after cache-clear reload.');
      // Also store version if present in payload later
    }
  } catch (e) {
    // ignore
  }

  // If we recently cleared the cache, skip aggressive clearing to avoid loops
  const lastCleared = parseInt(localStorage.getItem(CLEARED_KEY) || '0', 10);
  if (Date.now() - lastCleared < RECENT_CLEAR_MS) {
    console.log('[AUTO-UPDATE] Recent cache clear detected; skipping automatic clear.');
  }

  // First: always try to fetch latest version to detect an actual deployment change
  fetch(VERSION_URL, { 
    cache: 'no-store',
    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
  })
    .then(response => response.json())
    .then(data => {
      const currentVersion = data.version;
      const storedVersion = localStorage.getItem(STORAGE_KEY);
      console.log('[AUTO-UPDATE] Current version:', currentVersion, 'Stored version:', storedVersion);

      if (storedVersion && storedVersion !== currentVersion) {
        console.log('[AUTO-UPDATE] Version mismatch! Clearing caches and reloading...');
        localStorage.removeItem(STORAGE_KEY);
        // preserve useful app data like RSVP entries (keys starting with 'wedding_')
        const preserved = {};
        try {
          Object.keys(localStorage).forEach(k => {
            if (k && k.startsWith('wedding_')) preserved[k] = localStorage.getItem(k);
          });
        } catch (e) { /* ignore */ }

        try {
          // Clear localStorage, then restore preserved keys
          localStorage.clear();
          Object.keys(preserved).forEach(k => localStorage.setItem(k, preserved[k]));
        } catch (e) { console.warn('[AUTO-UPDATE] localStorage clear failed', e); }

        try { sessionStorage.clear(); } catch (e) {}

        // Clear Service Worker caches if available
        if ('caches' in window) {
          caches.keys().then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
          }).then(() => console.log('[AUTO-UPDATE] Cleared caches')).catch(()=>{});
        }

        // Reload once with cleared flag to avoid loop
        const reloadUrl = window.location.href.split('?')[0] + '?cleared=1&t=' + Date.now();
        window.location.replace(reloadUrl);
        return;
      } else {
        // Store the current version if not present
        if (!storedVersion) localStorage.setItem(STORAGE_KEY, currentVersion);
        console.log('[AUTO-UPDATE] Version checked/stored:', currentVersion);
      }
    })
    .catch(error => {
      console.warn('[AUTO-UPDATE] Failed to check version:', error);
      // Even if version check fails, still allow page to continue
    });

  // Additionally: If user manually refreshes (F5/Ctrl+R), we can proactively clear caches
  // to ensure they always get latest assets. We only do this once per RECENT_CLEAR_MS window.
  function ensureCacheClearedOnReload() {
    try {
      const last = parseInt(localStorage.getItem(CLEARED_KEY) || '0', 10);
      if (Date.now() - last < RECENT_CLEAR_MS) return;

      // Set a short timeout to clear caches shortly after load (non-blocking)
      setTimeout(() => {
        // Clear caches and sessionStorage, but preserve wedding_* localStorage entries
        try {
          const preserved = {};
          Object.keys(localStorage).forEach(k => { if (k && k.startsWith('wedding_')) preserved[k] = localStorage.getItem(k); });
          localStorage.clear();
          Object.keys(preserved).forEach(k => localStorage.setItem(k, preserved[k]));
        } catch (e) { console.warn('[AUTO-UPDATE] localStorage preserve failed', e); }

        try { sessionStorage.clear(); } catch (e) {}
        if ('caches' in window) {
          caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).catch(()=>{});
        }

        localStorage.setItem(CLEARED_KEY, String(Date.now()));
        console.log('[AUTO-UPDATE] Proactively cleared caches after load');
      }, 1200);
    } catch (e) { /* ignore */ }
  }

  // Run this so that a simple refresh will trigger a proactive clear (one-time per RECENT_CLEAR_MS)
  ensureCacheClearedOnReload();

})();
