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
        if (this._sql.includes('INSERT INTO payments')) {
          const [id, orderId, userId, amount, currency, status, createdAt, updatedAt] =
            this._bindings;
          store.set(`payment:${id}`, {
            id,
            order_id: orderId,
            user_id: userId,
            amount,
            currency,
            status,
            created_at: createdAt,
            updated_at: updatedAt,
            paypal_order_id: null,
            paypal_capture_id: null,
            encrypted_response: null,
            payer_email_hash: null,
            payer_id_hash: null,
            transaction_metadata: null,
            completed_at: null,
            error_code: null,
            error_message: null,
          });
          return { success: true };
        }

        if (this._sql.includes('UPDATE payments') && this._sql.includes('paypal_order_id')) {
          const [paypalOrderId, updatedAt, id] = this._bindings;
          const payment = store.get(`payment:${id}`);
          if (payment) {
            payment.paypal_order_id = paypalOrderId;
            payment.updated_at = updatedAt;
            store.set(`payment:${id}`, payment);
          }
          return { success: true };
        }

        if (
          this._sql.includes('UPDATE payments') &&
          this._sql.includes('status') &&
          !this._sql.includes('paypal_capture_id') &&
          !this._sql.includes('error_code')
        ) {
          const [status, updatedAt, id] = this._bindings;
          const payment = store.get(`payment:${id}`);
          if (payment) {
            payment.status = status;
            payment.updated_at = updatedAt;
            store.set(`payment:${id}`, payment);
          }
          return { success: true };
        }

        if (this._sql.includes('UPDATE payments') && this._sql.includes('paypal_capture_id')) {
          const [
            captureId,
            encryptedResponse,
            payerEmailHash,
            payerIdHash,
            metadata,
            status,
            completedAt,
            updatedAt,
            id,
          ] = this._bindings;
          const payment = store.get(`payment:${id}`);
          if (payment) {
            payment.paypal_capture_id = captureId;
            payment.encrypted_response = encryptedResponse;
            payment.payer_email_hash = payerEmailHash;
            payment.payer_id_hash = payerIdHash;
            payment.transaction_metadata = metadata;
            payment.status = status;
            payment.completed_at = completedAt;
            payment.updated_at = updatedAt;
            store.set(`payment:${id}`, payment);
          }
          return { success: true };
        }

        if (this._sql.includes('UPDATE payments') && this._sql.includes('error_code')) {
          const [status, errorCode, errorMessage, updatedAt, id] = this._bindings;
          const payment = store.get(`payment:${id}`);
          if (payment) {
            payment.status = status;
            payment.error_code = errorCode;
            payment.error_message = errorMessage;
            payment.updated_at = updatedAt;
            store.set(`payment:${id}`, payment);
          }
          return { success: true };
        }

        return { success: true };
      },
      async first() {
        if (this._sql.includes('SELECT') && this._sql.includes('WHERE id = ?')) {
          const [id] = this._bindings;
          const payment = store.get(`payment:${id}`);
          if (
            payment &&
            payment.transaction_metadata &&
            typeof payment.transaction_metadata === 'object'
          ) {
            return {
              ...payment,
              transaction_metadata: JSON.stringify(payment.transaction_metadata),
            };
          }
          return payment || null;
        }

        if (this._sql.includes('SELECT') && this._sql.includes('WHERE order_id = ?')) {
          const [orderId] = this._bindings;
          for (const [key, payment] of store.entries()) {
            if (key.startsWith('payment:') && payment.order_id === orderId) {
              if (
                payment.transaction_metadata &&
                typeof payment.transaction_metadata === 'object'
              ) {
                return {
                  ...payment,
                  transaction_metadata: JSON.stringify(payment.transaction_metadata),
                };
              }
              return payment;
            }
          }
          return null;
        }

        if (this._sql.includes('SELECT') && this._sql.includes('WHERE paypal_order_id = ?')) {
          const [paypalOrderId] = this._bindings;
          for (const [key, payment] of store.entries()) {
            if (key.startsWith('payment:') && payment.paypal_order_id === paypalOrderId) {
              if (
                payment.transaction_metadata &&
                typeof payment.transaction_metadata === 'object'
              ) {
                return {
                  ...payment,
                  transaction_metadata: JSON.stringify(payment.transaction_metadata),
                };
              }
              return payment;
            }
          }
          return null;
        }

        return null;
      },
      async all() {
        if (this._sql.includes('WHERE user_id = ?')) {
          const [userId, limit] = this._bindings;
          const results = [];
          for (const [key, payment] of store.entries()) {
            if (key.startsWith('payment:') && payment.user_id === userId) {
              const paymentCopy = { ...payment };
              if (
                paymentCopy.transaction_metadata &&
                typeof paymentCopy.transaction_metadata === 'object'
              ) {
                paymentCopy.transaction_metadata = JSON.stringify(paymentCopy.transaction_metadata);
              }
              results.push(paymentCopy);
            }
          }
          // Apply limit if provided
          return { results: limit ? results.slice(0, limit) : results };
        }
        return { results: [] };
      },
    }),
    _reset: () => store.clear(),
    _getStore: () => store,
  };
}

export function createMockEnv() {
  // Generate a random 32-byte key for AES-256
  const keyArray = new Uint8Array(32);
  crypto.getRandomValues(keyArray);
  const encryptionKey = btoa(String.fromCharCode(...keyArray));

  return {
    DB: createMockDB(),
    PAYPAL_CLIENT_ID: 'test_client_id',
    PAYPAL_CLIENT_SECRET: 'test_client_secret',
    PAYPAL_API_BASE: 'https://api-m.sandbox.paypal.com',
    PAYPAL_MODE: 'sandbox',
    FRONTEND_URL: 'http://localhost:5173',
    ENCRYPTION_KEY_B64: encryptionKey,
  };
}
