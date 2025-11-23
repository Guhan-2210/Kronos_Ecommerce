import { expect } from 'chai';
import sinon from 'sinon';
import { createLoggingMiddleware, getLogger } from '../../src/middleware/logging.middleware.js';

describe('Logging Middleware', () => {
  describe('createLoggingMiddleware', () => {
    it('should return a middleware function', () => {
      const middleware = createLoggingMiddleware('cart-service');

      expect(middleware).to.be.a('function');
    });
  });

  describe('getLogger', () => {
    it('should retrieve logger from request', () => {
      const mockLogger = { info: sinon.stub() };
      const request = { logger: mockLogger };

      const logger = getLogger(request);

      expect(logger).to.equal(mockLogger);
    });

    it('should return null if no logger', () => {
      const request = {};

      const logger = getLogger(request);

      expect(logger).to.be.null;
    });
  });
});
