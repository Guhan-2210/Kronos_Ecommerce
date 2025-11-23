// src/models/session.model.js
import { db } from './db.js';

export async function createSession(env, id, userId, hash, ttlDays) {
  await db(env)
    .prepare(
      `
      INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', ? || ' days'))
    `
    )
    .bind(id, userId, hash, ttlDays)
    .run();
}

export async function getSession(env, sessionId) {
  const res = await db(env)
    .prepare(
      `
      SELECT *
      FROM sessions
      WHERE id = ?
    `
    )
    .bind(sessionId)
    .first();
  return res || null;
}

export async function rotateSessionToken(env, sessionId, newHash) {
  await db(env)
    .prepare(
      `
      UPDATE sessions
      SET refresh_token_hash = ?, created_at = datetime('now')
      WHERE id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
    `
    )
    .bind(newHash, sessionId)
    .run();
}

export async function revokeSession(env, sessionId) {
  await db(env)
    .prepare(
      `
      UPDATE sessions
      SET revoked_at = datetime('now')
      WHERE id = ? AND revoked_at IS NULL
    `
    )
    .bind(sessionId)
    .run();
}

export async function revokeAllSessions(env, userId) {
  await db(env)
    .prepare(
      `
      UPDATE sessions
      SET revoked_at = datetime('now')
      WHERE user_id = ? AND revoked_at IS NULL
    `
    )
    .bind(userId)
    .run();
}
