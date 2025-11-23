// src/models/user.model.js
import { db } from './db.js';

export async function insertUser(env, id, data) {
  const json = JSON.stringify(data);
  await db(env).prepare('INSERT INTO users (id, user_data) VALUES (?, ?)').bind(id, json).run();
}

export async function findUserByEmailHash(env, emailHash) {
  const res = await db(env)
    .prepare(
      `
      SELECT id, user_data
      FROM users
      WHERE json_extract(user_data, '$.email_hash') = ?
      LIMIT 1
    `
    )
    .bind(emailHash)
    .first();
  if (!res) return null;
  res.user_data = JSON.parse(res.user_data);
  return res;
}

export async function updateUser(env, id, data) {
  const json = JSON.stringify(data);
  await db(env)
    .prepare(
      `
      UPDATE users
      SET user_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    )
    .bind(json, id)
    .run();
}
