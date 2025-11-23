import { Hono } from 'hono';
import { HealthController } from '../controllers/health.controller.js';

const health = new Hono();

/**
 * Health check routes
 */

// Basic health check
health.get('/', HealthController.check);

// Detailed health check
health.get('/detailed', HealthController.detailed);

export default health;
