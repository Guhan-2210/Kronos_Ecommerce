// src/middleware/auth.middleware.js
import { verifyAccessJWT } from '../services/jwt.service.js';
import { getSession } from '../models/session.model.js';

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}

export const requireAuth = () => async (request, env) => {
  let token = null;

  // First, try to get token from cookie (preferred for cookie-based auth)
  const cookieHeader = request.headers.get('Cookie');
  console.log('requireAuth - Cookie header:', cookieHeader || 'NONE');

  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    console.log('requireAuth - Parsed cookies:', Object.keys(cookies));
    token = cookies.access_token;
    if (token) {
      console.log('requireAuth - Token found in cookies, prefix:', token.substring(0, 20));
    }
  }

  // Fallback to Authorization header (for API clients or backward compatibility)
  if (!token) {
    const hdr = request.headers.get('authorization');
    console.log('requireAuth - Authorization header:', hdr ? 'EXISTS' : 'NONE');
    if (hdr && hdr.startsWith('Bearer ')) {
      token = hdr.slice(7);
      console.log('requireAuth - Token found in Authorization header');
    }
  }

  // No token found in either location
  if (!token) {
    console.log('requireAuth - NO TOKEN FOUND - Cookie header:', cookieHeader || 'MISSING');
    return new Response(JSON.stringify({ error: 'Missing token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await verifyAccessJWT(env, token);
    // optional: check DB session state
    const sess = await getSession(env, payload.session_id);
    if (!sess || sess.revoked_at || new Date(sess.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: 'Session inactive' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    request.auth = { userId: payload.user_id, sessionId: payload.session_id, role: payload.role };
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
