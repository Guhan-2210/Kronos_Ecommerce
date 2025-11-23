// src/routes/health.routes.js
import { AutoRouter } from 'itty-router';

const healthRouter = AutoRouter();

// Health check endpoint - tests all services
healthRouter.get('/health', async (request, env) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
  };

  try {
    // 1. Check Database (D1)
    try {
      const dbResult = await env.DB.prepare('SELECT 1 as test').first();
      checks.services.database = dbResult ? 'ok' : 'error';
    } catch (e) {
      checks.services.database = 'error';
      checks.status = 'unhealthy';
    }

    // 2. Check Web Crypto API
    try {
      const testData = new Uint8Array(16);
      crypto.getRandomValues(testData);
      checks.services.crypto = 'ok';
    } catch (e) {
      checks.services.crypto = 'error';
      checks.status = 'unhealthy';
    }

    // 3. Check Environment Variables
    const requiredEnvVars = [
      'DATA_ENC_KEY_B64',
      'PII_INDEX_KEY_B64',
      'ACCESS_TOKEN_SECRET_B64',
      'JWT_ISSUER',
      'JWT_AUDIENCE',
      'ACCESS_TOKEN_TTL_SEC',
      'REFRESH_TTL_DAYS',
    ];
    const missingVars = requiredEnvVars.filter(v => !env[v]);
    checks.services.environment = {
      status: missingVars.length === 0 ? 'ok' : 'error',
      missing: missingVars.length > 0 ? missingVars : undefined,
    };
    if (missingVars.length > 0) {
      checks.status = 'unhealthy';
    }

    // 4. Check Encryption Service
    try {
      const { encryptField, decryptField } = await import('../services/crypto.service.js');
      const testText = 'health-check';
      const encrypted = await encryptField(env, testText);
      const decrypted = await decryptField(env, encrypted);
      checks.services.encryption = decrypted === testText ? 'ok' : 'error';
    } catch (e) {
      checks.services.encryption = 'error';
      checks.status = 'unhealthy';
    }

    // 5. Check JWT Service
    try {
      const { signAccessJWT } = await import('../services/jwt.service.js');
      const testToken = await signAccessJWT(env, { test: true });
      checks.services.jwt = testToken ? 'ok' : 'error';
    } catch (e) {
      checks.services.jwt = 'error';
      checks.status = 'unhealthy';
    }

    // 6. Check Password Hashing (PBKDF2)
    try {
      const { hashArgon2id } = await import('../services/crypto.service.js');
      const testHash = await hashArgon2id('test-password');
      checks.services.password_hashing = testHash.startsWith('$pbkdf2-sha256$') ? 'ok' : 'error';
    } catch (e) {
      checks.services.password_hashing = 'error';
      checks.status = 'unhealthy';
    }

    return checks;
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
});

export default healthRouter;
