// Authentication API Service
import { API_CONFIG } from '../config.js';

class AuthAPI {
  constructor() {
    this.baseURL = API_CONFIG.AUTH_API;
  }

  /**
   * Sign up a new user
   */
  async signup(email, password, name, phone, address) {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password, name, phone, address })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    return data;
  }

  /**
   * Login user
   */
  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    return data;
  }

  /**
   * Refresh access token
   */
  async refresh() {
    console.log('📞 Calling refresh endpoint:', `${this.baseURL}/auth/refresh`);
    console.log('🍪 Credentials mode: include');
    console.log('🍪 Current cookies (non-HttpOnly only):', document.cookie);
    console.log('⚠️  Note: HttpOnly cookies (refresh_token, session_id) won\'t show above but ARE sent automatically');
    console.log('🌍 Current URL:', window.location.href);
    
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    console.log('📥 Refresh response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    const data = await response.json();
    console.log('📦 Refresh response data:', data);

    if (!response.ok) {
      console.error('❌ Refresh failed:', data);
      throw new Error(data.error || 'Token refresh failed');
    }

    console.log('✅ Refresh successful');
    return data;
  }

  /**
   * Logout user
   */
  async logout() {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Logout failed');
    }

    return data;
  }

  /**
   * Get current user info
   */
  async getMe(token) {
    const response = await fetch(`${this.baseURL}/user/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user info');
    }

    return data;
  }
}

export const authAPI = new AuthAPI();

