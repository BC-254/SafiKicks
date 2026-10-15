// api/client.js — Axios instance with auth interceptors

import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT ───────────────────────────
client.interceptors.request.use((config) => {
  // Token stored in memory via authStore (NOT localStorage for security)
  // We read it from the module-level reference set by authStore
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle 401 globally ─────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// ── Token registry (in-memory, not localStorage) ─────────────
// authStore calls setAuthToken after login; client reads it here.
let _token = null;
export const setAuthToken   = (t) => { _token = t; };
export const clearAuthToken = ()  => { _token = null; };
export const getAuthToken   = ()  => _token;

// ── Helpers ───────────────────────────────────────────────────
// Unwrap the error message from an Axios error
export const getErrorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  'Something went wrong. Please try again.';

export default client;
