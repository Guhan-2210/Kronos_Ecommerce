// src/middleware/auth.middleware.js
import { verifyAccessJWT } from '../services/jwt.service.js';
import { getSession } from '../models/session.model.js';

export const requireAuth = () => async (request, env) => {
  const hdr = request.headers.get('authorization');
  if (!hdr || !hdr.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = hdr.slice(7);
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
