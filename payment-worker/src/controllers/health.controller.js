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
        service: 'payment-worker',
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  },

  /**
   * Detailed health check with database and PayPal connectivity
   */
  async detailed(request, env) {
    try {
      // Test database connection
      const dbResult = await env.DB.prepare('SELECT 1 as test').first();

      // Test PayPal connectivity (just check if credentials are set)
      const paypalConfigured = !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'payment-worker',
          timestamp: Date.now(),
          database: dbResult ? 'connected' : 'error',
          paypal: paypalConfigured ? 'configured' : 'not_configured',
          checks: {
            db: dbResult ? 'pass' : 'fail',
            paypal: paypalConfigured ? 'pass' : 'fail',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          service: 'payment-worker',
          timestamp: Date.now(),
          error: error.message,
          checks: {
            db: 'fail',
            paypal: 'unknown',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
