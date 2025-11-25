// src/index.js
import { AutoRouter } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import {
  initializeRequestTrace,
  recordResponse,
  recordError,
  extractTraceContext,
} from './utils/tracing.js';

const router = AutoRouter();

// CORS preflight handler
router.options('*', request => handleCors(request));

// Mount route modules
router.all('/health*', healthRouter.fetch);
router.all('/auth/*', authRouter.fetch);
router.all('/user/*', userRouter.fetch);

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'NotFound' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Handler without instrumentation
const handler = {
  async fetch(request, env, ctx) {
    try {
      // Extract incoming trace context from headers
      extractTraceContext(request);

      // Initialize comprehensive request tracing
      const { traceId, spanId, cfRay } = initializeRequestTrace(request, env);

      // Wrap router with logging and CORS
      const response = await withLogging('auth-worker', async (req, environment, context) => {
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
    // Sample 100% of requests (adjust for production if needed)
    // Uncomment and adjust for production sampling:
    // sampling: {
    //   headSampler: {
    //     ratio: 0.1
    //   }
    // },
  };
};

// Export instrumented handler
export default instrument(handler, config);
