// src/middleware/auth.middleware.js
import * as jose from 'jose';

/**
 * Extract secret key from base64 encoded environment variable
 */
function secretKey(env) {
  const raw = Uint8Array.from(atob(env.ACCESS_TOKEN_SECRET_B64), c => c.charCodeAt(0));
  return new Uint8Array(raw);
}

/**
 * Verify JWT access token
 */
async function verifyAccessJWT(env, token) {
  const key = secretKey(env);
  const { payload } = await jose.jwtVerify(token, key, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  return payload;
}

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

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 * Supports both cookie-based auth (preferred) and Authorization header (fallback)
 */
export const requireAuth = () => async (request, env) => {
  let token = null;

  // First, try to get token from cookie (preferred for browser clients)
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    token = cookies.access_token;
  }

  // Fallback to Authorization header (for API clients)
  if (!token) {
    const hdr = request.headers.get('authorization');
    if (hdr && hdr.startsWith('Bearer ')) {
      token = hdr.slice(7);
    }
  }

  // No token found in either location
  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing or invalid authorization',
        message: 'Please provide authentication',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const payload = await verifyAccessJWT(env, token);

    // Attach user info to request for downstream use
    request.auth = {
      userId: payload.user_id,
      sessionId: payload.session_id,
      role: payload.role || 'user',
    };

    // Don't return anything - let the request continue
    return undefined;
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Optional authentication middleware
 * Tries to authenticate but doesn't fail if no token present
 * Supports both cookie-based auth and Authorization header
 */
export const optionalAuth = () => async (request, env) => {
  let token = null;

  // Try to get token from cookie first
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    token = cookies.access_token;
  }

  // Fallback to Authorization header
  if (!token) {
    const hdr = request.headers.get('authorization');
    if (hdr && hdr.startsWith('Bearer ')) {
      token = hdr.slice(7);
    }
  }

  // No token provided - that's okay for optional auth
  if (!token) {
    request.auth = null;
    return undefined;
  }

  try {
    const payload = await verifyAccessJWT(env, token);
    request.auth = {
      userId: payload.user_id,
      sessionId: payload.session_id,
      role: payload.role || 'user',
    };
  } catch (e) {
    // Invalid token - treat as unauthenticated
    request.auth = null;
  }

  return undefined;
};
