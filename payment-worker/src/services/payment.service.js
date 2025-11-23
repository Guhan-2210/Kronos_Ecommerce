import { PaymentModel } from '../models/payment.model.js';
import { encryptData, decryptData, hashData } from '../utils/crypto.js';
import { generateId } from '../utils/helpers.js';

/**
 * Payment Service - Handles PayPal payment processing
 */

export const PaymentService = {
  /**
   * Get PayPal access token
   */
  async getPayPalAccessToken(env) {
    const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);

    const response = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  },

  /**
   * Create PayPal order
   */
  async createPayPalOrder(env, orderId, amount, currency, description = 'Order Payment') {
    console.log('[PayPal Create Order] Starting order creation:', {
      orderId,
      amount,
      currency,
      paypalApiBase: env.PAYPAL_API_BASE,
      paypalMode: env.PAYPAL_MODE,
    });

    const accessToken = await this.getPayPalAccessToken(env);
    console.log(`[PayPal Create Order] Access token obtained: ${accessToken.substring(0, 20)}...`);

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          description,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Nike Ecommerce',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
        cancel_url: `${env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
      },
    };

    console.log('[PayPal Create Order] Order data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${env.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    console.log(`[PayPal Create Order] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('[PayPal Create Order] Error response:', JSON.stringify(error, null, 2));
      throw new Error(`PayPal order creation failed: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log(
      `[PayPal Create Order] Success! PayPal Order ID: ${result.id}, Status: ${result.status}`
    );
    return result;
  },

  /**
   * Capture PayPal payment
   */
  async capturePayPalPayment(env, paypalOrderId) {
    console.log(`[PayPal Capture] Starting capture for PayPal Order: ${paypalOrderId}`);
    console.log(`[PayPal Capture] API Base: ${env.PAYPAL_API_BASE}`);

    const accessToken = await this.getPayPalAccessToken(env);
    console.log('[PayPal Capture] Access token obtained');

    const captureUrl = `${env.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`;
    console.log(`[PayPal Capture] Capture URL: ${captureUrl}`);

    const response = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[PayPal Capture] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('[PayPal Capture Error] Full error:', JSON.stringify(error, null, 2));

      // Log detailed error information
      if (error.details) {
        error.details.forEach((detail, index) => {
          console.error(`[PayPal Capture Error] Detail ${index}:`, {
            issue: detail.issue,
            description: detail.description,
            field: detail.field,
            value: detail.value,
          });
        });
      }

      // Extract more detailed error message
      const errorMessage = error.details?.[0]?.description || error.message || 'Unknown error';
      const errorName = error.name || 'CAPTURE_ERROR';
      const errorIssue = error.details?.[0]?.issue || 'UNKNOWN_ISSUE';

      throw new Error(`PayPal capture failed: ${errorMessage} (${errorName} - ${errorIssue})`);
    }

    const result = await response.json();
    console.log(
      `[PayPal Capture] Success! Capture ID: ${result.purchase_units[0].payments.captures[0].id}`
    );
    console.log(`[PayPal Capture] Capture status: ${result.status}`);
    return result;
  },

  /**
   * Get PayPal order details
   */
  async getPayPalOrderDetails(env, paypalOrderId) {
    const accessToken = await this.getPayPalAccessToken(env);

    const response = await fetch(`${env.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get PayPal order: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result;
  },

  /**
   * Initiate payment - Create payment record and PayPal order
   */
  async initiatePayment(env, orderId, userId, amount, currency) {
    try {
      console.log('[Payment Initiate] Starting payment initiation:', {
        orderId,
        userId,
        amount,
        currency,
        amountType: typeof amount,
        currencyType: typeof currency,
      });

      // Create payment record in database
      const paymentId = `pay-${generateId()}`;
      await PaymentModel.create(env.DB, paymentId, orderId, userId, amount, currency);
      console.log(`[Payment Initiate] Payment record created: ${paymentId}`);

      // Create PayPal order
      const paypalOrder = await this.createPayPalOrder(env, orderId, amount, currency);

      // Update payment record with PayPal order ID
      await PaymentModel.updatePayPalOrderId(env.DB, paymentId, paypalOrder.id);
      await PaymentModel.updateStatus(env.DB, paymentId, 'initiated');

      // Get approval URL for frontend redirect
      const approvalUrl = paypalOrder.links.find(link => link.rel === 'approve')?.href;

      return {
        payment_id: paymentId,
        paypal_order_id: paypalOrder.id,
        approval_url: approvalUrl,
        status: 'initiated',
      };
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  },

  /**
   * Complete payment - Capture PayPal payment and store encrypted response
   */
  async completePayment(env, paypalOrderId) {
    try {
      console.log(`[Payment] Completing payment for PayPal Order: ${paypalOrderId}`);

      // Get payment record
      const payment = await PaymentModel.getByPayPalOrderId(env.DB, paypalOrderId);
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Check if payment is already captured
      if (payment.status === 'captured') {
        console.log(`[Payment] Payment ${payment.id} already captured, returning existing record`);
        return {
          payment_id: payment.id,
          order_id: payment.order_id,
          status: 'captured',
          amount: payment.amount,
          currency: payment.currency,
        };
      }

      // Check PayPal order status first before attempting capture
      console.log('[Payment] Checking PayPal order status...');
      const orderDetails = await this.getPayPalOrderDetails(env, paypalOrderId);
      console.log(`[Payment] PayPal order status: ${orderDetails.status}`);
      console.log('[Payment] PayPal order details:', {
        id: orderDetails.id,
        status: orderDetails.status,
        amount: orderDetails.purchase_units[0].amount,
        payer: orderDetails.payer
          ? {
              email: orderDetails.payer.email_address,
              id: orderDetails.payer.payer_id,
            }
          : 'no payer info',
        payment_source: orderDetails.payment_source || 'no payment source',
      });

      if (orderDetails.status === 'COMPLETED') {
        console.log('[Payment] PayPal order already completed, extracting details');
        const capture = orderDetails.purchase_units[0].payments.captures[0];

        // Store the capture details
        const payer = orderDetails.payer;
        const payerEmailHash = await hashData(payer.email_address);
        const payerIdHash = await hashData(payer.payer_id);
        const encryptedResponse = await encryptData(orderDetails, env.ENCRYPTION_KEY_B64);

        const metadata = {
          capture_id: capture.id,
          status: orderDetails.status,
          amount: capture.amount.value,
          currency: capture.amount.currency_code,
          create_time: capture.create_time,
          update_time: capture.update_time,
        };

        await PaymentModel.storeCaptureDetails(
          env.DB,
          payment.id,
          capture.id,
          encryptedResponse,
          payerEmailHash,
          payerIdHash,
          metadata
        );

        return {
          payment_id: payment.id,
          order_id: payment.order_id,
          status: 'captured',
          amount: capture.amount.value,
          currency: capture.amount.currency_code,
        };
      }

      if (orderDetails.status !== 'APPROVED') {
        throw new Error(`PayPal order is not approved. Current status: ${orderDetails.status}`);
      }

      // Capture payment on PayPal
      console.log('[Payment] Capturing PayPal payment...');
      const captureResult = await this.capturePayPalPayment(env, paypalOrderId);

      // Check if capture was successful
      if (captureResult.status !== 'COMPLETED') {
        throw new Error(`Payment capture failed with status: ${captureResult.status}`);
      }

      // Extract capture details
      const capture = captureResult.purchase_units[0].payments.captures[0];
      const payer = captureResult.payer;

      // Hash sensitive payer information
      const payerEmailHash = await hashData(payer.email_address);
      const payerIdHash = await hashData(payer.payer_id);

      // Encrypt the full PayPal response for audit purposes
      const encryptedResponse = await encryptData(captureResult, env.ENCRYPTION_KEY_B64);

      // Prepare transaction metadata (non-sensitive)
      const metadata = {
        capture_id: capture.id,
        status: captureResult.status,
        amount: capture.amount.value,
        currency: capture.amount.currency_code,
        create_time: capture.create_time,
        update_time: capture.update_time,
      };

      // Store capture details in database
      await PaymentModel.storeCaptureDetails(
        env.DB,
        payment.id,
        capture.id,
        encryptedResponse,
        payerEmailHash,
        payerIdHash,
        metadata
      );

      return {
        payment_id: payment.id,
        order_id: payment.order_id,
        status: 'captured',
        amount: capture.amount.value,
        currency: capture.amount.currency_code,
      };
    } catch (error) {
      console.error('Payment completion error:', error);

      // Try to update payment record with failure details
      try {
        const payment = await PaymentModel.getByPayPalOrderId(env.DB, paypalOrderId);
        if (payment) {
          await PaymentModel.storeFailureDetails(
            env.DB,
            payment.id,
            'CAPTURE_FAILED',
            error.message
          );
        }
      } catch (dbError) {
        console.error('Failed to store error details:', dbError);
      }

      throw error;
    }
  },

  /**
   * Verify payment status
   */
  async verifyPayment(env, paymentId) {
    const payment = await PaymentModel.getById(env.DB, paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    // If payment is already captured, return success
    if (payment.status === 'captured') {
      return {
        verified: true,
        status: 'captured',
        payment,
      };
    }

    // If we have a PayPal order ID, check status with PayPal
    if (payment.paypal_order_id) {
      try {
        const paypalOrder = await this.getPayPalOrderDetails(env, payment.paypal_order_id);

        return {
          verified: paypalOrder.status === 'COMPLETED',
          status: paypalOrder.status.toLowerCase(),
          payment,
        };
      } catch (error) {
        console.error('PayPal verification error:', error);
        return {
          verified: false,
          status: payment.status,
          error: error.message,
        };
      }
    }

    return {
      verified: false,
      status: payment.status,
      payment,
    };
  },

  /**
   * Get payment details (for internal use)
   */
  async getPaymentDetails(env, paymentId) {
    const payment = await PaymentModel.getById(env.DB, paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Don't expose encrypted response, only metadata
    return {
      id: payment.id,
      order_id: payment.order_id,
      user_id: payment.user_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transaction_metadata: payment.transaction_metadata,
      created_at: payment.created_at,
      completed_at: payment.completed_at,
    };
  },
};
