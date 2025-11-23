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
            service: 'price-worker',
            version: '1.0.0',
          },
          'Price service is healthy'
        )
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Detailed health check with dependencies
   * GET /health/detailed
   */
  async detailed(request, env) {
    const checks = {
      database: false,
      priceRecords: 0,
    };

    try {
      // Check database
      const dbResult = await env.DB.prepare('SELECT 1').first();
      checks.database = dbResult !== null;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check price records exist
    try {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM prices').first();
      checks.priceRecords = countResult.total || 0;
    } catch (error) {
      console.error('Price records check failed:', error);
      checks.priceRecords = 0;
    }

    const allHealthy = checks.database === true;

    return new Response(
      JSON.stringify(
        successResponse(
          {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'price-worker',
            version: '1.0.0',
            checks,
          },
          allHealthy ? 'All systems operational' : 'Database unavailable'
        )
      ),
      {
        status: allHealthy ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
