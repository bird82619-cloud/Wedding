// Auto-update detection and cache busting
// This script runs BEFORE React to detect and handle version updates

(function() {
  const STORAGE_KEY = 'wedding_app_version';
  const VERSION_URL = '/Wedding/version.json?t=' + Date.now();
  
  console.log('[AUTO-UPDATE] Checking for updates...');
  
  // Get stored version
  const storedVersion = localStorage.getItem(STORAGE_KEY);
  
  // Fetch current version
  fetch(VERSION_URL, { 
    cache: 'no-store',
    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
  })
    .then(response => response.json())
    .then(data => {
      const currentVersion = data.version;
      console.log('[AUTO-UPDATE] Current version:', currentVersion, 'Stored version:', storedVersion);
      
      if (storedVersion && storedVersion !== currentVersion) {
        console.log('[AUTO-UPDATE] Version mismatch! Performing hard refresh...');
        
        // Clear all caches
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.clear();
        
        // Clear Service Worker cache if exists
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
            console.log('[AUTO-UPDATE] Cleared all caches');
          });
        }
        
        // Hard refresh the page (bypassing cache)
        window.location.href = window.location.href.split('?')[0] + '?v=' + currentVersion + '&t=' + Date.now();
      } else {
        // Store the current version
        localStorage.setItem(STORAGE_KEY, currentVersion);
        console.log('[AUTO-UPDATE] Version stored:', currentVersion);
      }
    })
    .catch(error => {
      console.warn('[AUTO-UPDATE] Failed to check version:', error);
      // Continue anyway, version check is not critical
    });
})();
