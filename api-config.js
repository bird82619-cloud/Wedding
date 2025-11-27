// API Configuration - Loaded before React
// This ensures the API key is available immediately
(function() {
  const apiKey = 'AIzaSyBEKk4tFXgURUB0S-hQDalYZ0UyN0VTGx8';
  
  window.API_CONFIG = {
    VITE_API_KEY: apiKey
  };
  
  // Also set as direct global for easier access
  window.VITE_API_KEY = apiKey;
  
  console.log('[API-CONFIG] Initialized', {
    hasAPIConfig: !!window.API_CONFIG,
    hasVITE_API_KEY: !!window.VITE_API_KEY,
    keyLength: apiKey.length,
    keyPreview: apiKey.substring(0, 10) + '...'
  });
})();
