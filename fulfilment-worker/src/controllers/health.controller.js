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
            service: 'fulfilment-worker',
            version: '1.0.0',
          },
          'Fulfilment service is healthy'
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
      warehouses: 0,
      inventoryRecords: 0,
      deliveryZones: 0,
    };

    try {
      // Check database
      const dbResult = await env.DB.prepare('SELECT 1').first();
      checks.database = dbResult !== null;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check warehouses
    try {
      const warehouseCount = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM warehouses WHERE is_active = 1'
      ).first();
      checks.warehouses = warehouseCount.total || 0;
    } catch (error) {
      console.error('Warehouse check failed:', error);
    }

    // Check inventory records
    try {
      const inventoryCount = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM inventory'
      ).first();
      checks.inventoryRecords = inventoryCount.total || 0;
    } catch (error) {
      console.error('Inventory check failed:', error);
    }

    // Check delivery zones
    try {
      const zoneCount = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM delivery_zones'
      ).first();
      checks.deliveryZones = zoneCount.total || 0;
    } catch (error) {
      console.error('Delivery zones check failed:', error);
    }

    const allHealthy = checks.database === true && checks.warehouses > 0;

    return new Response(
      JSON.stringify(
        successResponse(
          {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'fulfilment-worker',
            version: '1.0.0',
            checks,
          },
          allHealthy ? 'All systems operational' : 'System degraded or unconfigured'
        )
      ),
      {
        status: allHealthy ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
