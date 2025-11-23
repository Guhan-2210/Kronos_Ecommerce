import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { PriceController } from './controllers/price.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import { setPriceSchema, batchPricesSchema } from './schemas/price.schemas.js';

const router = Router();

/**
 * Price Worker API with itty-router
 */

// CORS preflight handler
router.options('*', request => handleCors(request));

// Root endpoint
router.get(
  '/',
  () =>
    new Response(
      JSON.stringify({
        service: 'Price Worker API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          prices: '/api/prices',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Price endpoints
router.get('/api/prices/product/:productId', PriceController.getByProductId);
router.post('/api/prices/batch', validateBody(batchPricesSchema), PriceController.getBatch);
router.post('/api/prices/set', validateBody(setPriceSchema), PriceController.setPrice);

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
      span.setAttribute('worker.name', 'price-worker');
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
    return withLogging('price-worker', async (req, environment, context) => {
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
