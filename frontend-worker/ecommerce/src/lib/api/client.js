// Authenticated API Client with automatic token refresh
import { auth } from '../stores/auth.js';

class AuthenticatedAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Make authenticated request with automatic token refresh
   * Cookies (access_token, refresh_token, session_id) sent automatically by browser
   */
  async request(url, options = {}) {
    const requestOptions = {
      ...options,
      credentials: 'include' // Send HttpOnly cookies automatically (access_token, refresh_token, session_id)
    };

    let response = await fetch(url.startsWith('http') ? url : `${this.baseURL}${url}`, requestOptions);

    // Handle 401 by attempting token refresh
    if (response.status === 401) {
      console.log('Received 401, attempting token refresh...');
      const originalRequest = new Request(url.startsWith('http') ? url : `${this.baseURL}${url}`, requestOptions);

      try {
        response = await auth.handleApiResponse(response, originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication failed. Please login again.');
      }
    }

    return response;
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

export const authenticatedAPI = (baseURL) => new AuthenticatedAPIClient(baseURL);
