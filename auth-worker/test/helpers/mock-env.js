// test/helpers/mock-env.js - Mock environment for testing

export function createMockEnv() {
  // Generate base64 encoded 32-byte keys for testing
  const generateKey = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr));
  };

  return {
    DATA_ENC_KEY_B64: generateKey(),
    PII_INDEX_KEY_B64: generateKey(),
    ACCESS_TOKEN_SECRET_B64: generateKey(),
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    ACCESS_TOKEN_TTL_SEC: '900',
    REFRESH_TTL_DAYS: '30',
    DB: createMockDB(),
  };
}

export function createMockDB() {
  const store = new Map();

  return {
    prepare: sql => {
      return {
        _sql: sql,
        _bindings: [],
        bind(...values) {
          this._bindings = values;
          return this;
        },
        async run() {
          // Simple mock implementation
          if (this._sql.includes('INSERT INTO sessions')) {
            const [id, userId, refreshTokenHash, ttlDays] = this._bindings;
            // Calculate expiration date
            const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
            store.set(`session:${id}`, {
              id,
              user_id: userId,
              refresh_token_hash: refreshTokenHash,
              expires_at: expiresAt,
              revoked_at: null,
              created_at: new Date().toISOString(),
            });
            return { success: true };
          }
          if (this._sql.includes('UPDATE sessions') && this._sql.includes('refresh_token_hash')) {
            const [newHash, id] = this._bindings;
            const session = store.get(`session:${id}`);
            if (session) {
              session.refresh_token_hash = newHash;
              store.set(`session:${id}`, session);
            }
            return { success: true };
          }
          if (this._sql.includes('UPDATE sessions') && this._sql.includes('revoked_at')) {
            const [id] = this._bindings;
            const session = store.get(`session:${id}`);
            if (session) {
              session.revoked_at = new Date().toISOString();
              store.set(`session:${id}`, session);
            }
            return { success: true };
          }
          if (this._sql.includes('INSERT INTO users')) {
            const [id, userData] = this._bindings;
            store.set(`user:${id}`, { id, user_data: userData });
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (this._sql.includes('SELECT') && this._sql.includes('sessions')) {
            const [id] = this._bindings;
            return store.get(`session:${id}`) || null;
          }
          if (this._sql.includes('SELECT') && this._sql.includes('users')) {
            const [emailHash] = this._bindings;
            for (const [key, value] of store.entries()) {
              if (key.startsWith('user:')) {
                // user_data is stored as JSON string in DB
                const userData =
                  typeof value.user_data === 'string'
                    ? JSON.parse(value.user_data)
                    : value.user_data;
                if (userData.email_hash === emailHash) {
                  // Return the value with user_data as stored (string)
                  return { id: value.id, user_data: value.user_data };
                }
              }
            }
            return null;
          }
          return null;
        },
        async all() {
          return [];
        },
      };
    },
    // Helper to clear store between tests
    _reset: () => store.clear(),
    _getStore: () => store,
  };
}

export function createMockRequest(options = {}) {
  const { method = 'GET', headers = {}, body = null, validated = null, auth = null } = options;

  const headersMap = new Map(Object.entries(headers));

  return {
    method,
    headers: {
      get: name => headersMap.get(name.toLowerCase()) || null,
      has: name => headersMap.has(name.toLowerCase()),
      entries: () => headersMap.entries(),
    },
    json: async () => body || {},
    validated,
    auth,
    url: 'http://localhost:8787/test',
  };
}
