// src/services/session.service.js
import { createSession, getSession, rotateSessionToken } from '../models/session.model.js';
import { hashArgon2id, verifyArgon2id } from './crypto.service.js';

export function newRefreshToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr));
}

export async function issueSession(env, userId) {
  const raw = newRefreshToken();

  console.log('issueSession - generating token:', {
    userId,
    rawTokenLength: raw.length,
    rawTokenPrefix: raw.substring(0, 20),
  });

  const hash = await hashArgon2id(raw);

  console.log('issueSession - token hashed:', {
    hashPrefix: hash.substring(0, 30),
    hashLength: hash.length,
  });

  const sessionId = crypto.randomUUID();
  const ttl = parseInt(env.REFRESH_TTL_DAYS, 10);

  await createSession(env, sessionId, userId, hash, ttl);

  console.log('issueSession - session created:', { sessionId, ttl });

  return { accessTokenRefreshTokenRaw: raw, sessionId };
}

export async function rotateRefresh(env, session, provided) {
  console.log('rotateRefresh - verifying token:', {
    sessionId: session.id,
    hasStoredHash: !!session.refresh_token_hash,
    hasProvidedToken: !!provided,
    providedTokenLength: provided?.length,
    storedHashPrefix: session.refresh_token_hash?.substring(0, 20),
  });

  const ok = await verifyArgon2id(session.refresh_token_hash, provided);

  console.log('rotateRefresh - verification result:', { ok });

  if (!ok) throw new Error('invalid_refresh_token');

  const newRaw = newRefreshToken();
  const newHash = await hashArgon2id(newRaw);

  await rotateSessionToken(env, session.id, newHash);
  return newRaw;
}
