import { PaymentService } from '../services/payment.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Payment Controller - Handles HTTP requests for payments
 */

export const PaymentController = {
  /**
   * Initiate payment (called by order-worker)
   * POST /api/payments/initiate
   */
  async initiatePayment(request, env) {
    try {
      const body = await request.json();
      const { order_id, user_id, amount, currency } = body;

      if (!order_id || !user_id || !amount) {
        return new Response(JSON.stringify(errorResponse('Missing required fields', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await PaymentService.initiatePayment(
        env,
        order_id,
        user_id,
        amount,
        currency || 'USD'
      );

      return new Response(
        JSON.stringify(successResponse(result, 'Payment initiated successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[PaymentController] Initiate error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Complete payment after PayPal approval (called by order-worker)
   * POST /api/payments/complete
   */
  async completePayment(request, env) {
    try {
      const body = await request.json();
      const { paypal_order_id } = body;

      if (!paypal_order_id) {
        return new Response(JSON.stringify(errorResponse('PayPal order ID required', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await PaymentService.completePayment(env, paypal_order_id);

      return new Response(
        JSON.stringify(successResponse(result, 'Payment completed successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[PaymentController] Complete error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Verify payment status (called by order-worker)
   * GET /api/payments/:paymentId/verify
   */
  async verifyPayment(request, env) {
    try {
      const { paymentId } = request.params;

      const result = await PaymentService.verifyPayment(env, paymentId);

      return new Response(JSON.stringify(successResponse(result)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[PaymentController] Verify error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 500)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Get payment details (called by order-worker)
   * GET /api/payments/:paymentId
   */
  async getPayment(request, env) {
    try {
      const { paymentId } = request.params;

      const payment = await PaymentService.getPaymentDetails(env, paymentId);

      return new Response(JSON.stringify(successResponse(payment)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[PaymentController] Get payment error:', error);
      return new Response(JSON.stringify(errorResponse(error.message, 404)), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
