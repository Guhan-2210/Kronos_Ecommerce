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
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const requireAuth = () => async (request, env) => {
  const hdr = request.headers.get('authorization');

  if (!hdr || !hdr.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing or invalid authorization header',
        message: 'Please provide a valid Bearer token',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const token = hdr.slice(7);

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
 */
export const optionalAuth = () => async (request, env) => {
  const hdr = request.headers.get('authorization');

  if (!hdr || !hdr.startsWith('Bearer ')) {
    // No token provided - that's okay for optional auth
    request.auth = null;
    return undefined;
  }

  const token = hdr.slice(7);

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
