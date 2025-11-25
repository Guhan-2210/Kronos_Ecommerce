// Cookie utility functions for client-side cookie management

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  
  return null;
}

/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} maxAge - Max age in seconds
 * @param {object} options - Additional cookie options
 */
export function setCookie(name, value, maxAge, options = {}) {
  if (typeof document === 'undefined') return;
  
  const {
    path = '/',
    secure = true,
    sameSite = 'None'
  } = options;
  
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (maxAge) {
    cookie += `; Max-Age=${maxAge}`;
  }
  
  cookie += `; Path=${path}`;
  
  if (secure) {
    cookie += '; Secure';
  }
  
  if (sameSite) {
    cookie += `; SameSite=${sameSite}`;
  }
  
  document.cookie = cookie;
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 * @param {object} options - Cookie options (should match original cookie)
 */
export function deleteCookie(name, options = {}) {
  if (typeof document === 'undefined') return;
  
  const {
    path = '/',
    secure = true,
    sameSite = 'None'
  } = options;
  
  let cookie = `${name}=; Max-Age=0`;
  cookie += `; Path=${path}`;
  
  if (secure) {
    cookie += '; Secure';
  }
  
  if (sameSite) {
    cookie += `; SameSite=${sameSite}`;
  }
  
  document.cookie = cookie;
}

/**
 * Check if a cookie exists
 * @param {string} name - Cookie name
 * @returns {boolean} - True if cookie exists
 */
export function hasCookie(name) {
  return getCookie(name) !== null;
}

