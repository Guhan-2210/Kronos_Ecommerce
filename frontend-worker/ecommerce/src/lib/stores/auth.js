// Authentication Store
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { authAPI } from '../api/auth.js';

// Store reference for API interceptor
let authStoreInstance = null;

// Create auth store
function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start loading until auth is initialized
    initialized: false
  });

  // Store reference for API interceptor
  const store = {
    subscribe,
    set,
    update
  };

  // Helper function to decode JWT and extract user_id
  function decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return `%${  (`00${  c.charCodeAt(0).toString(16)}`).slice(-2)}`;
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT:', e);
      return null;
    }
  }

  async function initializeAuth() {
    // Get current state properly
    let currentState;
    const unsubscribe = subscribe(state => {
      currentState = state;
    });
    unsubscribe();

    if (currentState.initialized) return;

    try {
      console.log('🔄 Attempting to restore authentication...');
      console.log('🍪 Available cookies:', document.cookie);
      console.log('🌐 Current origin:', window.location.origin);

      // Try to refresh access token using HTTP-only refresh token cookie
      const refreshResponse = await authAPI.refresh();
      const newToken = refreshResponse.access_token;

      if (!newToken) {
        throw new Error('No access token received from refresh');
      }

      console.log('✅ Refresh successful, getting user info...');

      // Decode JWT to get user_id
      const tokenPayload = decodeJWT(newToken);
      const userId = tokenPayload?.user_id;

      // Get user info with the new token
      const userResponse = await authAPI.getMe(newToken);
      const user = userResponse.user;

      if (!user) {
        throw new Error('No user data received');
      }

      // Add user ID to user object
      user.id = userId;

      console.log('✅ User info retrieved:', user.email, 'User ID:', userId);

      set({
        user,
        token: newToken,
        isAuthenticated: true,
        isLoading: false,
        initialized: true
      });

      console.log('🎉 Authentication restored successfully!');
    } catch (error) {
      console.log('❌ Authentication refresh failed:', error.message);

      // Mark as initialized but not authenticated
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        initialized: true
      });
    }
  }

  const authMethods = {
    subscribe,
    
    /**
     * Login user
     */
    async login(email, password) {
      try {
        const response = await authAPI.login(email, password);
        const token = response.access_token;
        
        // Decode JWT to get user_id
        const tokenPayload = decodeJWT(token);
        const userId = tokenPayload?.user_id;
        
        // Get user info
        const userResponse = await authAPI.getMe(token);
        const user = userResponse.user;

        console.log('User logged in:', user); // Debug log
        
        // Ensure user has email and id
        if (!user.email) {
          user.email = email;
        }
        user.id = userId;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          initialized: true
        });

        return { success: true, user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Sign up new user
     */
    async signup(email, password, name, phone, address) {
      try {
        const response = await authAPI.signup(email, password, name, phone, address);
        const token = response.access_token;
        
        // Decode JWT to get user_id
        const tokenPayload = decodeJWT(token);
        const userId = tokenPayload?.user_id;
        
        // Get user info
        const userResponse = await authAPI.getMe(token);
        const user = userResponse.user;

        console.log('User signed up:', user); // Debug log
        
        // Ensure user has email, name and id
        if (!user.email) {
          user.email = email;
        }
        if (!user.name && name) {
          user.name = name;
        }
        user.id = userId;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          initialized: true
        });

        return { success: true, user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Logout user
     */
    async logout() {
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: false
        });
      }
    },

    /**
     * Refresh access token using HTTP-only refresh token cookie
     */
    async refreshToken() {
      try {
        const response = await authAPI.refresh();
        const newToken = response.access_token;

        // Update token in memory only
        update(state => ({
          ...state,
          token: newToken
        }));

        // Get updated user info
        const userResponse = await authAPI.getMe(newToken);
        const user = userResponse.user;

        update(state => ({
          ...state,
          user,
          token: newToken,
          isAuthenticated: true,
          initialized: true
        }));

        return { success: true, token: newToken };
      } catch (error) {
        // Refresh failed - clear authentication state
        console.error('Token refresh failed:', error.message);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
        return { success: false, error: error.message };
      }
    },

    /**
     * Update user data
     */
    updateUser(userData) {
      update(state => ({
        ...state,
        user: { ...state.user, ...userData }
      }));
    },

    /**
     * Check if user is authenticated and refresh token if needed
     */
    async checkAuth() {
      return new Promise((resolve) => {
        const unsubscribe = subscribe(state => {
          unsubscribe();
          if (state.isAuthenticated && state.token) {
            resolve({ authenticated: true, user: state.user });
          } else {
            resolve({ authenticated: false });
          }
        });
      });
    },

    /**
     * Force token refresh
     */
    async refreshAuth() {
      if (browser) {
        return await this.refreshToken();
      }
      return { success: false, error: 'Not in browser environment' };
    },

    /**
     * Get current access token
     */
    getToken() {
      let currentToken = null;
      const unsubscribe = subscribe(state => {
        currentToken = state.token;
      });
      unsubscribe();
      return currentToken;
    },

    /**
     * Handle API response with automatic token refresh on 401
     */
    async handleApiResponse(response, originalRequest) {
      if (response.status === 401) {
        // Try to refresh token
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          // Retry the original request with new token
          const newToken = refreshResult.token;
          const newHeaders = new Headers(originalRequest.headers);
          newHeaders.set('Authorization', `Bearer ${newToken}`);

          return fetch(originalRequest.url, {
            ...originalRequest,
            headers: newHeaders
          });
        }
      }
      return response;
    },

    /**
     * Initialize authentication (lazy loading)
     */
    async initialize() {
      await initializeAuth();
    },

    /**
     * Check if auth has been initialized
     */
    get initialized() {
      let isInitialized = false;
      const unsubscribe = subscribe(state => {
        isInitialized = state.initialized;
      });
      unsubscribe(); // Unsubscribe immediately after getting value
      return isInitialized;
    }
  };

  // Set store instance reference for API interceptor
  authStoreInstance = authMethods;

  return authMethods;
}

export const auth = createAuthStore();

