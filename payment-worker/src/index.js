import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { PaymentController } from './controllers/payment.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import {
  initializeRequestTrace,
  recordResponse,
  recordError,
  extractTraceContext,
} from './utils/tracing.js';

const router = Router();

router.options('*', request => handleCors(request));

/**
 * Payment Worker API with PayPal integration
 * PRIVATE - Should only be accessed via service bindings from order-worker
 */

// Root endpoint
router.get(
  '/',
  () =>
    new Response(
      JSON.stringify({
        service: 'Payment Worker API',
        version: '1.0.0',
        status: 'private',
        provider: 'PayPal Sandbox',
        note: 'This service should only be accessed via order-worker',
        endpoints: {
          health: '/health',
          payments: '/api/payments',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Payment endpoints (PRIVATE - no auth middleware because only accessed internally)
router.post('/api/payments/initiate', PaymentController.initiatePayment);
router.post('/api/payments/complete', PaymentController.completePayment);
router.get('/api/payments/:paymentId/verify', PaymentController.verifyPayment);
router.get('/api/payments/:paymentId', PaymentController.getPayment);

// 404 handler
router.all(
  '*',
  () =>
    new Response(JSON.stringify(errorResponse('Route not found', 404)), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
);

// Handler without instrumentation
const handler = {
  async fetch(request, env, ctx) {
    try {
      // Extract incoming trace context from headers (important for service bindings)
      extractTraceContext(request);

      // Initialize comprehensive request tracing
      const { traceId, spanId, cfRay } = initializeRequestTrace(request, env);

      // Wrap router with logging (for service bindings and direct calls)
      const response = await withLogging('payment-worker', async (req, environment, context) => {
        try {
          const res = await router.fetch(req, environment, context);

          // Record successful response with details
          recordResponse(res, {
            traceId,
            spanId,
            cfRay,
            paymentProvider: 'PayPal',
          });

          return res;
        } catch (error) {
          // Record any errors that occur during routing
          recordError(error, {
            stage: 'routing',
            path: new URL(req.url).pathname,
          });
          throw error;
        }
      })(request, env, ctx);

      return response;
    } catch (error) {
      // Catch-all error handler
      recordError(error, {
        stage: 'handler',
        critical: true,
      });

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

// OpenTelemetry configuration for Honeycomb
const config = env => {
  return {
    exporter: {
      url: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': env.HONEYCOMB_API_KEY,
      },
    },
    service: {
      name: 'ecommerce-worker',
    },
    // Enable trace context propagation for distributed tracing
    includeTraceContext: true,
  };
};

// Export instrumented handler
export default instrument(handler, config);
