import { OrderModel } from '../models/order.model.js';
import { generateId, calculateOrderTotals, validateOrderData } from '../utils/helpers.js';

/**
 * Order Service - Handles order creation and management
 */

export const OrderService = {
  /**
   * Create order from cart data
   * This is called by cart-worker after validation
   * Now includes DO-based stock reservation with TTL
   */
  async createOrder(env, userId, cartId, cartData, userData) {
    const orderId = `order-${generateId()}`;

    try {
      // Debug: Log what we received from cart-worker
      console.log(
        '[Order] Received cartData.products:',
        JSON.stringify(
          cartData.products.map(p => ({
            product_id: p.product_id,
            id: p.id,
            warehouse_id: p.warehouse_id,
            quantity: p.quantity,
          }))
        )
      );

      // Prepare order data
      const orderData = {
        products: cartData.products.map(p => ({
          product_id: p.product_id || p.id, // Handle both field name formats
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          image: p.image,
          quantity: p.quantity,
          price: p.price,
          currency: p.currency,
          warehouse_id: p.warehouse_id,
        })),
        shipping_address: cartData.shipping_address,
        billing_address: cartData.billing_address,
        delivery_mode: cartData.delivery_mode,
        costs: cartData.costs,
      };

      // Validate order data structure
      validateOrderData(orderData);

      const totalAmount = orderData.costs.total;
      const currency = orderData.costs.currency || 'USD';

      // Debug logging
      console.log(`[Order Debug] orderId: ${orderId}, userId: ${userId}, cartId: ${cartId}`);
      console.log(`[Order Debug] totalAmount: ${totalAmount}, currency: ${currency}`);
      console.log('[Order Debug] userData:', JSON.stringify(userData));
      console.log('[Order Debug] orderData.costs:', JSON.stringify(orderData.costs));

      if (!totalAmount || !userId || !cartId || !userData) {
        throw new Error(
          `Missing required data: totalAmount=${totalAmount}, userId=${userId}, cartId=${cartId}, userData=${!!userData}`
        );
      }

      // Reserve stock via DO before creating order
      console.log(`[Order] Reserving stock for order ${orderId}`);

      const reserveItems = orderData.products.map(p => ({
        product_id: p.product_id,
        warehouse_id: p.warehouse_id,
        quantity: p.quantity,
      }));

      // Debug: Log what we're sending to fulfilment-worker
      console.log(
        '[Order] Sending to fulfilment-worker for reservation:',
        JSON.stringify(reserveItems)
      );

      const reserveRequest = new Request('http://internal/api/stock/reserve-for-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Auth': 'order-service',
        },
        body: JSON.stringify({
          order_id: orderId,
          user_id: userId,
          items: reserveItems,
        }),
      });

      const reserveResponse = await env.FULFILMENT_SERVICE.fetch(reserveRequest);
      const reserveResult = await reserveResponse.json();

      if (!reserveResult.success) {
        console.error(
          `[Order] Stock reservation failed for ${orderId}:`,
          JSON.stringify(reserveResult)
        );
        const errorMsg =
          reserveResult.error?.message ||
          reserveResult.error ||
          reserveResult.message ||
          'Stock reservation failed - items may be out of stock';
        throw new Error(errorMsg);
      }

      // Service binding returns wrapped response with .data, direct service call doesn't
      const reserveData = reserveResult.data || reserveResult;
      console.log(
        `[Order] Stock reserved for order ${orderId}, expires at ${new Date(reserveData.expires_at).toISOString()}`
      );

      // Create order in database
      const order = await OrderModel.create(
        env.DB,
        orderId,
        userId,
        cartId,
        orderData,
        userData,
        totalAmount,
        currency
      );

      console.log(`[Order] Created order ${orderId} for user ${userId} with reserved stock`);

      return order;
    } catch (error) {
      console.error('[Order] Creation error:', error);

      // Try to release any reservations that may have been made
      try {
        const releaseRequest = new Request('http://internal/api/stock/release-for-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Auth': 'order-service',
          },
          body: JSON.stringify({
            order_id: orderId,
          }),
        });
        await env.FULFILMENT_SERVICE.fetch(releaseRequest);
      } catch (releaseError) {
        console.error('[Order] Failed to release reservations during rollback:', releaseError);
      }

      throw error;
    }
  },

  /**
   * Initiate payment for order
   * Calls payment-worker to create PayPal order
   */
  async initiatePayment(env, orderId) {
    try {
      const order = await OrderModel.getById(env.DB, orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Cannot initiate payment for order with status: ${order.status}`);
      }

      // Call payment service to initiate payment
      const paymentRequest = new Request('http://internal/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          user_id: order.user_id,
          amount: order.total_amount,
          currency: order.currency,
        }),
      });

      const paymentResponse = await env.PAYMENT_SERVICE.fetch(paymentRequest);
      const paymentResult = await paymentResponse.json();

      if (!paymentResult.success) {
        throw new Error(`Payment initiation failed: ${paymentResult.error}`);
      }

      // Update order with payment ID and status
      await OrderModel.updatePaymentId(env.DB, orderId, paymentResult.data.payment_id);
      await OrderModel.updateStatus(env.DB, orderId, 'payment_initiated');

      console.log(`[Order] Payment initiated for order ${orderId}`);

      return {
        order_id: orderId,
        payment_id: paymentResult.data.payment_id,
        approval_url: paymentResult.data.approval_url,
        paypal_order_id: paymentResult.data.paypal_order_id,
      };
    } catch (error) {
      console.error('[Order] Payment initiation error:', error);
      throw error;
    }
  },

  /**
   * Confirm order after successful payment
   * This confirms DO reservations and commits stock reduction
   * Handles TTL expiry gracefully
   */
  async confirmOrder(env, orderId, paypalOrderId) {
    try {
      const order = await OrderModel.getById(env.DB, orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Step 1: Complete payment capture on PayPal
      const capturePaymentRequest = new Request('http://internal/api/payments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypal_order_id: paypalOrderId,
        }),
      });

      const capturePaymentResponse = await env.PAYMENT_SERVICE.fetch(capturePaymentRequest);
      const capturePaymentResult = await capturePaymentResponse.json();

      if (!capturePaymentResult.success) {
        throw new Error(`Payment capture failed: ${capturePaymentResult.error}`);
      }

      // Update order with payment information
      await OrderModel.updatePaymentId(env.DB, orderId, capturePaymentResult.data.payment_id);

      // Step 2: Confirm reservations and reduce stock for each product
      const stockReductionResults = [];
      const expiredProducts = [];

      for (const product of order.order_data.products) {
        try {
          const reduceRequest = new Request('http://internal/api/fulfilment/reduce-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: product.product_id,
              warehouse_id: product.warehouse_id,
              quantity: product.quantity,
              order_id: orderId,
            }),
          });

          const reduceResponse = await env.FULFILMENT_SERVICE.fetch(reduceRequest);
          const reduceResult = await reduceResponse.json();

          if (!reduceResult.success) {
            // Get error message (could be string or object with message property)
            const errorMsg =
              typeof reduceResult.error === 'string'
                ? reduceResult.error
                : reduceResult.error?.message || JSON.stringify(reduceResult.error);

            // Check if this is a reservation expiry issue
            if (errorMsg.includes('expired') || errorMsg.includes('not found')) {
              console.warn(
                `[Order] Reservation expired for ${product.product_id} in order ${orderId}`
              );
              expiredProducts.push(product.product_id);
            }
            throw new Error(
              `Failed to reduce stock for product ${product.product_id}: ${errorMsg}`
            );
          }

          stockReductionResults.push({
            product_id: product.product_id,
            success: true,
            warehouse_id: product.warehouse_id,
            quantity: product.quantity,
          });
        } catch (error) {
          console.error(`[Order] Stock reduction failed for ${product.product_id}:`, error);

          // If reservation expired, this is a critical error
          if (expiredProducts.length > 0) {
            // Rollback successful reductions
            await this.rollbackStockReduction(env, orderId, stockReductionResults);

            // Update order status to expired
            await OrderModel.updateStatus(env.DB, orderId, 'expired');

            throw new Error(
              `Order reservation expired for: ${expiredProducts.join(', ')}. ` +
                'The payment was successful but inventory was not available. ' +
                `Please contact support for a refund. Order ID: ${orderId}`
            );
          }

          // Rollback: restore previously reduced stock
          await this.rollbackStockReduction(env, orderId, stockReductionResults);

          throw new Error(`Stock reduction failed: ${error.message}`);
        }
      }

      // Update order status to confirmed
      await OrderModel.updateStatus(env.DB, orderId, 'confirmed');

      console.log(`[Order] Order ${orderId} confirmed, stock reduced`);

      return {
        order_id: orderId,
        status: 'confirmed',
        stock_reductions: stockReductionResults,
      };
    } catch (error) {
      console.error('[Order] Confirmation error:', error);

      // Update order status to failed (unless already marked as expired)
      try {
        const order = await OrderModel.getById(env.DB, orderId);
        if (order && order.status !== 'expired') {
          await OrderModel.updateStatus(env.DB, orderId, 'failed');
        }
      } catch (updateError) {
        console.error('[Order] Failed to update order status:', updateError);
      }

      throw error;
    }
  },

  /**
   * Rollback stock reduction (called if order confirmation fails)
   */
  async rollbackStockReduction(env, orderId, successfulReductions) {
    console.log(`[Order] Rolling back stock reductions for order ${orderId}`);

    for (const reduction of successfulReductions.filter(r => r.success)) {
      try {
        const restoreRequest = new Request('http://internal/api/fulfilment/restore-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: reduction.product_id,
            warehouse_id: reduction.warehouse_id,
            quantity: reduction.quantity,
            order_id: orderId,
          }),
        });

        await env.FULFILMENT_SERVICE.fetch(restoreRequest);
        console.log(`[Order] Restored stock for ${reduction.product_id}`);
      } catch (error) {
        console.error(`[Order] Failed to restore stock for ${reduction.product_id}:`, error);
      }
    }
  },

  /**
   * Cancel order (before payment is completed)
   * This will also release reservations in the Durable Object
   */
  async cancelOrder(env, orderId, userId) {
    const order = await OrderModel.getById(env.DB, orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      throw new Error('Cannot cancel order in current status');
    }

    // Release reservations for all products in the order
    console.log(`[Order] Releasing reservations for cancelled order ${orderId}`);
    try {
      const orderData =
        typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;

      const products = orderData.products || [];

      // Call fulfilment-worker to release reservations
      const releaseResponse = await env.FULFILMENT_SERVICE.fetch(
        'http://fulfilment/api/stock/release-for-order',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            items: products.map(p => ({
              product_id: p.product_id || p.id,
              warehouse_id: p.warehouse_id,
              quantity: p.quantity,
            })),
          }),
        }
      );

      const releaseResult = await releaseResponse.json();

      if (!releaseResult.success) {
        console.error(
          `[Order] Failed to release reservations for order ${orderId}:`,
          releaseResult.message
        );
        // Continue with cancellation even if release fails (reservations will expire via TTL)
      } else {
        console.log(`[Order] Successfully released reservations for order ${orderId}`);
      }
    } catch (error) {
      console.error(`[Order] Error releasing reservations for order ${orderId}:`, error);
      // Continue with cancellation even if release fails (reservations will expire via TTL)
    }

    // Update order status to cancelled
    await OrderModel.updateStatus(env.DB, orderId, 'cancelled');

    console.log(`[Order] Order ${orderId} cancelled by user ${userId}`);

    return {
      order_id: orderId,
      status: 'cancelled',
    };
  },

  /**
   * Get order by ID (with authorization check)
   */
  async getOrder(env, orderId, userId) {
    const order = await OrderModel.getById(env.DB, orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    return order;
  },

  /**
   * Get user's orders
   */
  async getUserOrders(env, userId, limit = 50, offset = 0) {
    return await OrderModel.getByUserId(env.DB, userId, limit, offset);
  },

  /**
   * Update order status (internal use)
   */
  async updateOrderStatus(env, orderId, status) {
    return await OrderModel.updateStatus(env.DB, orderId, status);
  },
};
