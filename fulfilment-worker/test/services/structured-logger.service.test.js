import { expect } from 'chai';
import sinon from 'sinon';
import {
  StructuredLogger,
  PerformanceMonitor,
} from '../../src/services/structured-logger.service.js';

describe('StructuredLogger Service', () => {
  let logger;
  let env;
  let ctx;
  let consoleStub;

  beforeEach(() => {
    env = {
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'DEBUG',
    };
    ctx = {
      waitUntil: sinon.stub(),
    };
    consoleStub = {
      log: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    // Stub console methods
    sinon.stub(console, 'log').callsFake(consoleStub.log);
    sinon.stub(console, 'warn').callsFake(consoleStub.warn);
    sinon.stub(console, 'error').callsFake(consoleStub.error);

    logger = new StructuredLogger('test-service', env, ctx);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with service name and environment', () => {
      expect(logger.serviceName).to.equal('test-service');
      expect(logger.env).to.equal(env);
      expect(logger.ctx).to.equal(ctx);
    });

    it('should generate a unique request ID', () => {
      const logger1 = new StructuredLogger('service1', env, ctx);
      const logger2 = new StructuredLogger('service2', env, ctx);

      expect(logger1.requestId).to.be.a('string');
      expect(logger2.requestId).to.be.a('string');
      expect(logger1.requestId).to.not.equal(logger2.requestId);
    });

    it('should set default log level from environment', () => {
      expect(logger.minLogLevel).to.equal('DEBUG');
    });

    it('should default to INFO log level if not specified', () => {
      const envWithoutLevel = { ENVIRONMENT: 'test' };
      const loggerWithDefault = new StructuredLogger('test', envWithoutLevel, ctx);

      expect(loggerWithDefault.minLogLevel).to.equal('INFO');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = logger.generateRequestId();
      const id2 = logger.generateRequestId();

      expect(id1).to.not.equal(id2);
      expect(id1).to.include('-');
    });
  });

  describe('createLogEntry', () => {
    it('should create a structured log entry', () => {
      const entry = logger.createLogEntry('INFO', 'Test message', { key: 'value' });

      expect(entry).to.have.property('timestamp');
      expect(entry.level).to.equal('INFO');
      expect(entry.service).to.equal('test-service');
      expect(entry.requestId).to.equal(logger.requestId);
      expect(entry.message).to.equal('Test message');
      expect(entry.metadata).to.deep.include({
        key: 'value',
        environment: 'test',
      });
    });

    it('should include environment in metadata', () => {
      const entry = logger.createLogEntry('ERROR', 'Error message');

      expect(entry.metadata.environment).to.equal('test');
    });

    it('should use ISO timestamp format', () => {
      const entry = logger.createLogEntry('INFO', 'Test');

      expect(entry.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('shouldLog', () => {
    it('should respect log level hierarchy', () => {
      logger.minLogLevel = 'INFO';

      expect(logger.shouldLog('DEBUG')).to.be.false;
      expect(logger.shouldLog('INFO')).to.be.true;
      expect(logger.shouldLog('WARN')).to.be.true;
      expect(logger.shouldLog('ERROR')).to.be.true;
      expect(logger.shouldLog('FATAL')).to.be.true;
    });

    it('should allow all logs when DEBUG level is set', () => {
      logger.minLogLevel = 'DEBUG';

      expect(logger.shouldLog('DEBUG')).to.be.true;
      expect(logger.shouldLog('INFO')).to.be.true;
      expect(logger.shouldLog('WARN')).to.be.true;
      expect(logger.shouldLog('ERROR')).to.be.true;
    });

    it('should only allow ERROR and FATAL when ERROR level is set', () => {
      logger.minLogLevel = 'ERROR';

      expect(logger.shouldLog('DEBUG')).to.be.false;
      expect(logger.shouldLog('INFO')).to.be.false;
      expect(logger.shouldLog('WARN')).to.be.false;
      expect(logger.shouldLog('ERROR')).to.be.true;
      expect(logger.shouldLog('FATAL')).to.be.true;
    });
  });

  describe('debug', () => {
    it('should log debug message when level allows', () => {
      logger.minLogLevel = 'DEBUG';
      logger.debug('Debug message', { key: 'value' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('DEBUG');
      expect(logger.logs[0].message).to.equal('Debug message');
      expect(consoleStub.log.calledOnce).to.be.true;
    });

    it('should not log debug message when level is INFO', () => {
      logger.minLogLevel = 'INFO';
      logger.debug('Debug message');

      expect(logger.logs).to.have.lengthOf(0);
      expect(consoleStub.log.called).to.be.false;
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Info message', { userId: '123' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('INFO');
      expect(logger.logs[0].message).to.equal('Info message');
      expect(logger.logs[0].metadata.userId).to.equal('123');
      expect(consoleStub.log.calledOnce).to.be.true;
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Warning message', { reason: 'test' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('WARN');
      expect(logger.logs[0].message).to.equal('Warning message');
      expect(consoleStub.warn.calledOnce).to.be.true;
    });
  });

  describe('error', () => {
    it('should log error message without error object', () => {
      logger.error('Error message', { context: 'test' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('ERROR');
      expect(logger.logs[0].message).to.equal('Error message');
      expect(logger.logs[0].metadata.error).to.be.null;
      expect(consoleStub.error.calledOnce).to.be.true;
    });

    it('should log error message with error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { context: 'test' }, error);

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].metadata.error).to.deep.include({
        name: 'Error',
        message: 'Test error',
      });
      expect(logger.logs[0].metadata.error.stack).to.exist;
    });
  });

  describe('fatal', () => {
    it('should always log fatal messages', () => {
      logger.minLogLevel = 'FATAL';
      const error = new Error('Fatal error');
      logger.fatal('Fatal message', { critical: true }, error);

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('FATAL');
      expect(logger.logs[0].metadata.critical).to.be.true;
      expect(consoleStub.error.calledOnce).to.be.true;
    });
  });

  describe('logRequest', () => {
    it('should log HTTP request details', () => {
      const request = {
        url: 'https://example.com/api/test?param=value',
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
      };

      logger.logRequest(request, { extra: 'data' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].message).to.equal('HTTP Request');
      expect(logger.logs[0].metadata.method).to.equal('POST');
      expect(logger.logs[0].metadata.path).to.equal('/api/test');
      expect(logger.logs[0].metadata.query).to.equal('?param=value');
      expect(logger.logs[0].metadata.extra).to.equal('data');
    });
  });

  describe('logResponse', () => {
    it('should log HTTP response details', () => {
      const response = {
        status: 200,
        statusText: 'OK',
      };
      const duration = 125;

      logger.logResponse(response, duration, { requestId: '123' });

      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].message).to.equal('HTTP Response');
      expect(logger.logs[0].metadata.status).to.equal(200);
      expect(logger.logs[0].metadata.statusText).to.equal('OK');
      expect(logger.logs[0].metadata.durationMs).to.equal(125);
      expect(logger.logs[0].metadata.requestId).to.equal('123');
    });
  });

  describe('flushToR2', () => {
    it('should warn if LOGS_BUCKET is not configured', async () => {
      // Console.warn is already stubbed in beforeEach, just check it was called
      await logger.flushToR2();

      expect(consoleStub.warn.calledOnce).to.be.true;
      expect(consoleStub.warn.firstCall.args[0]).to.equal(
        'LOGS_BUCKET not configured, skipping R2 flush'
      );
    });

    it('should not flush if no logs exist', async () => {
      env.LOGS_BUCKET = { put: sinon.stub() };
      await logger.flushToR2();

      expect(env.LOGS_BUCKET.put.called).to.be.false;
    });

    it('should flush logs to R2 when configured', async () => {
      env.LOGS_BUCKET = { put: sinon.stub().resolves() };
      logger.info('Test log');

      await logger.flushToR2();

      expect(env.LOGS_BUCKET.put.calledOnce).to.be.true;
      const [key, data, options] = env.LOGS_BUCKET.put.firstCall.args;

      expect(key).to.include('test-service');
      expect(key).to.include(logger.requestId);
      expect(options.httpMetadata.contentType).to.equal('application/json');
      expect(options.customMetadata.service).to.equal('test-service');
    });

    it('should handle R2 flush errors gracefully', async () => {
      env.LOGS_BUCKET = {
        put: sinon.stub().rejects(new Error('R2 error')),
      };
      logger.info('Test log');

      // Should not throw - just call it and expect no error
      try {
        await logger.flushToR2();
        // If we get here, the error was handled gracefully
        expect(true).to.be.true;
      } catch (error) {
        expect.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('child', () => {
    it('should create child logger with same request ID', () => {
      const childLogger = logger.child({ userId: '123' });

      expect(childLogger.requestId).to.equal(logger.requestId);
      expect(childLogger.serviceName).to.equal(logger.serviceName);
    });

    it('should share logs array with parent', () => {
      logger.info('Parent log');
      const childLogger = logger.child();
      childLogger.info('Child log');

      expect(logger.logs).to.have.lengthOf(2);
      expect(childLogger.logs).to.have.lengthOf(2);
      expect(logger.logs).to.equal(childLogger.logs);
    });
  });

  describe('forRequest', () => {
    it('should create logger for request', () => {
      const request = { url: 'https://example.com' };
      const newLogger = StructuredLogger.forRequest('api-service', request, env, ctx);

      expect(newLogger.serviceName).to.equal('api-service');
      expect(newLogger.env).to.equal(env);
      expect(newLogger.ctx).to.equal(ctx);
    });

    it('should schedule automatic flushing', () => {
      const request = { url: 'https://example.com' };
      StructuredLogger.forRequest('api-service', request, env, ctx);

      expect(ctx.waitUntil.calledOnce).to.be.true;
    });
  });
});

describe('PerformanceMonitor', () => {
  let logger;
  let monitor;
  let clock;

  beforeEach(() => {
    const env = { ENVIRONMENT: 'test', LOG_LEVEL: 'DEBUG' };
    const ctx = { waitUntil: sinon.stub() };
    logger = new StructuredLogger('test-service', env, ctx);

    // Stub console methods
    sinon.stub(console, 'log');
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');

    clock = sinon.useFakeTimers();
    monitor = new PerformanceMonitor(logger, 'test-operation');
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('end', () => {
    it('should log operation completion with duration', () => {
      clock.tick(150);
      const duration = monitor.end({ result: 'success' });

      expect(duration).to.equal(150);
      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].message).to.equal('test-operation completed');
      expect(logger.logs[0].metadata.durationMs).to.equal(150);
      expect(logger.logs[0].metadata.operation).to.equal('test-operation');
      expect(logger.logs[0].metadata.result).to.equal('success');
    });

    it('should measure different durations', () => {
      clock.tick(500);
      const duration = monitor.end();

      expect(duration).to.equal(500);
      expect(logger.logs[0].metadata.durationMs).to.equal(500);
    });
  });

  describe('endWithError', () => {
    it('should log operation failure with error', () => {
      const error = new Error('Operation failed');
      clock.tick(250);

      const duration = monitor.endWithError(error, { context: 'test' });

      expect(duration).to.equal(250);
      expect(logger.logs).to.have.lengthOf(1);
      expect(logger.logs[0].level).to.equal('ERROR');
      expect(logger.logs[0].message).to.equal('test-operation failed');
      expect(logger.logs[0].metadata.durationMs).to.equal(250);
      expect(logger.logs[0].metadata.error).to.exist;
      expect(logger.logs[0].metadata.error.message).to.equal('Operation failed');
    });
  });
});
