import { Router, json, error } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { ProductController } from './controllers/product.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import {
  initializeRequestTrace,
  recordResponse,
  recordError,
  extractTraceContext,
} from './utils/tracing.js';
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
    try {
      // Extract incoming trace context from headers
      extractTraceContext(request);

      // Initialize comprehensive request tracing
      const { traceId, spanId, cfRay } = initializeRequestTrace(request, env);

      // Wrap router with logging and CORS
      const response = await withLogging('catalog-worker', async (req, environment, context) => {
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
