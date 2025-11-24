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
          if (this._sql.includes('INSERT INTO products')) {
            const [id, productData] = this._bindings;
            const now = Math.floor(Date.now() / 1000);
            store.set(`product:${id}`, {
              id,
              product_data: productData,
              created_at: now,
              updated_at: now,
            });
            return { success: true };
          }
          if (this._sql.includes('UPDATE products')) {
            const [productData, id] = this._bindings;
            const product = store.get(`product:${id}`);
            if (product) {
              const now = Math.floor(Date.now() / 1000);
              product.product_data = productData;
              product.updated_at = now;
              store.set(`product:${id}`, product);
            }
            return { success: true };
          }
          if (this._sql.includes('DELETE FROM products')) {
            const [id] = this._bindings;
            store.delete(`product:${id}`);
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (this._sql.includes('SELECT * FROM products WHERE id')) {
            const [id] = this._bindings;
            return store.get(`product:${id}`) || null;
          }
          if (this._sql.includes('SELECT 1 FROM products')) {
            const [id] = this._bindings;
            return store.has(`product:${id}`) ? { 1: 1 } : null;
          }
          if (this._sql.includes('SELECT COUNT')) {
            let count = 0;
            for (const [key] of store.entries()) {
              if (key.startsWith('product:')) {
                count++;
              }
            }
            return { total: count };
          }
          return null;
        },
        async all() {
          // Handle both full SELECT * and field-specific SELECT queries
          if (this._sql.includes('SELECT') && this._sql.includes('FROM products')) {
            const results = [];
            for (const [key, value] of store.entries()) {
              if (key.startsWith('product:')) {
                // Check if this is a field-specific query (with json_extract)
                if (this._sql.includes('json_extract')) {
                  // Parse the product_data JSON
                  const productData =
                    typeof value.product_data === 'string'
                      ? JSON.parse(value.product_data)
                      : value.product_data;

                  // Return only the extracted fields
                  results.push({
                    id: value.id,
                    name: productData.name || null,
                    brand: productData.brand || null,
                    image_url: productData.media?.image || null,
                    created_at: value.created_at,
                    updated_at: value.updated_at,
                  });
                } else {
                  // Return full product data
                  results.push(value);
                }
              }
            }

            // Sort by created_at descending (default)
            results.sort((a, b) => b.created_at - a.created_at);

            // Apply limit and offset if provided
            if (this._bindings.length >= 2) {
              const limit = this._bindings[this._bindings.length - 2];
              const offset = this._bindings[this._bindings.length - 1];
              return { results: results.slice(offset, offset + limit) };
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

export function createMockR2() {
  const store = new Map();

  return {
    put: async (key, value, options = {}) => {
      store.set(key, {
        body: value,
        httpMetadata: options.httpMetadata || {},
      });
    },
    get: async key => {
      return store.get(key) || null;
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
    SKU_CACHE: createMockKV(),
    prod_images: createMockR2(),
    R2_PUBLIC_URL: 'https://test-public-url.com',
    CACHE_TTL_SECONDS: '3600',
  };
}

export function createMockRequest(options = {}) {
  const { method = 'GET', url = 'http://localhost:8787/test', headers = {}, body = null } = options;

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
    validatedQuery: null,
  };
}
