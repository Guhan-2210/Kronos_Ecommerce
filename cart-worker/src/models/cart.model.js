import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Cart model for database operations
 */

export const CartModel = {
  /**
   * Create a new cart
   */
  async create(db, cartId, userId, userData, productData) {
    const query = `
      INSERT INTO carts (id, user_id, user_data, product_data, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', unixepoch(), unixepoch())
    `;

    await executeQuery(db, query, [
      cartId,
      userId,
      JSON.stringify(userData),
      JSON.stringify(productData),
    ]);

    return await this.getById(db, cartId);
  },

  /**
   * Get cart by ID
   */
  async getById(db, cartId) {
    const query = 'SELECT * FROM carts WHERE id = ?';
    const cart = await fetchOne(db, query, [cartId]);

    if (!cart) return null;

    const parsed = this.parseCart(cart);

    // Debug logging
    if (parsed && parsed.product_data) {
      console.log(
        `[CartModel] Cart ${cartId} products from DB:`,
        JSON.stringify(
          parsed.product_data.map(p => ({
            id: p.product_id,
            warehouse_id: p.warehouse_id,
          }))
        )
      );
    }

    return parsed;
  },

  /**
   * Get active cart for user
   */
  async getActiveCartByUser(db, userId) {
    const query = `
      SELECT * FROM carts 
      WHERE user_id = ? AND status = 'active' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    const cart = await fetchOne(db, query, [userId]);

    if (!cart) return null;

    return this.parseCart(cart);
  },

  /**
   * Update cart products
   */
  async updateProducts(db, cartId, productData) {
    const query = `
      UPDATE carts 
      SET product_data = ?, updated_at = unixepoch()
      WHERE id = ?
    `;

    await executeQuery(db, query, [JSON.stringify(productData), cartId]);
    return await this.getById(db, cartId);
  },

  /**
   * Update shipping address
   */
  async updateShippingAddress(db, cartId, address) {
    const query = `
      UPDATE carts 
      SET shipping_address = ?, updated_at = unixepoch()
      WHERE id = ?
    `;

    await executeQuery(db, query, [JSON.stringify(address), cartId]);
    return await this.getById(db, cartId);
  },

  /**
   * Update billing address
   */
  async updateBillingAddress(db, cartId, address) {
    const query = `
      UPDATE carts 
      SET billing_address = ?, updated_at = unixepoch()
      WHERE id = ?
    `;

    await executeQuery(db, query, [JSON.stringify(address), cartId]);
    return await this.getById(db, cartId);
  },

  /**
   * Update cart status
   */
  async updateStatus(db, cartId, status) {
    const query = `
      UPDATE carts 
      SET status = ?, updated_at = unixepoch()
      WHERE id = ?
    `;

    await executeQuery(db, query, [status, cartId]);
    return await this.getById(db, cartId);
  },

  /**
   * Delete cart (hard delete)
   */
  async delete(db, cartId) {
    const query = 'DELETE FROM carts WHERE id = ?';
    const result = await executeQuery(db, query, [cartId]);
    return result.success;
  },

  /**
   * Soft delete cart (for order completion)
   */
  async softDelete(db, cartId) {
    const query = `
      UPDATE carts 
      SET deleted_at = unixepoch(), status = 'checked_out', updated_at = unixepoch()
      WHERE id = ?
    `;
    const result = await executeQuery(db, query, [cartId]);
    return result.success;
  },

  /**
   * Parse cart data (convert JSON strings to objects)
   */
  parseCart(cart) {
    return {
      ...cart,
      user_data: JSON.parse(cart.user_data),
      product_data: JSON.parse(cart.product_data),
      shipping_address: cart.shipping_address ? JSON.parse(cart.shipping_address) : null,
      billing_address: cart.billing_address ? JSON.parse(cart.billing_address) : null,
    };
  },
};
