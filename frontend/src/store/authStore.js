import { create } from 'zustand';
import { setAuthToken, clearAuthToken, getErrorMessage } from '../api/client';
import { authApi } from '../api/auth.api';

const TOKEN_KEY = 'solecare_token';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize from storage on app load
  initAuth: async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      set({ isLoading: false, isAuthenticated: false, user: null, token: null });
      return;
    }

    try {
      setAuthToken(savedToken);
      const data = await authApi.getMe();
      set({
        token: savedToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      clearAuthToken();
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login({ email, password });
      const { token, user } = data;

      localStorage.setItem(TOKEN_KEY, token);
      setAuthToken(token);

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true, user };
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      set({
        isLoading: false,
        error: errorMsg,
      });
      return { success: false, error: errorMsg, status: err.response?.status };
    }
  },

  logout: async () => {
    try {
      if (get().token) {
        await authApi.logout();
      }
    } catch (_) {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      clearAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

// Global listener for session expiry triggered by Axios 401 interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useAuthStore.getState().logout();
  });
}
