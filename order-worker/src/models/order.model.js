/**
 * Order Model - Database operations for orders
 */

export const OrderModel = {
  /**
   * Create a new order
   */
  async create(db, orderId, userId, cartId, orderData, userData, totalAmount, currency = 'USD') {
    const now = Date.now();

    await db
      .prepare(
        `
        INSERT INTO orders (
          id, user_id, cart_id, order_data, user_data, 
          status, total_amount, currency, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        orderId,
        userId,
        cartId,
        JSON.stringify(orderData),
        JSON.stringify(userData),
        'pending',
        totalAmount,
        currency,
        now,
        now
      )
      .run();

    return this.getById(db, orderId);
  },

  /**
   * Get order by ID (excluding soft-deleted)
   */
  async getById(db, orderId) {
    const result = await db
      .prepare('SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL')
      .bind(orderId)
      .first();

    if (result) {
      return {
        ...result,
        order_data: JSON.parse(result.order_data),
        user_data: JSON.parse(result.user_data),
      };
    }

    return null;
  },

  /**
   * Get orders by user ID
   */
  async getByUserId(db, userId, limit = 50, offset = 0) {
    const results = await db
      .prepare(
        `
        SELECT * FROM orders 
        WHERE user_id = ? AND deleted_at IS NULL 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `
      )
      .bind(userId, limit, offset)
      .all();

    return results.results.map(order => ({
      ...order,
      order_data: JSON.parse(order.order_data),
      user_data: JSON.parse(order.user_data),
    }));
  },

  /**
   * Get order by cart ID
   */
  async getByCartId(db, cartId) {
    const result = await db
      .prepare('SELECT * FROM orders WHERE cart_id = ? AND deleted_at IS NULL')
      .bind(cartId)
      .first();

    if (result) {
      return {
        ...result,
        order_data: JSON.parse(result.order_data),
        user_data: JSON.parse(result.user_data),
      };
    }

    return null;
  },

  /**
   * Update order status
   */
  async updateStatus(db, orderId, status) {
    const now = Date.now();

    await db
      .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, orderId)
      .run();

    return this.getById(db, orderId);
  },

  /**
   * Update payment ID
   */
  async updatePaymentId(db, orderId, paymentId) {
    const now = Date.now();

    await db
      .prepare('UPDATE orders SET payment_id = ?, updated_at = ? WHERE id = ?')
      .bind(paymentId, now, orderId)
      .run();

    return this.getById(db, orderId);
  },

  /**
   * Soft delete order
   */
  async softDelete(db, orderId) {
    const now = Date.now();

    await db
      .prepare('UPDATE orders SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, orderId)
      .run();

    return true;
  },

  /**
   * Update order data (for rollback scenarios)
   */
  async updateOrderData(db, orderId, orderData) {
    const now = Date.now();

    await db
      .prepare('UPDATE orders SET order_data = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(orderData), now, orderId)
      .run();

    return this.getById(db, orderId);
  },
};
