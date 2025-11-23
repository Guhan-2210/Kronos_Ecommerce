import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Warehouse model
 */

export const WarehouseModel = {
  /**
   * Get all active warehouses
   */
  async getAllActive(db) {
    const query = `
      SELECT * FROM warehouses 
      WHERE is_active = 1
      ORDER BY name
    `;
    return await fetchAll(db, query);
  },

  /**
   * Get warehouse by ID
   */
  async getById(db, warehouseId) {
    const query = 'SELECT * FROM warehouses WHERE id = ?';
    const result = await fetchOne(db, query, [warehouseId]);

    if (result && result.address_data) {
      result.address_data = JSON.parse(result.address_data);
    }

    return result;
  },

  /**
   * Get warehouses sorted by distance from coordinates
   */
  async getByProximity(db, latitude, longitude) {
    const warehouses = await this.getAllActive(db);

    // Calculate distance for each warehouse
    const { calculateDistance } = await import('../utils/helpers.js');

    return warehouses
      .map(warehouse => ({
        ...warehouse,
        address_data: JSON.parse(warehouse.address_data),
        distance: calculateDistance(latitude, longitude, warehouse.latitude, warehouse.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);
  },
};
