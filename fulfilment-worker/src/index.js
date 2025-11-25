import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { FulfilmentController } from './controllers/fulfilment.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import {
  initializeRequestTrace,
  recordResponse,
  recordError,
  extractTraceContext,
} from './utils/tracing.js';
import {
  checkStockSchema,
  batchStockSchema,
  deliveryOptionsSchema,
  reserveStockSchema,
} from './schemas/fulfilment.schemas.js';
import { InventoryReservationDO } from './durable-objects/inventory-reservation.do.js';

const router = Router();

/**
 * Fulfilment Worker API with itty-router
 */

// CORS preflight handler
router.options('*', request => handleCors(request));

// Root endpoint
router.get(
  '/',
  () =>
    new Response(
      JSON.stringify({
        service: 'Fulfilment Worker API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          stock: '/api/stock',
          delivery: '/api/delivery',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Stock endpoints (public - no auth required)
router.post('/api/stock/check-general', FulfilmentController.checkGeneralStock); // No zipcode needed
router.post('/api/stock/check', validateBody(checkStockSchema), FulfilmentController.checkStock);
router.post(
  '/api/stock/check-batch',
  validateBody(batchStockSchema),
  FulfilmentController.checkBatchStock
);

// Stock reservation endpoints (require authentication)
router.post(
  '/api/stock/reserve',
  requireAuth(),
  validateBody(reserveStockSchema),
  FulfilmentController.reserveStock
);
router.post('/api/stock/release', requireAuth(), FulfilmentController.releaseStock);

// Delivery endpoints (public - no auth required)
router.post(
  '/api/delivery/options',
  validateBody(deliveryOptionsSchema),
  FulfilmentController.getDeliveryOptions
);

// Internal endpoints (called by order-worker via service binding)
router.post('/api/fulfilment/reduce-stock', FulfilmentController.reduceStock);
router.post('/api/fulfilment/restore-stock', FulfilmentController.restoreStock);
router.post('/api/stock/reserve-for-order', FulfilmentController.reserveStockForOrder);
router.post('/api/stock/release-for-order', FulfilmentController.releaseStockForOrder);

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
      // Extract incoming trace context from headers
      extractTraceContext(request);

      // Initialize comprehensive request tracing
      const { traceId, spanId, cfRay } = initializeRequestTrace(request, env);

      // Wrap router with logging and CORS
      const response = await withLogging('fulfilment-worker', async (req, environment, context) => {
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

      return addCorsHeaders(response, request);
    } catch (error) {
      // Catch-all error handler
      recordError(error, {
        stage: 'handler',
        critical: true,
      });

      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: error.message,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        request
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

// Export Durable Object class
export { InventoryReservationDO };
