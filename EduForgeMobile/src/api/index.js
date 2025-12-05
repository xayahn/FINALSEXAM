// EduForgeMobile/src/api/index.js
// Portable API client: resolve API_BASE at runtime (handles different build systems)

import { login } from '../api'; // adjust path

async function handleLogin() {
  try {
    const result = await login(username, password);
    // handle login result (token, user, etc.)
  } catch (err) {
    console.error('Login failed', err);
    // show friendly error to user
  }
}
const API_BASE = (
  process.env.REACT_APP_API_URL || // create-react-app env
  (typeof window !== 'undefined' && (window.REACT_APP_API_URL || window.API_URL)) || // runtime-injected or set on window
  '' // fallback to relative paths
).replace(/\/$/, ''); // remove trailing slash

async function request(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  // optional: handle non-JSON or empty responses
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