/**
 * Payment Model - Database operations for payments
 */

export const PaymentModel = {
  /**
   * Create a new payment record
   */
  async create(db, paymentId, orderId, userId, amount, currency = 'USD') {
    const now = Date.now();

    await db
      .prepare(
        `
        INSERT INTO payments (
          id, order_id, user_id, amount, currency,
          status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(paymentId, orderId, userId, amount, currency, 'initiated', now, now)
      .run();

    return this.getById(db, paymentId);
  },

  /**
   * Get payment by ID
   */
  async getById(db, paymentId) {
    const result = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first();

    if (result && result.transaction_metadata) {
      result.transaction_metadata = JSON.parse(result.transaction_metadata);
    }

    return result;
  },

  /**
   * Get payment by order ID
   */
  async getByOrderId(db, orderId) {
    const result = await db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(orderId)
      .first();

    if (result && result.transaction_metadata) {
      result.transaction_metadata = JSON.parse(result.transaction_metadata);
    }

    return result;
  },

  /**
   * Get payment by PayPal order ID
   */
  async getByPayPalOrderId(db, paypalOrderId) {
    const result = await db
      .prepare('SELECT * FROM payments WHERE paypal_order_id = ?')
      .bind(paypalOrderId)
      .first();

    if (result && result.transaction_metadata) {
      result.transaction_metadata = JSON.parse(result.transaction_metadata);
    }

    return result;
  },

  /**
   * Update PayPal order ID
   */
  async updatePayPalOrderId(db, paymentId, paypalOrderId) {
    const now = Date.now();

    await db
      .prepare('UPDATE payments SET paypal_order_id = ?, updated_at = ? WHERE id = ?')
      .bind(paypalOrderId, now, paymentId)
      .run();

    return this.getById(db, paymentId);
  },

  /**
   * Update payment status
   */
  async updateStatus(db, paymentId, status) {
    const now = Date.now();

    await db
      .prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, paymentId)
      .run();

    return this.getById(db, paymentId);
  },

  /**
   * Store PayPal capture details (after successful payment)
   */
  async storeCaptureDetails(
    db,
    paymentId,
    captureId,
    encryptedResponse,
    payerEmailHash,
    payerIdHash,
    metadata
  ) {
    const now = Date.now();

    await db
      .prepare(
        `
        UPDATE payments 
        SET paypal_capture_id = ?, 
            encrypted_response = ?,
            payer_email_hash = ?,
            payer_id_hash = ?,
            transaction_metadata = ?,
            status = ?,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .bind(
        captureId,
        encryptedResponse,
        payerEmailHash,
        payerIdHash,
        JSON.stringify(metadata),
        'captured',
        now,
        now,
        paymentId
      )
      .run();

    return this.getById(db, paymentId);
  },

  /**
   * Store payment failure details
   */
  async storeFailureDetails(db, paymentId, errorCode, errorMessage) {
    const now = Date.now();

    await db
      .prepare(
        `
        UPDATE payments 
        SET status = ?, 
            error_code = ?,
            error_message = ?,
            updated_at = ?
        WHERE id = ?
      `
      )
      .bind('failed', errorCode, errorMessage, now, paymentId)
      .run();

    return this.getById(db, paymentId);
  },

  /**
   * Get payments by user ID
   */
  async getByUserId(db, userId, limit = 50) {
    const results = await db
      .prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(userId, limit)
      .all();

    return results.results.map(payment => {
      if (payment.transaction_metadata) {
        payment.transaction_metadata = JSON.parse(payment.transaction_metadata);
      }
      return payment;
    });
  },
};
