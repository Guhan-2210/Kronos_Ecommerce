import { expect } from 'chai';
import sinon from 'sinon';
import { StructuredLogger } from '../../src/services/structured-logger.service.js';

describe('StructuredLogger Service', () => {
  let logger;
  let consoleLogStub;
  let consoleErrorStub;
  let consoleWarnStub;

  beforeEach(() => {
    logger = new StructuredLogger('test-service', 'test-env', 'INFO');
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    consoleLogStub.restore();
    consoleErrorStub.restore();
    consoleWarnStub.restore();
  });

  describe('Constructor', () => {
    it('should create logger with service name', () => {
      expect(logger.serviceName).to.equal('test-service');
    });

    it('should create logger with environment', () => {
      expect(logger.environment).to.equal('test-env');
    });

    it('should generate request ID', () => {
      expect(logger.requestId).to.be.a('string');
      expect(logger.requestId).to.have.length.above(10);
    });

    it('should set log level', () => {
      expect(logger.logLevel).to.equal('INFO');
    });

    it('should default to INFO level', () => {
      const defaultLogger = new StructuredLogger('service', 'env');
      expect(defaultLogger.logLevel).to.equal('INFO');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = StructuredLogger.generateRequestId();
      const id2 = StructuredLogger.generateRequestId();

      expect(id1).to.not.equal(id2);
    });

    it('should generate string IDs', () => {
      const id = StructuredLogger.generateRequestId();
      expect(id).to.be.a('string');
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test message');

      expect(consoleLogStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('INFO');
      expect(loggedData.message).to.equal('Test message');
    });

    it('should include metadata', () => {
      logger.info('Test', { key: 'value' });

      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.key).to.equal('value');
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Error occurred');

      expect(consoleErrorStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleErrorStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('ERROR');
      expect(loggedData.message).to.equal('Error occurred');
    });

    it('should include error object', () => {
      const error = new Error('Test error');
      logger.error('Failed', {}, error);

      const loggedData = JSON.parse(consoleErrorStub.firstCall.args[0]);
      expect(loggedData.error).to.exist;
      expect(loggedData.error.message).to.equal('Test error');
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Warning message');

      expect(consoleWarnStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleWarnStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('WARN');
    });
  });

  describe('debug', () => {
    it('should log debug message when level is DEBUG', () => {
      const debugLogger = new StructuredLogger('service', 'env', 'DEBUG');
      debugLogger.debug('Debug message');

      expect(consoleLogStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('DEBUG');
    });

    it('should not log debug when level is INFO', () => {
      logger.debug('Debug message');

      expect(consoleLogStub).to.not.have.been.called;
    });
  });

  describe('shouldLog', () => {
    it('should allow INFO when level is INFO', () => {
      const result = logger.shouldLog('INFO');
      expect(result).to.be.true;
    });

    it('should not allow DEBUG when level is INFO', () => {
      const result = logger.shouldLog('DEBUG');
      expect(result).to.be.false;
    });

    it('should allow ERROR when level is INFO', () => {
      const result = logger.shouldLog('ERROR');
      expect(result).to.be.true;
    });
  });

  describe('createLogEntry', () => {
    it('should create structured log entry', () => {
      const entry = logger.createLogEntry('INFO', 'Test', { key: 'value' });

      expect(entry).to.have.property('timestamp');
      expect(entry).to.have.property('level', 'INFO');
      expect(entry).to.have.property('message', 'Test');
      expect(entry).to.have.property('service', 'test-service');
      expect(entry).to.have.property('requestId');
      expect(entry.key).to.equal('value');
    });

    it('should include environment', () => {
      const entry = logger.createLogEntry('INFO', 'Test');

      expect(entry.environment).to.equal('test-env');
    });
  });

  describe('forRequest', () => {
    it('should create logger for request', () => {
      const request = {
        headers: { get: sinon.stub().returns('test-ray') },
      };
      const env = { ENVIRONMENT: 'test', LOG_LEVEL: 'INFO' };
      const ctx = { waitUntil: sinon.stub() };

      const requestLogger = StructuredLogger.forRequest('service', request, env, ctx);

      expect(requestLogger).to.be.instanceOf(StructuredLogger);
      expect(requestLogger.serviceName).to.equal('service');
    });
  });
});
