import { successResponse } from '../utils/helpers.js';

/**
 * Health check controller for itty-router
 */

export const HealthController = {
  /**
   * Basic health check
   * GET /health
   */
  async check(request, env) {
    return new Response(
      JSON.stringify(
        successResponse(
          {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'cart-worker',
            version: '1.0.0',
          },
          'Cart service is healthy'
        )
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Detailed health check with dependencies
   * GET /health/detailed
   * Works in both local development (HTTP) and production (Service Bindings)
   */
  async detailed(request, env) {
    const checks = {
      database: false,
      priceService: false,
      fulfilmentService: false,
    };

    try {
      // Check database
      const dbResult = await env.DB.prepare('SELECT 1').first();
      checks.database = dbResult !== null;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Check Price Service
      // Use service binding in production, HTTP in local dev
      if (env.PRICE_SERVICE) {
        // Production: Use service binding
        const priceResponse = await env.PRICE_SERVICE.fetch('http://internal/health');
        checks.priceService = priceResponse.ok;
      } else {
        // Local dev: Use HTTP
        const priceResponse = await fetch('http://localhost:8790/health');
        checks.priceService = priceResponse.ok;
      }
    } catch (error) {
      console.error('Price service health check failed:', error);
    }

    try {
      // Check Fulfilment Service
      // Use service binding in production, HTTP in local dev
      if (env.FULFILMENT_SERVICE) {
        // Production: Use service binding
        const fulfilmentResponse = await env.FULFILMENT_SERVICE.fetch('http://internal/health');
        checks.fulfilmentService = fulfilmentResponse.ok;
      } else {
        // Local dev: Use HTTP
        const fulfilmentResponse = await fetch('http://localhost:8791/health');
        checks.fulfilmentService = fulfilmentResponse.ok;
      }
    } catch (error) {
      console.error('Fulfilment service health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(status => status === true);

    return new Response(
      JSON.stringify(
        successResponse(
          {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'cart-worker',
            version: '1.0.0',
            checks,
            environment: env.PRICE_SERVICE ? 'production' : 'development',
          },
          allHealthy ? 'All systems operational' : 'Some systems degraded'
        )
      ),
      {
        status: allHealthy ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
