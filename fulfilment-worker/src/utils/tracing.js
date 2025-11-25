/**
 * Enhanced Tracing Utility for Distributed Tracing
 * Provides utilities for span management, event logging, and cross-service trace propagation
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

const SERVICE_NAME = 'fulfilment-worker';

/**
 * Get the current active span
 * @returns {Span|null} Active span or null
 */
export function getActiveSpan() {
  return trace.getActiveSpan();
}

/**
 * Add standard attributes to a span
 * @param {Span} span - The span to add attributes to
 * @param {object} attributes - Key-value pairs of attributes
 */
export function addSpanAttributes(span, attributes) {
  if (!span) return;

  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      span.setAttribute(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }
  });
}

/**
 * Add an event to the current span with structured data
 * @param {string} eventName - Name of the event
 * @param {object} data - Event data
 * @param {Span} [span] - Optional span, uses active span if not provided
 */
export function addSpanEvent(eventName, data = {}, span = null) {
  const activeSpan = span || getActiveSpan();
  if (!activeSpan) return;

  const eventData = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  activeSpan.addEvent(eventName, {
    'event.data': JSON.stringify(eventData),
  });
}

/**
 * Initialize request tracing with comprehensive attributes
 * @param {Request} request - The incoming request
 * @param {object} env - Environment variables
 * @returns {object} Trace context information
 */
export function initializeRequestTrace(request, env) {
  const span = getActiveSpan();
  const cfRay = request.headers.get('cf-ray') || 'unknown';
  const url = new URL(request.url);

  if (!span) {
    console.warn('No active span found during request initialization');
    return { traceId: null, spanId: null };
  }

  const spanContext = span.spanContext();
  const traceId = spanContext.traceId;
  const spanId = spanContext.spanId;

  // Add comprehensive service attributes
  addSpanAttributes(span, {
    'service.name': SERVICE_NAME,
    'service.version': '1.0.0',
    'service.environment': env.ENVIRONMENT || 'production',

    // HTTP attributes
    'http.method': request.method,
    'http.url': request.url,
    'http.scheme': url.protocol.replace(':', ''),
    'http.host': url.host,
    'http.target': url.pathname + url.search,
    'http.route': url.pathname,

    // Cloudflare specific
    'cf.ray': cfRay,
    'cf.colo': request.cf?.colo || 'unknown',
    'cf.country': request.cf?.country || 'unknown',

    // Trace context
    'trace.id': traceId,
    'span.id': spanId,
  });

  // Add request received event
  addSpanEvent('request.received', {
    method: request.method,
    path: url.pathname,
    query: url.search,
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'content-type': request.headers.get('content-type'),
    },
    cfRay,
  });

  return { traceId, spanId, cfRay };
}

/**
 * Record response information in the span
 * @param {Response} response - The response object
 * @param {object} additionalData - Additional data to record
 */
export function recordResponse(response, additionalData = {}) {
  const span = getActiveSpan();
  if (!span) return;

  const statusCode = response.status;

  // Add response attributes
  addSpanAttributes(span, {
    'http.status_code': statusCode,
    'http.status_text': response.statusText,
    'response.size': response.headers.get('content-length') || 'unknown',
    ...additionalData,
  });

  // Set span status based on HTTP status
  if (statusCode >= 400) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `HTTP ${statusCode}: ${response.statusText}`,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  // Add response event
  addSpanEvent('response.sent', {
    status: statusCode,
    statusText: response.statusText,
    ...additionalData,
  });
}

/**
 * Record an error in the span
 * @param {Error|string} error - The error to record
 * @param {object} additionalContext - Additional context about the error
 */
export function recordError(error, additionalContext = {}) {
  const span = getActiveSpan();
  if (!span) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Set error status
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: errorMessage,
  });

  // Add error attributes
  addSpanAttributes(span, {
    error: true,
    'error.type': error instanceof Error ? error.name : 'Error',
    'error.message': errorMessage,
    'error.stack': errorStack,
    ...additionalContext,
  });

  // Add error event
  addSpanEvent('error.occurred', {
    error: errorMessage,
    stack: errorStack,
    ...additionalContext,
  });

  // Record exception
  span.recordException(error);
}

/**
 * Create headers for propagating trace context to downstream services
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} Headers object with trace context
 */
export function createTracePropagationHeaders(additionalHeaders = {}) {
  const span = getActiveSpan();

  if (!span) {
    return additionalHeaders;
  }

  const spanContext = span.spanContext();

  // W3C Trace Context format
  const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;

  return {
    traceparent: traceParent,
    'x-trace-id': spanContext.traceId,
    'x-span-id': spanContext.spanId,
    'x-service-name': SERVICE_NAME,
    ...additionalHeaders,
  };
}

/**
 * Make a traced fetch call to another service
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {string} targetService - Name of the target service
 * @returns {Promise<Response>} Fetch response
 */
export async function tracedFetch(url, options = {}, targetService = 'unknown') {
  const span = getActiveSpan();
  const tracer = trace.getTracer(SERVICE_NAME);

  // Create a child span for the outgoing request
  return tracer.startActiveSpan(
    `${options.method || 'GET'} ${targetService}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'span.kind': 'client',
        'http.url': url,
        'http.method': options.method || 'GET',
        'peer.service': targetService,
        'call.type': 'http',
      },
    },
    async childSpan => {
      try {
        // Propagate trace context in headers
        const headers = createTracePropagationHeaders(options.headers || {});

        // Add event for outgoing request
        addSpanEvent(
          'outgoing.request',
          {
            target: targetService,
            url,
            method: options.method || 'GET',
          },
          childSpan
        );

        // Make the fetch call
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Record response
        addSpanAttributes(childSpan, {
          'http.status_code': response.status,
          'response.success': response.ok,
        });

        addSpanEvent(
          'outgoing.response',
          {
            status: response.status,
            ok: response.ok,
          },
          childSpan
        );

        if (!response.ok) {
          childSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${response.status}`,
          });
        } else {
          childSpan.setStatus({ code: SpanStatusCode.OK });
        }

        return response;
      } catch (error) {
        // Record error in child span
        recordError(error, { target: targetService, url });
        childSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        childSpan.end();
      }
    }
  );
}

/**
 * Create a custom span for a specific operation
 * @param {string} operationName - Name of the operation
 * @param {Function} fn - Async function to execute within the span
 * @param {object} attributes - Additional attributes for the span
 * @returns {Promise<any>} Result of the function
 */
export async function withSpan(operationName, fn, attributes = {}) {
  const tracer = trace.getTracer(SERVICE_NAME);

  return tracer.startActiveSpan(
    operationName,
    {
      attributes: {
        'operation.name': operationName,
        ...attributes,
      },
    },
    async span => {
      try {
        addSpanEvent('operation.started', { operation: operationName });

        const result = await fn(span);

        addSpanEvent('operation.completed', {
          operation: operationName,
          success: true,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        recordError(error, { operation: operationName });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Add user context to the current span
 * @param {string} userId - User ID
 * @param {object} additionalUserData - Additional user data
 */
export function addUserContext(userId, additionalUserData = {}) {
  const span = getActiveSpan();
  if (!span) return;

  addSpanAttributes(span, {
    'user.id': userId,
    'enduser.id': userId,
    ...Object.entries(additionalUserData).reduce((acc, [key, value]) => {
      acc[`user.${key}`] = value;
      return acc;
    }, {}),
  });

  addSpanEvent('user.identified', {
    userId,
    ...additionalUserData,
  });
}

/**
 * Add database operation context
 * @param {string} operation - Database operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} table - Table name
 * @param {object} additionalData - Additional data
 */
export function addDatabaseContext(operation, table, additionalData = {}) {
  const span = getActiveSpan();
  if (!span) return;

  addSpanAttributes(span, {
    'db.system': 'd1',
    'db.operation': operation,
    'db.name': table,
    ...additionalData,
  });

  addSpanEvent('db.query', {
    operation,
    table,
    ...additionalData,
  });
}

/**
 * Extract trace context from incoming request headers
 * @param {Request} request - The incoming request
 * @returns {object|null} Trace context or null
 */
export function extractTraceContext(request) {
  const traceparent = request.headers.get('traceparent');
  const traceId = request.headers.get('x-trace-id');
  const spanId = request.headers.get('x-span-id');
  const sourceService = request.headers.get('x-service-name');

  if (traceparent || traceId) {
    addSpanEvent('trace.context.extracted', {
      source: sourceService || 'unknown',
      traceId: traceId || 'from-traceparent',
      parentSpanId: spanId || 'from-traceparent',
    });

    return {
      traceparent,
      traceId,
      spanId,
      sourceService,
    };
  }

  return null;
}

export default {
  getActiveSpan,
  addSpanAttributes,
  addSpanEvent,
  initializeRequestTrace,
  recordResponse,
  recordError,
  createTracePropagationHeaders,
  tracedFetch,
  withSpan,
  addUserContext,
  addDatabaseContext,
  extractTraceContext,
};
