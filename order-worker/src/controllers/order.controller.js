import { OrderService } from '../services/order.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Order Controller - Handles HTTP requests for orders
 * Note: These endpoints are PRIVATE and should only be called by cart-worker
 */

export const OrderController = {
  /**
   * Create order (called by cart-worker)
   * POST /api/orders/create
   */
  async createOrder(request, env) {
    try {
      const body = await request.json();
      const { user_id, cart_id, cart_data, user_data } = body;

      if (!user_id || !cart_id || !cart_data || !user_data) {
        return new Response(JSON.stringify(errorResponse('Missing required fields', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const order = await OrderService.createOrder(env, user_id, cart_id, cart_data, user_data);

      return new Response(JSON.stringify(successResponse(order, 'Order created successfully')), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[OrderController] Create error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Initiate payment for order (called by cart-worker)
   * POST /api/orders/:orderId/initiate-payment
   */
  async initiatePayment(request, env) {
    try {
      const { orderId } = request.params;

      const result = await OrderService.initiatePayment(env, orderId);

      return new Response(
        JSON.stringify(successResponse(result, 'Payment initiated successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[OrderController] Payment initiation error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Confirm order after payment (called by cart-worker)
   * POST /api/orders/:orderId/confirm
   */
  async confirmOrder(request, env) {
    try {
      const { orderId } = request.params;
      const body = await request.json();
      const { paypal_order_id } = body;

      if (!paypal_order_id) {
        return new Response(JSON.stringify(errorResponse('PayPal Order ID required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await OrderService.confirmOrder(env, orderId, paypal_order_id);

      return new Response(JSON.stringify(successResponse(result, 'Order confirmed successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[OrderController] Confirmation error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Get order by ID (called by cart-worker)
   * GET /api/orders/:orderId
   */
  async getOrder(request, env) {
    try {
      const { orderId } = request.params;
      const { userId } = request.query || {};

      if (!userId) {
        return new Response(JSON.stringify(errorResponse('User ID required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const order = await OrderService.getOrder(env, orderId, userId);

      return new Response(JSON.stringify(successResponse(order)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[OrderController] Get order error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 404)), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Get user's orders (called by cart-worker)
   * GET /api/orders/user/:userId
   */
  async getUserOrders(request, env) {
    try {
      const { userId } = request.params;
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const orders = await OrderService.getUserOrders(env, userId, limit, offset);

      return new Response(JSON.stringify(successResponse({ orders, count: orders.length })), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[OrderController] Get user orders error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Cancel order (called by cart-worker)
   * POST /api/orders/:orderId/cancel
   */
  async cancelOrder(request, env) {
    try {
      const { orderId } = request.params;
      const body = await request.json();
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify(errorResponse('User ID required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await OrderService.cancelOrder(env, orderId, user_id);

      return new Response(JSON.stringify(successResponse(result, 'Order cancelled successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[OrderController] Cancel order error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
