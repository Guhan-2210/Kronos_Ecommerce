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
      console.log('🌐 Current origin:', window.location.origin);

      // Try to get user info - access_token cookie will be sent automatically
      // If token is invalid/expired, this will return 401
      const userResponse = await authAPI.getMe();
      const user = userResponse.user;

      if (!user) {
        throw new Error('No user data received');
      }

      console.log('✅ User authenticated:', user.email);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        initialized: true
      });

      console.log('🎉 Authentication restored successfully!');
    } catch (error) {
      console.log('❌ Authentication initialization failed:', error.message);

      // If getMe fails with 401, try refresh
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        try {
          console.log('🔄 Access token expired, attempting refresh...');
          await authAPI.refresh(); // Sets new cookies

          // Retry getting user info
          const userResponse = await authAPI.getMe();
          const user = userResponse.user;

          if (user) {
            console.log('✅ User authenticated after refresh:', user.email);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              initialized: true
            });
            console.log('🎉 Authentication restored via refresh!');
            return;
          }
        } catch (refreshError) {
          console.log('❌ Refresh failed:', refreshError.message);
        }
      }

      // Mark as initialized but not authenticated
      set({
        user: null,
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
        // Login sets access_token cookie (shared across all *.guhan2210.workers.dev domains)
        await authAPI.login(email, password);
        
        // Get user info - access_token cookie sent automatically
        const userResponse = await authAPI.getMe();
        const user = userResponse.user;

        console.log('User logged in:', user); // Debug log
        
        // Ensure user has email
        if (!user.email) {
          user.email = email;
        }

        set({
          user,
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
        // Signup sets access_token cookie (shared across all *.guhan2210.workers.dev domains)
        await authAPI.signup(email, password, name, phone, address);
        
        // Get user info - access_token cookie sent automatically
        const userResponse = await authAPI.getMe();
        const user = userResponse.user;

        console.log('User signed up:', user); // Debug log
        
        // Ensure user has email and name
        if (!user.email) {
          user.email = email;
        }
        if (!user.name && name) {
          user.name = name;
        }

        set({
          user,
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
        // Backend clears all cookies
        await authAPI.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear state
        set({
          user: null,
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
        // Refresh sets new cookies automatically
        await authAPI.refresh();

        // Get updated user info - new access_token cookie sent automatically
        const userResponse = await authAPI.getMe();
        const user = userResponse.user;

        update(state => ({
          ...state,
          user,
          isAuthenticated: true,
          initialized: true
        }));

        return { success: true };
      } catch (error) {
        // Refresh failed - clear authentication state
        console.error('Token refresh failed:', error.message);
        set({
          user: null,
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
     * Check if user is authenticated
     */
    async checkAuth() {
      return new Promise((resolve) => {
        const unsubscribe = subscribe(state => {
          unsubscribe();
          if (state.isAuthenticated) {
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
     * Handle API response with automatic token refresh on 401
     */
    async handleApiResponse(response, originalRequest) {
      if (response.status === 401) {
        // Try to refresh token (sets new cookies)
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          // Retry the original request - new cookies will be sent automatically
          return fetch(originalRequest.url, {
            ...originalRequest,
            credentials: 'include'
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

