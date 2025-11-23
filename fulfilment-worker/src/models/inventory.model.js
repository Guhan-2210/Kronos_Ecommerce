import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Inventory model
 */

export const InventoryModel = {
  /**
   * Check stock for a product across all warehouses
   */
  async checkStock(db, productId) {
    const query = `
      SELECT i.*, w.name as warehouse_name, w.latitude, w.longitude
      FROM inventory i
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.product_id = ? AND w.is_active = 1 AND i.quantity > 0
      ORDER BY i.quantity DESC
    `;
    return await fetchAll(db, query, [productId]);
  },

  /**
   * Get stock at specific warehouse
   */
  async getStockAtWarehouse(db, productId, warehouseId) {
    const query = `
      SELECT * FROM inventory 
      WHERE product_id = ? AND warehouse_id = ?
    `;
    return await fetchOne(db, query, [productId, warehouseId]);
  },

  // OLD METHODS - NO LONGER USED (Durable Objects manage reservations now)
  // These can be removed after confirming DO system works:
  // - reserveStock()
  // - releaseStock()
  // - commitStock()
};
