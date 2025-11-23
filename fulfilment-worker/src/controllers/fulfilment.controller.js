import { FulfilmentService } from '../services/fulfilment.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Fulfilment controller for itty-router
 */

export const FulfilmentController = {
  /**
   * Check general stock availability across all warehouses (no zipcode needed)
   * POST /stock/check-general
   */
  async checkGeneralStock(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const result = await FulfilmentService.checkGeneralStockAvailability(
        env,
        data.product_id,
        data.quantity || 1
      );

      return new Response(
        JSON.stringify(successResponse(result, 'General stock availability checked')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Check general stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to check general stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Check stock availability for a product
   * POST /stock/check
   */
  async checkStock(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const result = await FulfilmentService.checkStockAvailability(
        env,
        data.product_id,
        data.zipcode,
        data.quantity || 1
      );

      return new Response(JSON.stringify(successResponse(result, 'Stock availability checked')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Check stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to check stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Check stock for multiple products (batch)
   * POST /stock/check-batch
   */
  async checkBatchStock(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const result = await FulfilmentService.checkBatchStockAvailability(
        env,
        data.items,
        data.zipcode
      );

      return new Response(
        JSON.stringify(successResponse(result, 'Batch stock availability checked')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Check batch stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to check batch stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get delivery options for a zipcode
   * POST /delivery/options
   */
  async getDeliveryOptions(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const options = await FulfilmentService.getDeliveryOptions(
        env,
        data.zipcode,
        data.items || []
      );

      return new Response(
        JSON.stringify(successResponse(options, 'Delivery options retrieved successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Get delivery options error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to get delivery options', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Reserve stock for cart
   * POST /stock/reserve
   * REQUIRES AUTH - Only authenticated users can reserve stock
   */
  async reserveStock(request, env) {
    try {
      const data = request.validatedData || (await request.json());
      const userId = request.auth.userId; // Extract from JWT token

      const result = await FulfilmentService.reserveStockForCart(
        env,
        data.items,
        data.zipcode,
        userId,
        data.order_id // Pass orderId for DO reservation
      );

      if (!result.success) {
        return new Response(JSON.stringify(errorResponse(result.message, 400, result)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(successResponse(result, 'Stock reserved successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Reserve stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to reserve stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Reserve stock for order (internal endpoint called by order-worker)
   * POST /api/stock/reserve-for-order
   * INTERNAL - Called by order-worker during order creation
   */
  async reserveStockForOrder(request, env) {
    try {
      const { order_id, user_id, items } = await request.json();

      if (!order_id || !user_id || !items || !Array.isArray(items)) {
        return new Response(
          JSON.stringify(errorResponse('Missing required fields: order_id, user_id, items', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await FulfilmentService.reserveStockForOrder(env, order_id, user_id, items);

      if (!result.success) {
        return new Response(JSON.stringify(errorResponse(result.message, 400, result)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(successResponse(result, 'Stock reserved for order')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Reserve stock for order error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to reserve stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Release stock reservations for order (internal endpoint)
   * POST /api/stock/release-for-order
   * INTERNAL - Called by order-worker on order failure or cancellation
   */
  async releaseStockForOrder(request, env) {
    try {
      const { order_id } = await request.json();

      if (!order_id) {
        return new Response(
          JSON.stringify(errorResponse('Missing required field: order_id', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await FulfilmentService.releaseStockForOrder(env, order_id);

      return new Response(JSON.stringify(successResponse(result, 'Stock reservations released')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Release stock for order error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to release stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Release stock reservations
   * POST /stock/release
   * REQUIRES AUTH - Only authenticated users can release their reservations
   */
  async releaseStock(request, env) {
    try {
      const { reservations, order_id } = await request.json();
      const userId = request.auth.userId; // Extract from JWT token

      if (!Array.isArray(reservations)) {
        return new Response(
          JSON.stringify(errorResponse('Missing required field: reservations (array)', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await FulfilmentService.releaseReservations(
        env,
        reservations,
        userId,
        order_id // Pass order_id for DO release
      );

      return new Response(JSON.stringify(successResponse(result, 'Stock reservations released')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Release stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to release stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Reduce stock after order confirmation
   * POST /api/fulfilment/reduce-stock
   * INTERNAL - Called by order-worker
   */
  async reduceStock(request, env) {
    try {
      const { product_id, warehouse_id, quantity, order_id } = await request.json();

      if (!product_id || !warehouse_id || !quantity || !order_id) {
        return new Response(JSON.stringify(errorResponse('Missing required fields', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await FulfilmentService.reduceStock(
        env,
        product_id,
        warehouse_id,
        quantity,
        order_id
      );

      return new Response(JSON.stringify(successResponse(result, 'Stock reduced successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Reduce stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to reduce stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Restore stock (rollback)
   * POST /api/fulfilment/restore-stock
   * INTERNAL - Called by order-worker during error recovery
   */
  async restoreStock(request, env) {
    try {
      const { product_id, warehouse_id, quantity, order_id } = await request.json();

      if (!product_id || !warehouse_id || !quantity || !order_id) {
        return new Response(JSON.stringify(errorResponse('Missing required fields', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await FulfilmentService.restoreStock(
        env,
        product_id,
        warehouse_id,
        quantity,
        order_id
      );

      return new Response(JSON.stringify(successResponse(result, 'Stock restored successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Restore stock error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to restore stock', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get reservation status for a product at a warehouse (debug endpoint)
   * POST /api/stock/reservations
   */
  async getReservations(request, env) {
    try {
      const { product_id, warehouse_id } = await request.json();

      if (!product_id || !warehouse_id) {
        return new Response(
          JSON.stringify(errorResponse('Missing required fields: product_id, warehouse_id', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if INVENTORY_RESERVATIONS binding exists
      if (!env.INVENTORY_RESERVATIONS) {
        return new Response(JSON.stringify(errorResponse('Durable Objects not configured', 500)), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get the Durable Object for this product-warehouse pair
      const doId = `${product_id}:${warehouse_id}`;
      const id = env.INVENTORY_RESERVATIONS.idFromName(doId);
      const stub = env.INVENTORY_RESERVATIONS.get(id);

      // Call the /info endpoint on the DO
      const response = await stub.fetch('http://do/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id, warehouse_id }),
      });

      const result = await response.json();

      return new Response(JSON.stringify(successResponse(result, 'Reservation status retrieved')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get reservations error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to get reservations', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
