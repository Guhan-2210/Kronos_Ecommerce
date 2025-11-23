import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Price model for database operations
 */

export const PriceModel = {
  /**
   * Create or update price for a product
   */
  async upsertPrice(db, productId, price, currency = 'INR') {
    // Check if price exists
    const existing = await fetchOne(db, 'SELECT id, price FROM prices WHERE product_id = ?', [
      productId,
    ]);

    if (existing) {
      // Update existing price
      const query = `
        UPDATE prices 
        SET price = ?, currency = ?, updated_at = unixepoch()
        WHERE product_id = ?
      `;
      await executeQuery(db, query, [price, currency, productId]);
      return { productId, price, currency, updated: true };
    } else {
      // Insert new price
      const id = `price-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const query = `
        INSERT INTO prices (id, product_id, price, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
      `;
      await executeQuery(db, query, [id, productId, price, currency]);
      return { productId, price, currency, created: true };
    }
  },

  /**
   * Get price for a product
   */
  async getPrice(db, productId) {
    const query = 'SELECT * FROM prices WHERE product_id = ?';
    return await fetchOne(db, query, [productId]);
  },

  /**
   * Get prices for multiple products
   */
  async getPrices(db, productIds) {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    const placeholders = productIds.map(() => '?').join(',');
    const query = `SELECT * FROM prices WHERE product_id IN (${placeholders})`;
    return await fetchAll(db, query, productIds);
  },

  /**
   * Delete price
   */
  async deletePrice(db, productId) {
    const query = 'DELETE FROM prices WHERE product_id = ?';
    const result = await executeQuery(db, query, [productId]);
    return result.success;
  },
};
