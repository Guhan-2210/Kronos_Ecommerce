// test/helpers/mock-env.js
export function createMockDB() {
  const store = new Map();
  return {
    prepare: sql => ({
      _sql: sql,
      _bindings: [],
      bind(...values) {
        this._bindings = values;
        return this;
      },
      async run() {
        if (this._sql.includes('INSERT INTO carts')) {
          const [id, userId, userData, productData] = this._bindings;
          store.set(`cart:${id}`, {
            id,
            user_id: userId,
            user_data: userData,
            product_data: productData,
            status: 'active',
            shipping_address: null,
            billing_address: null,
          });
          return { success: true };
        }
        if (this._sql.includes('UPDATE carts') && this._sql.includes('product_data')) {
          const [productData, id] = this._bindings;
          const cart = store.get(`cart:${id}`);
          if (cart) {
            cart.product_data = productData;
            store.set(`cart:${id}`, cart);
          }
          return { success: true };
        }
        if (this._sql.includes('UPDATE carts') && this._sql.includes('shipping_address')) {
          const [shippingAddr, id] = this._bindings;
          const cart = store.get(`cart:${id}`);
          if (cart) {
            cart.shipping_address = shippingAddr;
            store.set(`cart:${id}`, cart);
          }
          return { success: true };
        }
        if (this._sql.includes('UPDATE carts') && this._sql.includes('billing_address')) {
          const [billingAddr, id] = this._bindings;
          const cart = store.get(`cart:${id}`);
          if (cart) {
            cart.billing_address = billingAddr;
            store.set(`cart:${id}`, cart);
          }
          return { success: true };
        }
        if (this._sql.includes('UPDATE carts') && this._sql.includes('status')) {
          const [status, id] = this._bindings;
          const cart = store.get(`cart:${id}`);
          if (cart) {
            cart.status = status;
            store.set(`cart:${id}`, cart);
          }
          return { success: true };
        }
        return { success: true };
      },
      async first() {
        if (this._sql.includes('SELECT') && this._sql.includes('WHERE id')) {
          const [id] = this._bindings;
          return store.get(`cart:${id}`) || null;
        }
        if (this._sql.includes('SELECT') && this._sql.includes('WHERE user_id')) {
          const [userId] = this._bindings;
          for (const [key, cart] of store.entries()) {
            if (key.startsWith('cart:') && cart.user_id === userId && cart.status === 'active') {
              return cart;
            }
          }
          return null;
        }
        return null;
      },
    }),
    _reset: () => store.clear(),
    _getStore: () => store,
  };
}

export function createMockEnv() {
  return {
    DB: createMockDB(),
    PRICE_SERVICE: null,
    FULFILMENT_SERVICE: null,
    ORDER_SERVICE: null,
  };
}
