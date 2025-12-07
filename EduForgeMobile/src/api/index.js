// EduForgeMobile/src/api/index.js
// Portable API client: resolve API_BASE at runtime and provide helpers.

const API_BASE = 'https://finalsexam.onrender.com';

function buildUrl(path) {
  if (!path) return API_BASE || path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function request(path, options = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error(data?.detail || res.statusText || 'Request failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function login(username, password) {
  return request('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function register(payload) {
  return request('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export { API_BASE, request };
export default { login, register, request };