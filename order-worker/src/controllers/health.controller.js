/**
 * Health check controller
 */

export const HealthController = {
  /**
   * Basic health check
   */
  async check(request, env) {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'order-worker',
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Detailed health check with database connection
   */
  async detailed(request, env) {
    try {
      // Test database connection
      const result = await env.DB.prepare('SELECT 1 as test').first();

      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'order-worker',
          timestamp: Date.now(),
          database: result ? 'connected' : 'error',
          checks: {
            db: result ? 'pass' : 'fail',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          service: 'order-worker',
          timestamp: Date.now(),
          error: error.message,
          checks: {
            db: 'fail',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
