import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { OrderController } from './controllers/order.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';

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
    // Get active span for custom attributes and events
    const span = trace.getActiveSpan();
    const cfRay = request.headers.get('cf-ray') || 'No cf-ray header';

    if (span) {
      // Add custom attributes
      span.setAttribute('cfray', cfRay);
      span.setAttribute('worker.name', 'order-worker');
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

    // Wrap router with logging (for service bindings and direct calls)
    return withLogging('order-worker', async (req, environment, context) => {
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

      return response;
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
