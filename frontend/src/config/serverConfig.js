// Server Host & WebSocket Connection Configurator
// Ensures seamless connectivity for Desktop, Web, and Mobile Apps

const STORAGE_KEY = 'tklab_backend_host_v1';

export function getDefaultHost() {
  // If running in browser/PWA on a local or remote network
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${hostname}:8000`;
    }
  }
  return 'localhost:8000';
}

export function getSavedBackendHost() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (err) {
    console.warn('Could not read backend host from localStorage:', err);
  }
  return getDefaultHost();
}

export function saveBackendHost(newHost) {
  try {
    const clean = (newHost || '').trim().replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '').replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY, clean);
    return clean;
  } catch (err) {
    console.error('Failed to save backend host:', err);
    return getDefaultHost();
  }
}

export function getApiBaseUrl() {
  const host = getSavedBackendHost();
  const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'https:' : 'http:';
  return `${protocol}//${host}`;
}

export function getWebSocketBaseUrl() {
  const host = getSavedBackendHost();
  const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
  return `${protocol}//${host}`;
}

