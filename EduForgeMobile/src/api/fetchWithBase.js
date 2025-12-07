// src/api/fetchWithBase.js
// Install a global fetch wrapper that rewrites requests that start with /api/
// to use the configured API base. Import this file early (for example in
// the top of `App.js`) if you want all fetch() calls to be rewritten.

const API_BASE = 'https://finalsexam.onrender.com';

function absoluteUrl(url) {
  if (!url) return url;
  if (typeof url === 'string' && url.startsWith('/api/')) return `${API_BASE}${url}`;
  try {
    new URL(url);
    return url;
  } catch (_) {
    return url;
  }
}

const origFetch = (typeof window !== 'undefined' && window.fetch) || global.fetch;
if (typeof window !== 'undefined' && origFetch) {
  window.fetch = function(input, init) {
    let newInput = input;
    if (typeof input === 'string') {
      newInput = absoluteUrl(input);
    } else if (input && input.url) {
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
  // expose for runtime debugging
  window.API_BASE = API_BASE;
  console.log('fetch wrapper installed; API_BASE =', API_BASE);
}