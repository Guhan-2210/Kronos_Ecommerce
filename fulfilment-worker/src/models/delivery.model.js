import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Delivery model
 */

export const DeliveryModel = {
  /**
   * Get delivery zone for a zipcode
   */
  async getZoneForZipcode(db, zipcode) {
    const query = `
      SELECT * FROM delivery_zones 
      WHERE ? LIKE zipcode_pattern 
      OR zipcode_pattern LIKE ?
      LIMIT 1
    `;
    const result = await fetchOne(db, query, [zipcode, `${zipcode}%`]);
    return result;
  },

  /**
   * Get delivery modes for a zone
   */
  async getDeliveryModesForZone(db, zoneId) {
    const query = `
      SELECT * FROM delivery_modes 
      WHERE zone_id = ? AND is_active = 1
      ORDER BY mode_name
    `;
    const modes = await fetchAll(db, query, [zoneId]);

    return modes.map(mode => ({
      ...mode,
      conditions: JSON.parse(mode.conditions),
    }));
  },

  /**
   * Get all delivery modes for zipcode
   */
  async getDeliveryModesForZipcode(db, zipcode) {
    const zone = await this.getZoneForZipcode(db, zipcode);

    if (!zone) {
      // Return default delivery modes if no zone found
      return this.getDefaultDeliveryModes();
    }

    return await this.getDeliveryModesForZone(db, zone.id);
  },

  /**
   * Default delivery modes (fallback)
   */
  getDefaultDeliveryModes() {
    return [
      {
        id: 'default-standard',
        mode_name: 'standard',
        conditions: {
          min_days: 5,
          max_days: 7,
          base_cost: 0, // Free standard shipping
          cutoff_time: '17:00',
        },
        is_active: 1,
      },
      {
        id: 'default-express',
        mode_name: 'express',
        conditions: {
          min_days: 2,
          max_days: 3,
          base_cost: 500, // Flat ₹500 for express
          cutoff_time: '12:00',
        },
        is_active: 1,
      },
    ];
  },
};
