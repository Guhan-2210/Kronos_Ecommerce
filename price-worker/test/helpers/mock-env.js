// test/helpers/mock-env.js - Mock environment for testing

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
          if (this._sql.includes('INSERT INTO prices')) {
            const [id, productId, price, currency] = this._bindings;
            const now = Math.floor(Date.now() / 1000);
            store.set(`price:${productId}`, {
              id,
              product_id: productId,
              price,
              currency,
              created_at: now,
              updated_at: now,
            });
            return { success: true };
          }
          if (this._sql.includes('UPDATE prices')) {
            const [price, currency, productId] = this._bindings;
            const existing = store.get(`price:${productId}`);
            if (existing) {
              const now = Math.floor(Date.now() / 1000);
              existing.price = price;
              existing.currency = currency;
              existing.updated_at = now;
              store.set(`price:${productId}`, existing);
            }
            return { success: true };
          }
          if (this._sql.includes('DELETE FROM prices')) {
            const [productId] = this._bindings;
            store.delete(`price:${productId}`);
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (this._sql.includes('SELECT')) {
            const [productId] = this._bindings;
            return store.get(`price:${productId}`) || null;
          }
          return null;
        },
        async all() {
          if (this._sql.includes('SELECT') && this._sql.includes('IN')) {
            const results = [];
            for (const productId of this._bindings) {
              const price = store.get(`price:${productId}`);
              if (price) {
                results.push(price);
              }
            }
            return { results };
          }
          return { results: [] };
        },
      };
    },
    _reset: () => store.clear(),
    _getStore: () => store,
  };
}

export function createMockKV() {
  const store = new Map();

  return {
    get: async (key, type = 'text') => {
      const value = store.get(key);
      if (!value) return null;

      if (type === 'json') {
        return JSON.parse(value.data);
      }
      return value.data;
    },
    put: async (key, value, options = {}) => {
      store.set(key, {
        data: value,
        expiration: options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null,
      });
    },
    delete: async key => {
      store.delete(key);
    },
    _reset: () => store.clear(),
    _getStore: () => store,
  };
}

export function createMockEnv() {
  return {
    DB: createMockDB(),
    PRICE_CACHE: createMockKV(),
    CACHE_TTL_SECONDS: '3600',
  };
}

export function createMockRequest(options = {}) {
  const { method = 'GET', url = 'http://localhost:8790/test', headers = {}, body = null } = options;

  const headersMap = new Map(Object.entries(headers));

  return {
    method,
    url,
    headers: {
      get: name => headersMap.get(name.toLowerCase()) || null,
      has: name => headersMap.has(name.toLowerCase()),
      entries: () => headersMap.entries(),
    },
    json: async () => body || {},
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    validatedData: null,
  };
}
