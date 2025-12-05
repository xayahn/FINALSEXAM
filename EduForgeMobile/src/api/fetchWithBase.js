// src/fetchWithBase.js
// Import this as early as possible (see App.js change below).
// It rewrites requests that start with /api/ to use the API_BASE environment variable.
// Add the following line at the very top of your App.js (before other imports)
import './src/fetchWithBase';

const API_BASE = (process.env.REACT_APP_API_URL || window.REACT_APP_API_URL || window.API_URL || '').replace(/\/$/, '');

function absoluteUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url}`;
  try {
    // If url is already absolute, return as-is
    new URL(url);
    return url;
  } catch (_) {
    // Relative non-/api paths: leave them unchanged
    return url;
  }
}

const origFetch = window.fetch.bind(window);
window.fetch = function(input, init) {
  let newInput = input;
  if (typeof input === 'string') {
    newInput = absoluteUrl(input);
  } else if (input && input.url) {
    // Recreate Request with rewritten URL
    const opts = {
      method: input.method,
      headers: input.headers,
      body: input.body,
      credentials: input.credentials,
      mode: input.mode,
      cache: input.cache,
      redirect: input.redirect,
      referrer: input.referrer
    };
    newInput = new Request(absoluteUrl(input.url), opts);
  }
  return origFetch(newInput, init);
};

console.log('fetch wrapper installed; API_BASE =', API_BASE);