import { CacheService } from '../services/cache.service.js';
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
            service: 'catalog-worker',
          },
          'Service is healthy'
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
      cache: false,
      storage: false,
    };

    try {
      // Check database
      const dbResult = await env.DB.prepare('SELECT 1').first();
      checks.database = dbResult !== null;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Check KV cache
      await env.SKU_CACHE.put('health_check', 'ok', { expirationTtl: 60 });
      const kvResult = await env.SKU_CACHE.get('health_check');
      checks.cache = kvResult === 'ok';
    } catch (error) {
      console.error('Cache health check failed:', error);
    }

    try {
      // Check R2 storage
      await env.prod_images.put('health_check.txt', 'ok');
      const r2Result = await env.prod_images.get('health_check.txt');
      checks.storage = r2Result !== null;
      await env.prod_images.delete('health_check.txt');
    } catch (error) {
      console.error('Storage health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(status => status === true);

    return new Response(
      JSON.stringify(
        successResponse(
          {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'catalog-worker',
            checks,
            cache: CacheService.getStats(),
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
