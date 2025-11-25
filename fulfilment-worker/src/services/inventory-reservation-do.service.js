/**
 * Service for interacting with Inventory Reservation Durable Objects
 *
 * This service provides a clean interface for working with the DO-based
 * inventory reservation system
 */

export const InventoryReservationDOService = {
  /**
   * Get DO stub for a product at a warehouse
   */
  getStub(env, productId, warehouseId) {
    console.log(
      `[DO Service] Creating stub for productId: ${productId}, warehouseId: ${warehouseId}`
    );

    if (!productId || !warehouseId) {
      throw new Error(
        `Invalid parameters for DO stub: productId=${productId}, warehouseId=${warehouseId}`
      );
    }

    const doId = `${productId}:${warehouseId}`;
    console.log(`[DO Service] DO ID string: ${doId}`);

    const id = env.INVENTORY_RESERVATIONS.idFromName(doId);
    return env.INVENTORY_RESERVATIONS.get(id);
  },

  /**
   * Reserve stock for an order
   */
  async reserveStock(env, productId, warehouseId, orderId, quantity, userId) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      const response = await stub.fetch('http://do/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, quantity, userId, productId, warehouseId }),
      });

      const result = await response.json();

      return {
        success: result.success,
        ...result,
      };
    } catch (error) {
      console.error(`[DO Service] Reserve error for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Confirm reservation and commit to database
   */
  async confirmReservation(env, productId, warehouseId, orderId) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      const response = await stub.fetch('http://do/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productId, warehouseId }),
      });

      const result = await response.json();

      return {
        success: result.success,
        ...result,
      };
    } catch (error) {
      console.error(`[DO Service] Confirm error for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Release reservation
   */
  async releaseReservation(env, productId, warehouseId, orderId) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      const response = await stub.fetch('http://do/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      return {
        success: result.success,
        ...result,
      };
    } catch (error) {
      console.error(`[DO Service] Release error for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Check stock availability
   */
  async checkStock(env, productId, warehouseId, quantity) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      const response = await stub.fetch('http://do/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, productId, warehouseId }),
      });

      const result = await response.json();

      return result;
    } catch (error) {
      console.error(`[DO Service] Check error for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Get available stock considering active reservations
   * This is the key method for real-time stock availability
   */
  async getAvailableStock(env, productId, warehouseId) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      // Send productId and warehouseId in the request body so the DO can use them
      const response = await stub.fetch('http://do/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId }),
      });

      const result = await response.json();

      // Returns available stock after subtracting active reservations
      return {
        physical_stock: result.stock?.quantity || 0,
        available_stock: result.available || 0,
        active_reservations: result.reservations?.length || 0,
        total_reserved: result.stock?.quantity ? result.stock.quantity - result.available : 0,
      };
    } catch (error) {
      console.error(`[DO Service] GetAvailableStock error for ${productId}:${warehouseId}:`, error);
      // If DO check fails, fallback to database query (no reservation consideration)
      // This ensures the system doesn't break if DOs are unavailable
      return null;
    }
  },

  /**
   * Get reservation info (for debugging)
   */
  async getInfo(env, productId, warehouseId) {
    try {
      const stub = this.getStub(env, productId, warehouseId);

      const response = await stub.fetch('http://do/info', {
        method: 'GET',
      });

      const result = await response.json();

      return result;
    } catch (error) {
      console.error(`[DO Service] Info error for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  },
};
