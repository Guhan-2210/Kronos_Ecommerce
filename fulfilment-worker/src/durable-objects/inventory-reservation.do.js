/**
 * Inventory Reservation Durable Object
 *
 * Each DO instance manages reservations for a specific product at a specific warehouse
 * DO ID format: ${productId}:${warehouseId}
 *
 * This handles concurrent inventory reservations with TTL-based expiry
 */

export class InventoryReservationDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.reservations = new Map(); // orderId -> { quantity, expiresAt, userId }
    this.stock = null; // Current stock from DB
    this.lastSync = null;

    // IMPORTANT: state.id.name is NULL in new Cloudflare Workers runtime
    // We must get productId/warehouseId from request bodies instead
    this.productId = null;
    this.warehouseId = null;
    this.doName = null;

    // TTL for reservations: 15 minutes (industry standard for payment completion)
    this.RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

    // How often to sync with DB
    this.SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds

    // Initialize state from storage
    this.state.blockConcurrencyWhile(async () => {
      // state.storage.get() with array returns a Map, so use .get() to access values
      const stored = await this.state.storage.get([
        'reservations',
        'stock',
        'lastSync',
        'productId',
        'warehouseId',
      ]);
      this.reservations = new Map(stored.get('reservations') || []);
      this.stock = stored.get('stock') || null;
      this.lastSync = stored.get('lastSync') || null;

      // Restore productId/warehouseId if we have them
      this.productId = stored.get('productId') || null;
      this.warehouseId = stored.get('warehouseId') || null;
      if (this.productId && this.warehouseId) {
        this.doName = `${this.productId}:${this.warehouseId}`;
        console.log(`[DO Constructor] Restored IDs from storage: ${this.doName}`);
      }

      console.log(`[DO Constructor] Loaded ${this.reservations.size} reservations from storage`);

      // Clean up expired reservations on startup
      this.cleanupExpiredReservations();
    });

    // Set up alarm for periodic cleanup
    this.setupAlarm();
  }

  /**
   * Set up alarm for periodic cleanup and sync
   */
  async setupAlarm() {
    const currentAlarm = await this.state.storage.getAlarm();
    if (currentAlarm === null) {
      // Schedule alarm for 1 minute from now
      await this.state.storage.setAlarm(Date.now() + 60000);
    }
  }

  /**
   * Alarm handler - runs periodically to clean up expired reservations
   */
  async alarm() {
    console.log(`[DO Alarm] Running cleanup for ${this.getDoId()}`);

    // Clean up expired reservations
    const cleaned = this.cleanupExpiredReservations();
    if (cleaned > 0) {
      console.log(`[DO Alarm] Cleaned up ${cleaned} expired reservations`);
      await this.persist();
    }

    // Schedule next alarm
    await this.state.storage.setAlarm(Date.now() + 60000);
  }

  /**
   * Set product and warehouse IDs (called from requests)
   */
  setIds(productId, warehouseId) {
    if (productId && warehouseId) {
      this.productId = productId;
      this.warehouseId = warehouseId;
      this.doName = `${productId}:${warehouseId}`;
    }
  }

  /**
   * Get DO ID (productId:warehouseId)
   */
  getDoId() {
    return this.doName || 'uninitialized';
  }

  /**
   * Parse DO ID to get productId and warehouseId
   */
  parseDoId() {
    return { productId: this.productId, warehouseId: this.warehouseId };
  }

  /**
   * Clean up expired reservations
   * Returns number of reservations cleaned up
   */
  cleanupExpiredReservations() {
    const now = Date.now();
    let cleaned = 0;

    for (const [orderId, reservation] of this.reservations.entries()) {
      if (reservation.expiresAt <= now) {
        console.log(`[DO Cleanup] Expired reservation for order ${orderId}`);
        this.reservations.delete(orderId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Sync stock from database
   */
  async syncStockFromDB() {
    const { productId, warehouseId } = this.parseDoId();

    console.log(`[DO Sync] Syncing for productId: ${productId}, warehouseId: ${warehouseId}`);

    if (!productId || !warehouseId) {
      throw new Error(`Invalid DO ID: productId=${productId}, warehouseId=${warehouseId}`);
    }

    try {
      const query = `
        SELECT quantity 
        FROM inventory 
        WHERE product_id = ? AND warehouse_id = ?
      `;

      const result = await this.env.DB.prepare(query).bind(productId, warehouseId).first();

      console.log(
        `[DO Sync] Query result for ${productId}:${warehouseId}:`,
        JSON.stringify(result)
      );

      if (result) {
        this.stock = {
          quantity: result.quantity,
        };
        this.lastSync = Date.now();
        await this.persist();
      } else {
        console.log(`[DO Sync] No stock found for ${productId}:${warehouseId}`);
      }

      return result;
    } catch (error) {
      console.error(`[DO Sync] Error syncing stock for ${productId}:${warehouseId}:`, error);
      throw error;
    }
  }

  /**
   * Get available stock (considering DO reservations)
   */
  getAvailableStock() {
    if (!this.stock) {
      return 0;
    }

    // Calculate total reserved in DO
    let totalReserved = 0;
    for (const reservation of this.reservations.values()) {
      totalReserved += reservation.quantity;
    }

    // Available = physical stock - DO reservations
    const available = this.stock.quantity - totalReserved;
    return Math.max(0, available);
  }

  /**
   * Persist state to durable storage
   */
  async persist() {
    await this.state.storage.put({
      reservations: Array.from(this.reservations.entries()),
      stock: this.stock,
      lastSync: this.lastSync,
      productId: this.productId,
      warehouseId: this.warehouseId,
    });
  }

  /**
   * Reserve stock for an order
   */
  async handleReserve(request) {
    const { orderId, quantity, userId, productId, warehouseId } = await request.json();
    const now = Date.now();

    // Set the IDs from the request
    this.setIds(productId, warehouseId);

    console.log(`[DO Reserve] ${this.getDoId()} - Order ${orderId} requesting ${quantity} units`);
    console.log(
      `[DO Reserve] Creating reservation that expires in ${this.RESERVATION_TTL_MS / 60000} minutes`
    );

    // Clean up expired reservations first
    this.cleanupExpiredReservations();

    // Sync from DB if needed (first time or stale)
    if (!this.stock || !this.lastSync || now - this.lastSync > this.SYNC_INTERVAL_MS) {
      console.log('[DO Reserve] Syncing stock from DB');
      await this.syncStockFromDB();
    }

    if (!this.stock) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'product_not_found',
          message: 'Product not found in inventory',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if order already has a reservation
    if (this.reservations.has(orderId)) {
      const existing = this.reservations.get(orderId);
      console.log(`[DO Reserve] Order ${orderId} already has reservation`);

      return new Response(
        JSON.stringify({
          success: true,
          already_reserved: true,
          quantity: existing.quantity,
          expires_at: existing.expiresAt,
          expires_in_ms: existing.expiresAt - now,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check available stock
    const available = this.getAvailableStock();
    console.log(`[DO Reserve] Available stock: ${available}, Requested: ${quantity}`);

    if (available < quantity) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'insufficient_stock',
          available,
          requested: quantity,
          message: `Insufficient stock. Available: ${available}, Requested: ${quantity}`,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create reservation
    const expiresAt = now + this.RESERVATION_TTL_MS;
    this.reservations.set(orderId, {
      quantity,
      userId,
      expiresAt,
      createdAt: now,
    });

    await this.persist();

    console.log(
      `[DO Reserve] Reserved ${quantity} units for order ${orderId}, expires at ${new Date(expiresAt).toISOString()}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        quantity,
        expires_at: expiresAt,
        expires_in_ms: this.RESERVATION_TTL_MS,
        available_after_reservation: this.getAvailableStock(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Confirm reservation and commit to database
   */
  async handleConfirm(request) {
    const { orderId, productId, warehouseId } = await request.json();

    // Set the IDs from the request
    this.setIds(productId, warehouseId);

    console.log(`[DO Confirm] ${this.getDoId()} - Confirming order ${orderId}`);
    console.log('[DO Confirm] Current reservations in DO:', Array.from(this.reservations.keys()));
    console.log(`[DO Confirm] Total reservations: ${this.reservations.size}`);

    // Clean up expired reservations
    const cleaned = this.cleanupExpiredReservations();
    if (cleaned > 0) {
      console.log(
        `[DO Confirm] Cleaned ${cleaned} expired reservations before checking for ${orderId}`
      );
    }

    const reservation = this.reservations.get(orderId);

    if (!reservation) {
      console.error(
        `[DO Confirm] ERROR: Reservation ${orderId} not found! Available reservations:`,
        Array.from(this.reservations.keys())
      );
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'reservation_not_found',
          message: 'Reservation not found or expired',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if expired
    if (reservation.expiresAt <= Date.now()) {
      this.reservations.delete(orderId);
      await this.persist();

      return new Response(
        JSON.stringify({
          success: false,
          reason: 'reservation_expired',
          message: 'Reservation has expired',
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Commit to database: reduce actual stock
      const query = `
        UPDATE inventory 
        SET quantity = quantity - ?
        WHERE product_id = ? AND warehouse_id = ? AND quantity >= ?
      `;

      const result = await this.env.DB.prepare(query)
        .bind(reservation.quantity, productId, warehouseId, reservation.quantity)
        .run();

      if (!result.success || result.meta.changes === 0) {
        throw new Error('Failed to commit stock reduction in database');
      }

      // Remove reservation from DO
      this.reservations.delete(orderId);

      // Update local stock cache
      if (this.stock) {
        this.stock.quantity -= reservation.quantity;
      }

      await this.persist();

      console.log(
        `[DO Confirm] Successfully confirmed order ${orderId}, reduced ${reservation.quantity} units`
      );

      return new Response(
        JSON.stringify({
          success: true,
          orderId,
          quantity_committed: reservation.quantity,
          remaining_stock: this.stock ? this.stock.quantity : null,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error(`[DO Confirm] Error confirming order ${orderId}:`, error);

      return new Response(
        JSON.stringify({
          success: false,
          reason: 'commit_failed',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Release reservation (manual or on cancellation)
   */
  async handleRelease(request) {
    const { orderId } = await request.json();

    console.log(`[DO Release] ${this.getDoId()} - Releasing order ${orderId}`);

    const reservation = this.reservations.get(orderId);

    if (!reservation) {
      // Already released or expired
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reservation already released or expired',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Remove reservation
    this.reservations.delete(orderId);
    await this.persist();

    console.log(`[DO Release] Released ${reservation.quantity} units for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        quantity_released: reservation.quantity,
        available_after_release: this.getAvailableStock(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Check stock availability (considering reservations)
   */
  async handleCheck(request) {
    const { quantity, productId, warehouseId } = await request.json();
    const now = Date.now();

    // Set the IDs from the request
    this.setIds(productId, warehouseId);

    console.log(`[DO Check] ${this.getDoId()} - Checking ${quantity} units`);

    // Clean up expired reservations
    this.cleanupExpiredReservations();

    // Sync from DB if needed
    if (!this.stock || !this.lastSync || now - this.lastSync > this.SYNC_INTERVAL_MS) {
      await this.syncStockFromDB();
    }

    if (!this.stock) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'product_not_found',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const available = this.getAvailableStock();

    return new Response(
      JSON.stringify({
        available: available >= quantity,
        available_stock: available,
        requested: quantity,
        active_reservations: this.reservations.size,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Get reservation info (for debugging and stock availability checks)
   * IMPORTANT: Now syncs from DB to ensure accurate stock data
   */
  async handleInfo(request) {
    const now = Date.now();

    // Accept productId/warehouseId from request body to ensure correct values
    try {
      const body = await request.json();
      if (body.productId && body.warehouseId) {
        this.setIds(body.productId, body.warehouseId);
        console.log(`[DO Info] Set IDs from request: ${this.getDoId()}`);
      }
    } catch (e) {
      // If body parsing fails or no body, use existing IDs (if we have them)
      console.log('[DO Info] No JSON body provided, using stored IDs:', this.getDoId());
    }

    this.cleanupExpiredReservations();

    // Sync from DB if needed (same logic as handleCheck)
    if (
      this.productId &&
      this.warehouseId &&
      (!this.stock || !this.lastSync || now - this.lastSync > this.SYNC_INTERVAL_MS)
    ) {
      console.log(`[DO Info] Syncing stock from DB for ${this.getDoId()}`);
      await this.syncStockFromDB();
    }

    const reservationsList = Array.from(this.reservations.entries()).map(([orderId, res]) => ({
      orderId,
      quantity: res.quantity,
      userId: res.userId,
      expiresAt: res.expiresAt,
      expiresIn: Math.max(0, res.expiresAt - Date.now()),
      createdAt: res.createdAt,
    }));

    return new Response(
      JSON.stringify({
        doId: this.getDoId(),
        stock: this.stock,
        available: this.getAvailableStock(),
        reservations: reservationsList,
        lastSync: this.lastSync,
        lastSyncAge: this.lastSync ? Date.now() - this.lastSync : null,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Force cleanup of all expired reservations (debug endpoint)
   */
  async handleCleanup(request) {
    const beforeCount = this.reservations.size;
    const cleaned = this.cleanupExpiredReservations();
    await this.persist();

    console.log(`[DO Cleanup] Cleaned ${cleaned} expired reservations out of ${beforeCount} total`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned ${cleaned} expired reservations`,
        before: beforeCount,
        after: this.reservations.size,
        doId: this.getDoId(),
        available: this.getAvailableStock(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Main fetch handler
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/reserve':
          return await this.handleReserve(request);
        case '/confirm':
          return await this.handleConfirm(request);
        case '/release':
          return await this.handleRelease(request);
        case '/check':
          return await this.handleCheck(request);
        case '/info':
          return await this.handleInfo(request);
        case '/cleanup':
          return await this.handleCleanup(request);
        default:
          return new Response(
            JSON.stringify({
              error: 'Not found',
              available_endpoints: [
                '/reserve',
                '/confirm',
                '/release',
                '/check',
                '/info',
                '/cleanup',
              ],
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            }
          );
      }
    } catch (error) {
      console.error(`[DO Error] ${this.getDoId()}:`, error);

      return new Response(
        JSON.stringify({
          error: 'Internal error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}
