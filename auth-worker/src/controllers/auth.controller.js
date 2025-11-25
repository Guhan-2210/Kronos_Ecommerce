// src/controllers/auth.controller.js
import { registerUser, verifyUserPassword } from '../services/user.service.js';
import { issueTokens, refreshTokens } from '../services/auth.service.js';
import { revokeAllSessions, revokeSession } from '../models/session.model.js';
import { log } from '../services/logging.service.js';
import { getLogger } from '../middleware/logging.middleware.js';

// Use SameSite=None for cross-origin requests (required for cookies between different domains)
// Secure flag is required when using SameSite=None
// Domain=.guhan2210.workers.dev makes cookie available to ALL subdomains (frontend, cart-worker, fulfilment-worker, etc.)
const COOKIE_BASE = 'Path=/; Secure; HttpOnly; SameSite=None; Domain=.guhan2210.workers.dev';
const COOKIE_BASE_ACCESS = 'Path=/; Secure; HttpOnly; SameSite=None; Domain=.guhan2210.workers.dev';

function setRefreshCookies(refresh, sessionId, maxAgeDays) {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return [
    `refresh_token=${encodeURIComponent(refresh)}; ${COOKIE_BASE}; Max-Age=${maxAge}`,
    `session_id=${sessionId}; ${COOKIE_BASE}; Max-Age=${maxAge}`,
  ];
}

function setAccessTokenCookie(accessToken, maxAgeSeconds) {
  // Set access token as HttpOnly cookie shared across all subdomains
  // URL-encode to handle special characters in base64 tokens (+, /, =)
  return `access_token=${encodeURIComponent(accessToken)}; ${COOKIE_BASE_ACCESS}; Max-Age=${maxAgeSeconds}`;
}

function clearRefreshCookies() {
  return [`refresh_token=; ${COOKIE_BASE}; Max-Age=0`, `session_id=; ${COOKIE_BASE}; Max-Age=0`];
}

function clearAccessTokenCookie() {
  return `access_token=; ${COOKIE_BASE_ACCESS}; Max-Age=0`;
}

export async function signupCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  const logger = getLogger(request);

  try {
    const v = request.validated;
    const user = await registerUser(env, v);
    const { access, refresh, sessionId } = await issueTokens(env, user.id, logger);

    const headers = new Headers({ 'Content-Type': 'application/json' });

    // Set refresh token and session ID cookies (HttpOnly)
    setRefreshCookies(refresh, sessionId, parseInt(env.REFRESH_TTL_DAYS, 10)).forEach(c =>
      headers.append('Set-Cookie', c)
    );

    // Set access token cookie (readable by JavaScript)
    const accessTTL = parseInt(env.ACCESS_TOKEN_TTL_SEC || '900', 10); // Default 15 minutes
    headers.append('Set-Cookie', setAccessTokenCookie(access, accessTTL));

    if (logger) {
      logger.info('User signup successful', { cfRay, userId: user.id, sessionId });
    } else {
      log('info', 'signup_success', { cfRay, userId: user.id, sessionId });
    }

    return new Response(JSON.stringify({ access_token: access }), { status: 201, headers });
  } catch (e) {
    if (logger) {
      logger.error('User signup failed', { cfRay }, e);
    } else {
      log('error', 'signup_error', { cfRay, err: e.message });
    }
    return new Response(JSON.stringify({ error: 'SignupFailed' }), { status: 400 });
  }
}

export async function loginCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  const logger = getLogger(request);

  try {
    const v = request.validated;
    const user = await verifyUserPassword(env, v.email, v.password);
    if (!user) {
      if (logger) {
        logger.warn('Login attempt with invalid credentials', { cfRay });
      } else {
        log('warn', 'login_invalid', { cfRay, email: v.email });
      }
      return new Response(JSON.stringify({ error: 'InvalidCredentials' }), { status: 401 });
    }
    const { access, refresh, sessionId } = await issueTokens(env, user.id, logger);

    const headers = new Headers({ 'Content-Type': 'application/json' });

    // Set refresh token and session ID cookies (HttpOnly)
    setRefreshCookies(refresh, sessionId, parseInt(env.REFRESH_TTL_DAYS, 10)).forEach(c =>
      headers.append('Set-Cookie', c)
    );

    // Set access token cookie (readable by JavaScript)
    const accessTTL = parseInt(env.ACCESS_TOKEN_TTL_SEC || '900', 10); // Default 15 minutes
    headers.append('Set-Cookie', setAccessTokenCookie(access, accessTTL));

    if (logger) {
      logger.info('User login successful', { cfRay, userId: user.id, sessionId });
    } else {
      log('info', 'login_success', { cfRay, userId: user.id, sessionId });
    }

    return new Response(JSON.stringify({ access_token: access }), { status: 200, headers });
  } catch (e) {
    if (logger) {
      logger.error('User login failed', { cfRay }, e);
    } else {
      log('error', 'login_error', { cfRay, err: e.message });
    }
    return new Response(JSON.stringify({ error: 'LoginFailed' }), { status: 400 });
  }
}

function parseCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const cookies = c.split(';').map(x => {
    const trimmed = x.trim();
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return [trimmed, ''];
    return [trimmed.substring(0, firstEquals), trimmed.substring(firstEquals + 1)];
  });
  const match = cookies.find(([k]) => k === name);
  return match ? decodeURIComponent(match[1] || '') : '';
}

export async function refreshCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  const logger = getLogger(request);
  const origin = request.headers.get('origin');
  const cookieHeader = request.headers.get('cookie');
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');

  try {
    const refresh = parseCookie(request, 'refresh_token');
    const sessionId = parseCookie(request, 'session_id');

    if (logger) {
      logger.info('Token refresh attempt', {
        cfRay,
        origin,
        referer,
        userAgent: userAgent?.substring(0, 100),
        hasRefresh: !!refresh,
        hasSession: !!sessionId,
        sessionId,
        cookieHeader: cookieHeader ? `Present (${cookieHeader.length} chars)` : 'Missing',
      });
    } else {
      log('info', 'refresh_attempt', {
        cfRay,
        origin,
        referer,
        userAgent: userAgent?.substring(0, 100),
        hasRefresh: !!refresh,
        hasSession: !!sessionId,
        sessionId,
        refreshLength: refresh?.length,
        refreshPrefix: refresh?.substring(0, 20),
        cookieHeader: cookieHeader ? `Present (${cookieHeader.length} chars)` : 'Missing',
        allCookies: cookieHeader || 'NONE',
      });
    }

    if (!refresh || !sessionId) {
      if (logger) {
        logger.warn('Token refresh missing cookies', {
          cfRay,
          hasRefresh: !!refresh,
          hasSession: !!sessionId,
        });
      } else {
        log('warn', 'refresh_missing_cookies', {
          cfRay,
          hasRefresh: !!refresh,
          hasSession: !!sessionId,
        });
      }
      return new Response(JSON.stringify({ error: 'MissingRefresh' }), { status: 401 });
    }

    const { access, refresh: newRefresh } = await refreshTokens(env, sessionId, refresh, logger);

    const headers = new Headers({ 'Content-Type': 'application/json' });

    // Set refresh token and session ID cookies (HttpOnly)
    setRefreshCookies(newRefresh, sessionId, parseInt(env.REFRESH_TTL_DAYS, 10)).forEach(c =>
      headers.append('Set-Cookie', c)
    );

    // Set access token cookie (readable by JavaScript)
    const accessTTL = parseInt(env.ACCESS_TOKEN_TTL_SEC || '900', 10); // Default 15 minutes
    headers.append('Set-Cookie', setAccessTokenCookie(access, accessTTL));

    log('info', 'refresh_success', { cfRay, sessionId });
    return new Response(JSON.stringify({ access_token: access }), { status: 200, headers });
  } catch (e) {
    log('error', 'refresh_failed', { cfRay, err: e.message, stack: e.stack });
    const headers = new Headers({ 'Content-Type': 'application/json' });
    clearRefreshCookies().forEach(c => headers.append('Set-Cookie', c));
    return new Response(JSON.stringify({ error: 'RefreshFailed', detail: e.message }), {
      status: 401,
      headers,
    });
  }
}

export async function logoutCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  try {
    const sessionId = parseCookie(request, 'session_id');
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'MissingSession' }), { status: 400 });
    }
    await revokeSession(env, sessionId);

    const headers = new Headers({ 'Content-Type': 'application/json' });

    // Clear all auth cookies
    clearRefreshCookies().forEach(c => headers.append('Set-Cookie', c));
    headers.append('Set-Cookie', clearAccessTokenCookie());

    log('info', 'logout_success', { cfRay, sessionId });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    log('error', 'logout_error', { cfRay, err: e.message });
    return new Response(JSON.stringify({ error: 'LogoutFailed' }), { status: 400 });
  }
}

export async function logoutAllCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  try {
    const auth = request.auth;
    await revokeAllSessions(env, auth.userId);

    const headers = new Headers({ 'Content-Type': 'application/json' });

    // Clear all auth cookies
    clearRefreshCookies().forEach(c => headers.append('Set-Cookie', c));
    headers.append('Set-Cookie', clearAccessTokenCookie());

    log('info', 'logout_all_success', { cfRay, userId: auth.userId });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    log('error', 'logout_all_error', { cfRay, err: e.message });
    return new Response(JSON.stringify({ error: 'LogoutAllFailed' }), { status: 400 });
  }
}
