/**
 * Structured Logging Service for Cloudflare Workers
 *
 * Features:
 * - JSON structured logs with consistent format
 * - Non-blocking R2 writes using ctx.waitUntil()
 * - Request correlation with trace IDs
 * - Log levels: DEBUG, INFO, WARN, ERROR, FATAL
 * - Automatic batching for performance
 * - Date-partitioned storage in R2
 */

export class StructuredLogger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
  };

  constructor(serviceName, environmentOrEnv, ctxOrLogLevel) {
    this.serviceName = serviceName;

    // Support both old (serviceName, env, ctx) and new (serviceName, environment, logLevel) signatures
    if (typeof environmentOrEnv === 'string') {
      // New signature: (serviceName, environment, logLevel)
      this.environment = environmentOrEnv;
      this.logLevel = ctxOrLogLevel || 'INFO';
      this.env = null;
      this.ctx = null;
    } else {
      // Old signature: (serviceName, env, ctx)
      this.env = environmentOrEnv;
      this.ctx = ctxOrLogLevel;
      this.environment = this.env?.ENVIRONMENT || 'production';
      this.logLevel = this.env?.LOG_LEVEL || 'INFO';
    }

    this.logs = [];
    this.requestId = StructuredLogger.generateRequestId();
    this.minLogLevel = this.logLevel;
  }

  /**
   * Generate a unique request ID for correlation
   */
  static generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a structured log entry
   */
  createLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();

    return {
      timestamp,
      level,
      service: this.serviceName,
      requestId: this.requestId,
      message,
      environment: this.environment,
      ...metadata,
    };
  }

  /**
   * Check if log level should be logged
   */
  shouldLog(level) {
    return StructuredLogger.LOG_LEVELS[level] >= StructuredLogger.LOG_LEVELS[this.minLogLevel];
  }

  /**
   * Log a debug message
   */
  debug(message, metadata = {}) {
    if (this.shouldLog('DEBUG')) {
      const entry = this.createLogEntry('DEBUG', message, metadata);
      this.logs.push(entry);
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log an info message
   */
  info(message, metadata = {}) {
    if (this.shouldLog('INFO')) {
      const entry = this.createLogEntry('INFO', message, metadata);
      this.logs.push(entry);
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log a warning message
   */
  warn(message, metadata = {}) {
    if (this.shouldLog('WARN')) {
      const entry = this.createLogEntry('WARN', message, metadata);
      this.logs.push(entry);
      console.warn(JSON.stringify(entry));
    }
  }

  /**
   * Log an error message
   */
  error(message, metadata = {}, error = null) {
    if (this.shouldLog('ERROR')) {
      const entry = this.createLogEntry('ERROR', message, {
        ...metadata,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : null,
      });
      this.logs.push(entry);
      console.error(JSON.stringify(entry));
    }
  }

  /**
   * Log a fatal error message
   */
  fatal(message, metadata = {}, error = null) {
    const entry = this.createLogEntry('FATAL', message, {
      ...metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : null,
    });
    this.logs.push(entry);
    console.error(JSON.stringify(entry));
  }

  /**
   * Log HTTP request details
   */
  logRequest(request, metadata = {}) {
    const url = new URL(request.url);
    this.info('HTTP Request', {
      method: request.method,
      path: url.pathname,
      query: url.search,
      headers: Object.fromEntries(request.headers),
      ...metadata,
    });
  }

  /**
   * Log HTTP response details
   */
  logResponse(response, durationMs, metadata = {}) {
    this.info('HTTP Response', {
      status: response.status,
      statusText: response.statusText,
      durationMs,
      ...metadata,
    });
  }

  /**
   * Flush logs to R2 storage
   * This is called via ctx.waitUntil() to not block the response
   */
  async flushToR2() {
    if (!this.env.LOGS_BUCKET) {
      console.warn('LOGS_BUCKET not configured, skipping R2 flush');
      return;
    }

    if (this.logs.length === 0) {
      return;
    }

    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = now.getUTCHours().toString().padStart(2, '0');
      const _minute = now.getUTCMinutes().toString().padStart(2, '0');

      // Create a hierarchical path: service/year/month/day/hour/timestamp-requestId.json
      const [year, month, day] = date.split('-');
      const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const key = `${this.serviceName}/${year}/${month}/${day}/${hour}/${timestamp}-${this.requestId}.json`;

      const logData = {
        service: this.serviceName,
        requestId: this.requestId,
        timestamp: now.toISOString(),
        logCount: this.logs.length,
        logs: this.logs,
      };

      await this.env.LOGS_BUCKET.put(key, JSON.stringify(logData, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          service: this.serviceName,
          requestId: this.requestId,
          date,
          hour,
          logCount: this.logs.length.toString(),
        },
      });

      console.log(`Flushed ${this.logs.length} logs to R2: ${key}`);
    } catch (error) {
      // Log errors but don't throw - we don't want logging to break the application
      console.error('Failed to flush logs to R2:', error);
    }
  }

  /**
   * Attach this logger to the execution context
   * This ensures logs are flushed after the response is sent
   */
  attachToContext() {
    if (this.ctx && this.ctx.waitUntil) {
      // Schedule log flushing to happen after response is sent
      this.ctx.waitUntil(this.flushToR2());
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext = {}) {
    const childLogger = new StructuredLogger(this.serviceName, this.env, this.ctx);
    childLogger.requestId = this.requestId;
    childLogger.logs = this.logs; // Share the same log array
    childLogger.defaultMetadata = { ...this.defaultMetadata, ...additionalContext };
    return childLogger;
  }

  /**
   * Static method to create a logger for a request
   */
  static forRequest(serviceName, request, env, ctx) {
    const logger = new StructuredLogger(serviceName, env, ctx);

    // Attach logger to the context for automatic flushing
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        (async () => {
          // Wait a bit to ensure all logs are captured
          await new Promise(resolve => setTimeout(resolve, 100));
          await logger.flushToR2();
        })()
      );
    }

    return logger;
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  constructor(logger, operation) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(metadata = {}) {
    const duration = Date.now() - this.startTime;
    this.logger.info(`${this.operation} completed`, {
      operation: this.operation,
      durationMs: duration,
      ...metadata,
    });
    return duration;
  }

  endWithError(error, metadata = {}) {
    const duration = Date.now() - this.startTime;
    this.logger.error(
      `${this.operation} failed`,
      {
        operation: this.operation,
        durationMs: duration,
        ...metadata,
      },
      error
    );
    return duration;
  }
}
