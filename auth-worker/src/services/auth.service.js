// src/services/auth.service.js
import { signAccessJWT } from './jwt.service.js';
import { getSession } from '../models/session.model.js';
import { issueSession, rotateRefresh } from './session.service.js';
import { PerformanceMonitor } from './structured-logger.service.js';

export async function issueTokens(env, userId, logger = null) {
  const perfMonitor = logger ? new PerformanceMonitor(logger, 'issueTokens') : null;

  try {
    if (logger) {
      logger.info('Issuing new tokens', { userId });
    }

    const { accessTokenRefreshTokenRaw, sessionId } = await issueSession(env, userId);
    const access = await signAccessJWT(env, {
      user_id: userId,
      session_id: sessionId,
      role: 'customer',
    });

    if (perfMonitor) {
      perfMonitor.end({ userId, sessionId });
    }

    return { access, refresh: accessTokenRefreshTokenRaw, sessionId };
  } catch (error) {
    if (perfMonitor) {
      perfMonitor.endWithError(error, { userId });
    }
    throw error;
  }
}

export async function refreshTokens(env, sessionId, providedRefresh, logger = null) {
  const perfMonitor = logger ? new PerformanceMonitor(logger, 'refreshTokens') : null;

  try {
    const session = await getSession(env, sessionId);

    if (logger) {
      logger.debug('Session lookup for refresh', {
        sessionId,
        sessionFound: !!session,
        sessionRevoked: !!session?.revoked_at,
        sessionExpires: session?.expires_at,
      });
    }

    if (!session) {
      if (logger) {
        logger.warn('Session not found for refresh', { sessionId });
      }
      throw new Error('session_not_found');
    }

    if (session.revoked_at) {
      if (logger) {
        logger.warn('Attempted to refresh revoked session', { sessionId });
      }
      throw new Error('session_revoked');
    }

    // Check if session is expired
    const now = new Date().toISOString();
    if (session.expires_at && session.expires_at < now) {
      if (logger) {
        logger.warn('Attempted to refresh expired session', {
          sessionId,
          expiresAt: session.expires_at,
        });
      }
      throw new Error('session_expired');
    }

    const newRefresh = await rotateRefresh(env, session, providedRefresh);

    const access = await signAccessJWT(env, {
      user_id: session.user_id,
      session_id: sessionId,
      role: 'customer',
    });

    if (perfMonitor) {
      perfMonitor.end({ sessionId, userId: session.user_id });
    }

    return { access, refresh: newRefresh };
  } catch (error) {
    if (perfMonitor) {
      perfMonitor.endWithError(error, { sessionId });
    }
    throw error;
  }
}
