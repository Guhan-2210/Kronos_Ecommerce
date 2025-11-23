import { Router } from 'itty-router';
import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { CartController } from './controllers/cart.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { errorResponse } from './utils/helpers.js';
import { validateBody } from './middleware/validate.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { handleCors, addCorsHeaders } from './middleware/cors.middleware.js';
import { withLogging } from './middleware/logging.middleware.js';
import {
  addToCartSchema,
  updateQuantitySchema,
  removeItemSchema,
  shippingAddressSchema,
  billingAddressSchema,
  updateStatusSchema,
} from './schemas/cart.schemas.js';

const router = Router();

// CORS preflight handler
router.options('*', request => handleCors(request));

/**
 * Cart Worker API with itty-router
 */

// Root endpoint
router.get(
  '/',
  () =>
    new Response(
      JSON.stringify({
        service: 'Cart Worker API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          cart: '/api/cart',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
);

// Health endpoints
router.get('/health', HealthController.check);
router.get('/health/detailed', HealthController.detailed);

// Cart endpoints - all require authentication
router.post(
  '/api/cart/add',
  requireAuth(),
  validateBody(addToCartSchema),
  CartController.addToCart
);
router.get('/api/cart/:cartId', requireAuth(), CartController.getCart);
router.post(
  '/api/cart/:cartId/update-quantity',
  requireAuth(),
  validateBody(updateQuantitySchema),
  CartController.updateQuantity
);
router.post(
  '/api/cart/:cartId/remove-item',
  requireAuth(),
  validateBody(removeItemSchema),
  CartController.removeItem
);
router.post(
  '/api/cart/:cartId/shipping-address',
  requireAuth(),
  validateBody(shippingAddressSchema),
  CartController.addShippingAddress
);
router.post(
  '/api/cart/:cartId/billing-address',
  requireAuth(),
  validateBody(billingAddressSchema),
  CartController.addBillingAddress
);
router.get('/api/cart/:cartId/summary', requireAuth(), CartController.getOrderSummary);
router.post(
  '/api/cart/:cartId/status',
  requireAuth(),
  validateBody(updateStatusSchema),
  CartController.updateStatus
);
router.delete('/api/cart/:cartId', requireAuth(), CartController.clearCart);

// Order placement endpoints
router.post('/api/cart/:cartId/place-order', requireAuth(), CartController.placeOrder);
router.post('/api/cart/complete-order', requireAuth(), CartController.completeOrder);

// Order history endpoint (proxy to order-worker)
router.get('/api/orders/my-orders', requireAuth(), CartController.getUserOrders);

// Order cancellation endpoint (proxy to order-worker)
router.post('/api/orders/:orderId/cancel', requireAuth(), CartController.cancelOrder);

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
      span.setAttribute('worker.name', 'cart-worker');
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
    return withLogging('cart-worker', async (req, environment, context) => {
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
