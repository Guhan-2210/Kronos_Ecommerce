import { CartService } from '../services/cart.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Cart controller for itty-router
 */

export const CartController = {
  /**
   * Add product to cart
   * POST /cart/add
   * REQUIRES AUTH - userId from JWT token
   */
  async addToCart(request, env) {
    try {
      const data = request.validatedData || (await request.json());
      const userId = request.auth.userId; // Get from authenticated token

      const cart = await CartService.addToCart(env, userId, data.user_data, {
        product_id: data.product_id,
        sku: data.sku,
        name: data.name,
        brand: data.brand,
        image: data.image,
        quantity: parseInt(data.quantity),
        zipcode: data.zipcode,
      });

      return new Response(
        JSON.stringify(successResponse(cart, 'Product added to cart successfully')),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Add to cart error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to add to cart', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get cart by ID (with validation)
   * GET /cart/:cartId
   * REQUIRES AUTH - only cart owner can access
   */
  async getCart(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;

      const cart = await CartService.getCartWithValidation(env, cartId, userId);

      return new Response(JSON.stringify(successResponse(cart, 'Cart retrieved successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get cart error:', error);

      if (error.message === 'Cart not found') {
        return new Response(JSON.stringify(errorResponse(error.message, 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error.message === 'Unauthorized access to cart') {
        return new Response(JSON.stringify(errorResponse(error.message, 403)), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve cart', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Update product quantity
   * POST /cart/:cartId/update-quantity
   * REQUIRES AUTH - only cart owner can update
   */
  async updateQuantity(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const data = request.validatedData || (await request.json());

      const cart = await CartService.updateQuantity(
        env,
        cartId,
        userId,
        data.product_id,
        parseInt(data.quantity)
      );

      return new Response(JSON.stringify(successResponse(cart, 'Quantity updated successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update quantity error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to update quantity', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Remove product from cart
   * POST /cart/:cartId/remove-item
   * REQUIRES AUTH - only cart owner can remove items
   */
  async removeItem(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const data = request.validatedData || (await request.json());

      const cart = await CartService.removeProduct(env, cartId, userId, data.product_id);

      return new Response(JSON.stringify(successResponse(cart, 'Product removed from cart')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Remove product error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to remove product', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Add shipping address
   * POST /cart/:cartId/shipping-address
   * REQUIRES AUTH - only cart owner can add address
   */
  async addShippingAddress(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const address = request.validatedData || (await request.json());

      const result = await CartService.addShippingAddress(env, cartId, userId, address);

      return new Response(
        JSON.stringify(successResponse(result, 'Shipping address added successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Add shipping address error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to add shipping address', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Add billing address
   * POST /cart/:cartId/billing-address
   * REQUIRES AUTH - only cart owner can add address
   */
  async addBillingAddress(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const validatedData = request.validatedData;
      const sameAsShipping = validatedData.same_as_shipping || false;

      // Extract address fields, excluding same_as_shipping
      const { same_as_shipping, ...address } = validatedData;

      const cart = await CartService.addBillingAddress(
        env,
        cartId,
        userId,
        address,
        sameAsShipping
      );

      return new Response(
        JSON.stringify(successResponse(cart, 'Billing address added successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Add billing address error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to add billing address', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get order summary (final review before payment)
   * GET /cart/:cartId/summary
   * REQUIRES AUTH - only cart owner can view summary
   */
  async getOrderSummary(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;

      const summary = await CartService.getOrderSummary(env, cartId, userId);

      return new Response(
        JSON.stringify(successResponse(summary, 'Order summary retrieved successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Get order summary error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to get order summary', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Update cart status
   * POST /cart/:cartId/status
   * REQUIRES AUTH - only cart owner can update status
   */
  async updateStatus(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const data = request.validatedData || (await request.json());

      const cart = await CartService.updateStatus(env, cartId, userId, data.status);

      return new Response(
        JSON.stringify(successResponse(cart, 'Cart status updated successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Update status error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to update cart status', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Clear/delete cart
   * DELETE /cart/:cartId
   * REQUIRES AUTH - only cart owner can delete
   */
  async clearCart(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;

      await CartService.deleteCart(env, cartId, userId);

      return new Response(JSON.stringify(successResponse(null, 'Cart cleared successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to clear cart', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Place order from cart
   * POST /cart/:cartId/place-order
   * REQUIRES AUTH - only cart owner can place order
   */
  async placeOrder(request, env) {
    try {
      const cartId = request.params.cartId;
      const userId = request.auth.userId;
      const { delivery_mode } = request.validatedData || (await request.json());

      if (!delivery_mode) {
        return new Response(JSON.stringify(errorResponse('Delivery mode is required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await CartService.placeOrder(env, cartId, userId, delivery_mode);

      return new Response(
        JSON.stringify(
          successResponse(result, 'Order created successfully. Please complete payment.')
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Place order error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to place order', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Complete order after payment
   * POST /cart/complete-order
   * REQUIRES AUTH - only order owner can complete
   */
  async completeOrder(request, env) {
    try {
      const userId = request.auth.userId;
      const { order_id, paypal_order_id } = request.validatedData || (await request.json());

      if (!order_id || !paypal_order_id) {
        return new Response(
          JSON.stringify(errorResponse('Order ID and PayPal Order ID are required', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await CartService.completeOrder(env, order_id, paypal_order_id, userId);

      return new Response(JSON.stringify(successResponse(result, 'Order completed successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Complete order error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to complete order', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get user orders (proxy to order-worker)
   * GET /api/orders/my-orders
   * REQUIRES AUTH - fetches orders for authenticated user
   */
  async getUserOrders(request, env) {
    try {
      const userId = request.auth.userId;

      // Call order-worker via service binding
      const orderServiceRequest = new Request(`http://order-service/api/orders/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const orderResponse = await env.ORDER_SERVICE.fetch(orderServiceRequest);
      const data = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(data.error?.message || 'Failed to fetch orders');
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get user orders error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve orders', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Cancel an order (proxy to order-worker)
   * POST /api/orders/:orderId/cancel
   * REQUIRES AUTH - cancels order and releases reservations
   */
  async cancelOrder(request, env) {
    try {
      const userId = request.auth.userId;
      const orderId = request.params.orderId;

      if (!orderId) {
        return new Response(JSON.stringify(errorResponse('Order ID is required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Cart] Cancelling order ${orderId} for user ${userId}`);

      // Call order-worker via service binding
      const orderServiceRequest = new Request(`http://order-service/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const orderResponse = await env.ORDER_SERVICE.fetch(orderServiceRequest);
      const data = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(data.error?.message || 'Failed to cancel order');
      }

      console.log(`[Cart] Order ${orderId} cancelled successfully`);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[Cart] Cancel order error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to cancel order', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
