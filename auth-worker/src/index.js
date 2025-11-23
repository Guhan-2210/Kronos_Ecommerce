// src/index.js
import { AutoRouter } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';

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
    // Get active span for custom attributes and events
    const span = trace.getActiveSpan();
    const cfRay = request.headers.get('cf-ray') || 'No cf-ray header';

    if (span) {
      // Add custom attributes
      span.setAttribute('cfray', cfRay);
      span.setAttribute('service.name', 'auth-worker');
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
    return withLogging('auth-worker', async (req, environment, context) => {
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
