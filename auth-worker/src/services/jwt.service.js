// src/services/jwt.service.js
import * as jose from 'jose';

function secretKey(env) {
  const raw = Uint8Array.from(atob(env.ACCESS_TOKEN_SECRET_B64), c => c.charCodeAt(0));
  return new Uint8Array(raw);
}

export async function signAccessJWT(env, payload) {
  const key = secretKey(env);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime(`${parseInt(env.ACCESS_TOKEN_TTL_SEC, 10)}s`)
    .sign(key);
}

export async function verifyAccessJWT(env, token) {
  const key = secretKey(env);
  const { payload } = await jose.jwtVerify(token, key, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  return payload;
}
