/**
 * Logging Middleware for Cloudflare Workers
 *
 * Automatically logs all HTTP requests and responses
 * without affecting the request flow
 */

import { trace } from '@opentelemetry/api';
import { StructuredLogger } from '../services/structured-logger.service.js';

/**
 * Create a logging middleware that wraps the request/response cycle
 */
export function createLoggingMiddleware(serviceName) {
  return async (request, env, ctx, next) => {
    const startTime = Date.now();
    const logger = StructuredLogger.forRequest(serviceName, request, env, ctx);

    // Attach logger to request for use in controllers/services
    request.logger = logger;

    try {
      // Log incoming request
      const url = new URL(request.url);
      const _sanitizedHeaders = sanitizeHeaders(request.headers);

      logger.info('Incoming request', {
        method: request.method,
        path: url.pathname,
        query: url.search,
        userAgent: request.headers.get('user-agent'),
        cf: request.cf
          ? {
              colo: request.cf.colo,
              country: request.cf.country,
              city: request.cf.city,
            }
          : null,
      });

      // Continue with the request
      const response = await next();

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log response
      logger.info('Request completed', {
        status: response.status,
        statusText: response.statusText,
        durationMs: duration,
        method: request.method,
        path: url.pathname,
      });

      // Add request ID to response headers for tracing
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-Request-ID', logger.requestId);
      newResponse.headers.set('X-Response-Time', `${duration}ms`);

      return newResponse;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      const url = new URL(request.url);

      logger.error(
        'Request failed',
        {
          method: request.method,
          path: url.pathname,
          durationMs: duration,
          errorName: error.name,
          errorMessage: error.message,
        },
        error
      );

      // Re-throw the error to be handled by error handlers
      throw error;
    }
  };
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers) {
  const sanitized = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  for (const [key, value] of headers.entries()) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware wrapper for itty-router
 * Use this to wrap your router's fetch method
 */
export function withLogging(serviceName, routerFetch) {
  return async (request, env, ctx) => {
    const startTime = Date.now();
    const logger = StructuredLogger.forRequest(serviceName, request, env, ctx);

    // Attach logger to request
    request.logger = logger;

    try {
      // Log incoming request
      const url = new URL(request.url);

      const logData = {
        method: request.method,
        path: url.pathname,
        query: url.search,
        userAgent: request.headers.get('user-agent') || 'unknown',
        cfData: request.cf
          ? {
              colo: request.cf.colo,
              country: request.cf.country,
              city: request.cf.city,
            }
          : null,
      };

      logger.info('Incoming request', logData);

      // Add log data as span attributes
      const span = trace.getActiveSpan();
      if (span) {
        span.setAttribute('log.level', 'INFO');
        span.setAttribute('log.message', 'Incoming request');
        span.setAttribute('request.path', url.pathname);
        span.setAttribute('request.userAgent', logData.userAgent);
        if (logData.cfData) {
          span.setAttribute('cf.colo', logData.cfData.colo);
          span.setAttribute('cf.country', logData.cfData.country);
          span.setAttribute('cf.city', logData.cfData.city);
        }
      }

      // Execute the router
      const response = await routerFetch(request, env, ctx);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log response
      const responseLogData = {
        status: response.status,
        statusText: response.statusText,
        durationMs: duration,
        method: request.method,
        path: url.pathname,
      };

      logger.info('Request completed', responseLogData);

      // Add response log data as span attributes
      const responseSpan = trace.getActiveSpan();
      if (responseSpan) {
        responseSpan.setAttribute('response.status', response.status);
        responseSpan.setAttribute('response.durationMs', duration);
        responseSpan.setAttribute('log.completed', true);
      }

      // Add request ID and timing headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-Request-ID', logger.requestId);
      newResponse.headers.set('X-Response-Time', `${duration}ms`);

      return newResponse;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      const url = new URL(request.url);

      const errorLogData = {
        method: request.method,
        path: url.pathname,
        durationMs: duration,
      };

      logger.error('Request failed', errorLogData, error);

      // Add error log data as span attributes
      const span = trace.getActiveSpan();
      if (span) {
        span.setAttribute('log.level', 'ERROR');
        span.setAttribute('log.error', true);
        span.setAttribute('error.message', error.message);
        span.setAttribute('error.name', error.name);
        span.setAttribute('response.durationMs', duration);
      }

      // Return error response
      const errorResponse = new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
          requestId: logger.requestId,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': logger.requestId,
          },
        }
      );

      return errorResponse;
    }
  };
}

/**
 * Helper to get logger from request
 */
export function getLogger(request) {
  return request.logger || null;
}
