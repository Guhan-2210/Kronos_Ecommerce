import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { OrderController } from './controllers/order.controller.js';
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

// CORS preflight handler
router.options('*', request => handleCors(request));

/**
 * Order Worker API
 * PRIVATE - Should only be accessed via service bindings from cart-worker
 */

// Root endpoint
router.get(
  '/',
  () =>
    new Response(
      JSON.stringify({
        service: 'Order Worker API',
        version: '1.0.0',
        status: 'private',
        note: 'This service should only be accessed via cart-worker',
        endpoints: {
          health: '/health',
          orders: '/api/orders',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Order endpoints (PRIVATE - no auth middleware because only accessed internally)
router.post('/api/orders/create', OrderController.createOrder);
router.post('/api/orders/:orderId/initiate-payment', OrderController.initiatePayment);
router.post('/api/orders/:orderId/confirm', OrderController.confirmOrder);
router.post('/api/orders/:orderId/cancel', OrderController.cancelOrder);
router.get('/api/orders/:orderId', OrderController.getOrder);
router.get('/api/orders/user/:userId', OrderController.getUserOrders);

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
      const response = await withLogging('order-worker', async (req, environment, context) => {
        try {
          const res = await router.fetch(req, environment, context);

          // Record successful response with details
          recordResponse(res, {
            traceId,
            spanId,
            cfRay,
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
