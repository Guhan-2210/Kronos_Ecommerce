import { Router, json, error } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { ProductController } from './controllers/product.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import { createProductSchema, updateProductSchema } from './schemas/product.schemas.js';

const router = Router();

/**
 * Catalog Worker API with itty-router
 */

// CORS preflight handler
router.options('*', request => handleCors(request));

// Root endpoint
router.get('/', () =>
  json({
    service: 'Catalog Worker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      products: '/api/products',
      docs: 'See README for full API documentation',
    },
  })
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Product endpoints
router.get('/api/products', ProductController.getAll);
router.get('/api/products/:id', ProductController.getById);
router.post('/api/products', validateBody(createProductSchema), ProductController.create);
router.put('/api/products/:id', validateBody(updateProductSchema), ProductController.update);
router.delete('/api/products/:id', ProductController.delete);
router.post('/api/products/:id/image', ProductController.uploadImage);

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
      span.setAttribute('worker.name', 'catalog-worker');
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
    return withLogging('catalog-worker', async (req, environment, context) => {
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
