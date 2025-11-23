/**
 * Log Consolidator Worker
 *
 * Scheduled worker that runs at the end of each day to:
 * 1. Collect all logs from R2
 * 2. Consolidate them by service
 * 3. Generate daily summaries
 * 4. Archive them in a separate bucket/path
 */

import { instrument } from '@microlabs/otel-cf-workers';
import { trace } from '@opentelemetry/api';
import { StructuredLogger } from './services/structured-logger.service.js';

const handler = {
  /**
   * Scheduled handler - runs at the end of each day
   * Configure in wrangler.toml with: [triggers] crons = ["0 0 * * *"]
   */
  async scheduled(event, env, ctx) {
    const logger = new StructuredLogger('log-consolidator', env, ctx);

    try {
      logger.info('Starting daily log consolidation', {
        scheduledTime: event.scheduledTime,
        cron: event.cron,
      });

      const yesterday = new Date(event.scheduledTime || Date.now());
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-');

      logger.info('Processing logs for date', { date: dateStr });

      // Services to consolidate
      const services = [
        'auth-worker',
        'cart-worker',
        'catalog-worker',
        'fulfilment-worker',
        'order-worker',
        'payment-worker',
        'price-worker',
      ];

      const consolidationResults = {};

      // Process each service
      for (const service of services) {
        try {
          logger.info(`Processing logs for service: ${service}`);

          const result = await consolidateServiceLogs(
            env.LOGS_BUCKET,
            service,
            year,
            month,
            day,
            logger
          );

          consolidationResults[service] = result;

          logger.info(`Completed consolidation for ${service}`, result);
        } catch (error) {
          logger.error(`Failed to consolidate logs for ${service}`, {}, error);
          consolidationResults[service] = { error: error.message };
        }
      }

      // Create a summary report
      const summaryReport = {
        date: dateStr,
        consolidatedAt: new Date().toISOString(),
        services: consolidationResults,
        totalLogs: Object.values(consolidationResults)
          .filter(r => r.logCount)
          .reduce((sum, r) => sum + r.logCount, 0),
        totalFiles: Object.values(consolidationResults)
          .filter(r => r.filesProcessed)
          .reduce((sum, r) => sum + r.filesProcessed, 0),
      };

      // Save the summary report
      const summaryKey = `_consolidated/daily-summary/${year}/${month}/${dateStr}-summary.json`;
      await env.LOGS_BUCKET.put(summaryKey, JSON.stringify(summaryReport, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          type: 'daily-summary',
          date: dateStr,
        },
      });

      logger.info('Daily log consolidation completed', summaryReport);

      // Flush the consolidator's own logs
      await logger.flushToR2();
    } catch (error) {
      logger.error('Log consolidation failed', {}, error);
      await logger.flushToR2();
      throw error;
    }
  },

  /**
   * HTTP handler for manual triggering or status checks
   */
  async fetch(request, env, ctx) {
    // Get active span for custom attributes and events
    const span = trace.getActiveSpan();
    const cfRay = request.headers.get('cf-ray') || 'No cf-ray header';

    if (span) {
      // Add custom attributes
      span.setAttribute('cfray', cfRay);
      span.setAttribute('worker.name', 'log-consolidator-worker');
      span.setAttribute('http.method', request.method);
      span.setAttribute('http.url', request.url);

      // Add event with request details
      span.addEvent('request_received', {
        message: JSON.stringify({
          request: request.url,
          method: request.method,
          traceId: span.spanContext().traceId,
          cfRay,
        }),
      });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const response = new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'log-consolidator',
          version: '1.0.0',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (span) {
        span.addEvent('response_sent', {
          message: JSON.stringify({ status: 200, endpoint: 'health' }),
        });
      }

      return response;
    }

    if (url.pathname === '/trigger' && request.method === 'POST') {
      // Manual trigger for testing
      const logger = new StructuredLogger('log-consolidator', env, ctx);

      try {
        // Simulate scheduled event
        const event = {
          scheduledTime: Date.now(),
          cron: 'manual',
        };

        // Run consolidation in background
        ctx.waitUntil(this.scheduled(event, env, ctx));

        const response = new Response(
          JSON.stringify({
            status: 'triggered',
            message: 'Log consolidation started in background',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (span) {
          span.addEvent('consolidation_triggered', {
            message: 'Manual log consolidation triggered',
          });
        }

        return response;
      } catch (error) {
        logger.error('Manual trigger failed', {}, error);

        if (span) {
          span.addEvent('consolidation_error', {
            message: JSON.stringify({ error: error.message }),
          });
        }

        return new Response(
          JSON.stringify({
            error: 'Failed to trigger consolidation',
            message: error.message,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const response = new Response(
      JSON.stringify({
        service: 'Log Consolidator',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          trigger: '/trigger (POST)',
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (span) {
      span.addEvent('response_sent', {
        message: JSON.stringify({ status: 200, endpoint: 'root' }),
      });
    }

    return response;
  },
};

// OpenTelemetry configuration for Honeycomb
const config = env => {
  return {
    exporter: {
      url: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': env.HONEYCOMB_API_KEY,
      },
    },
    service: {
      name: 'ecommerce-worker',
    },
    // Enable trace context propagation for distributed tracing
    includeTraceContext: true,
  };
};

// Export instrumented handler
export default instrument(handler, config);

/**
 * Consolidate logs for a specific service and date
 */
async function consolidateServiceLogs(bucket, service, year, month, day, logger) {
  const prefix = `${service}/${year}/${month}/${day}/`;

  logger.debug(`Listing objects with prefix: ${prefix}`);

  // List all log files for the service on this day
  const files = [];
  let cursor = undefined;
  let totalSize = 0;

  do {
    const listed = await bucket.list({
      prefix,
      cursor,
      limit: 1000,
    });

    files.push(...listed.objects);
    totalSize += listed.objects.reduce((sum, obj) => sum + obj.size, 0);
    cursor = listed.cursor;
  } while (cursor);

  logger.info(`Found ${files.length} log files for ${service}`, {
    prefix,
    fileCount: files.length,
    totalSizeBytes: totalSize,
  });

  if (files.length === 0) {
    return {
      filesProcessed: 0,
      logCount: 0,
      message: 'No logs found',
    };
  }

  // Collect all logs
  const allLogs = [];
  const logsByLevel = {
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
  };
  const errorLogs = [];

  for (const file of files) {
    try {
      const object = await bucket.get(file.key);
      if (!object) continue;

      const content = await object.text();
      const logData = JSON.parse(content);

      // Process logs
      if (logData.logs && Array.isArray(logData.logs)) {
        for (const log of logData.logs) {
          allLogs.push(log);

          // Count by level
          if (Object.prototype.hasOwnProperty.call(logsByLevel, log.level)) {
            logsByLevel[log.level]++;
          }

          // Collect error logs for separate report
          if (log.level === 'ERROR' || log.level === 'FATAL') {
            errorLogs.push(log);
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to process log file: ${file.key}`, { error: error.message });
    }
  }

  // Create consolidated log file
  const consolidatedData = {
    service,
    date: `${year}-${month}-${day}`,
    consolidatedAt: new Date().toISOString(),
    summary: {
      totalLogs: allLogs.length,
      logsByLevel,
      filesProcessed: files.length,
      totalSizeBytes: totalSize,
    },
    logs: allLogs,
  };

  // Save consolidated logs
  const consolidatedKey = `_consolidated/${service}/${year}/${month}/${year}-${month}-${day}.json`;
  await bucket.put(consolidatedKey, JSON.stringify(consolidatedData, null, 2), {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      service,
      date: `${year}-${month}-${day}`,
      logCount: allLogs.length.toString(),
      type: 'consolidated-daily',
    },
  });

  // Save error logs separately if any exist
  if (errorLogs.length > 0) {
    const errorReportKey = `_consolidated/${service}/${year}/${month}/${year}-${month}-${day}-errors.json`;
    await bucket.put(
      errorReportKey,
      JSON.stringify(
        {
          service,
          date: `${year}-${month}-${day}`,
          errorCount: errorLogs.length,
          errors: errorLogs,
        },
        null,
        2
      ),
      {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          service,
          date: `${year}-${month}-${day}`,
          type: 'error-report',
        },
      }
    );
  }

  logger.info('Consolidated logs saved', {
    service,
    consolidatedKey,
    errorReportKey: errorLogs.length > 0 ? consolidatedKey.replace('.json', '-errors.json') : null,
  });

  return {
    filesProcessed: files.length,
    logCount: allLogs.length,
    errorCount: errorLogs.length,
    consolidatedKey,
    logsByLevel,
  };
}
