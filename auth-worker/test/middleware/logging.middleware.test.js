import { expect } from 'chai';
import sinon from 'sinon';
import { createLoggingMiddleware, getLogger } from '../../src/middleware/logging.middleware.js';

describe('Logging Middleware', () => {
  let mockEnv;
  let mockCtx;

  beforeEach(() => {
    mockEnv = {
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'INFO',
      LOGS_BUCKET: null,
    };

    mockCtx = {
      waitUntil: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createLoggingMiddleware', () => {
    it('should return a middleware function', () => {
      const middleware = createLoggingMiddleware('test-service');

      expect(middleware).to.be.a('function');
      expect(middleware.length).to.equal(4); // request, env, ctx, next
    });

    it('should be named function', () => {
      const middleware = createLoggingMiddleware('auth-service');

      expect(middleware).to.be.a('function');
    });
  });

  describe('getLogger', () => {
    it('should retrieve logger from request', () => {
      const mockLogger = { info: sinon.stub(), error: sinon.stub() };
      const request = { logger: mockLogger };

      const logger = getLogger(request);

      expect(logger).to.equal(mockLogger);
    });

    it('should return null if no logger attached', () => {
      const request = {};

      const logger = getLogger(request);

      expect(logger).to.be.null;
    });

    it('should return null for requests without logger property', () => {
      const request = { headers: {}, method: 'GET' };

      const logger = getLogger(request);

      expect(logger).to.be.null;
    });
  });
});
