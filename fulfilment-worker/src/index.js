import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { FulfilmentController } from './controllers/fulfilment.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
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
    // Get active span for custom attributes and events
    const span = trace.getActiveSpan();
    const cfRay = request.headers.get('cf-ray') || 'No cf-ray header';

    if (span) {
      // Add custom attributes
      span.setAttribute('cfray', cfRay);
      span.setAttribute('worker.name', 'fulfilment-worker');
      span.setAttribute('http.method', request.method);
      span.setAttribute('http.url', request.url);

      // Add event with request details
      span.addEvent('request_received', {
        message: JSON.stringify({
          request: request.url,
          method: request.method,
          traceId: span.spanContext().traceId,
          cfRay,
        }),
      });
    }

    // Wrap router with logging and CORS
    return withLogging('fulfilment-worker', async (req, environment, context) => {
      const response = await router.fetch(req, environment, context);

      // Add span event for response
      if (span) {
        span.addEvent('response_sent', {
          message: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
          }),
        });
      }

      return addCorsHeaders(response, req);
    })(request, env, ctx);
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
