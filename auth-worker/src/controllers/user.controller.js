// src/controllers/user.controller.js
import { log } from '../services/logging.service.js';
import { decryptField } from '../services/crypto.service.js';
import { db } from '../models/db.js';

export async function meCtrl(request, env) {
  const cfRay = request.headers.get('cf-ray');
  try {
    const { userId } = request.auth;

    // Get user data from D1 database
    const res = await db(env)
      .prepare('SELECT id, user_data FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!res) {
      return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
    }

    const ud = JSON.parse(res.user_data);

    // Decrypt PII before returning (or return redacted per policy)
    const me = {
      name: await decryptField(env, ud.name),
      email: await decryptField(env, ud.email),
      phone: await decryptField(env, ud.phone),
      address: JSON.parse(await decryptField(env, ud.address)),
    };

    log('info', 'me_ok', { cfRay, userId });
    return new Response(JSON.stringify({ user: me }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    log('error', 'me_error', { cfRay, err: e.message });
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
