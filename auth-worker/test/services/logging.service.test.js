import { expect } from 'chai';
import sinon from 'sinon';
import { log } from '../../src/services/logging.service.js';

describe('LoggingService', () => {
  let consoleLogStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    consoleLogStub.restore();
  });

  describe('log', () => {
    it('should log a message with level', () => {
      log('INFO', 'Test message');

      expect(consoleLogStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('INFO');
      expect(loggedData.msg).to.equal('Test message');
    });

    it('should include timestamp', () => {
      const before = new Date().toISOString();
      log('DEBUG', 'Test');
      const after = new Date().toISOString();

      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.ts).to.be.a('string');
      expect(loggedData.ts).to.be.at.least(before.substring(0, 19));
      expect(loggedData.ts).to.be.at.most(after);
    });

    it('should include additional context', () => {
      const context = { userId: 'user-123', action: 'login' };
      log('INFO', 'User logged in', context);

      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.userId).to.equal('user-123');
      expect(loggedData.action).to.equal('login');
    });

    it('should work without context', () => {
      log('ERROR', 'An error occurred');

      expect(consoleLogStub).to.have.been.calledOnce;
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData.level).to.equal('ERROR');
      expect(loggedData.msg).to.equal('An error occurred');
    });

    it('should format as JSON', () => {
      log('WARN', 'Warning message', { code: 'W001' });

      const logArg = consoleLogStub.firstCall.args[0];
      expect(() => JSON.parse(logArg)).to.not.throw();
    });

    it('should handle different log levels', () => {
      const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

      levels.forEach((level, index) => {
        log(level, `Message ${index}`);
      });

      expect(consoleLogStub.callCount).to.equal(levels.length);

      levels.forEach((level, index) => {
        const loggedData = JSON.parse(consoleLogStub.getCall(index).args[0]);
        expect(loggedData.level).to.equal(level);
      });
    });

    it('should merge context with log entry', () => {
      log('INFO', 'Test', { key1: 'value1', key2: 'value2' });

      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0]);
      expect(loggedData).to.include({
        level: 'INFO',
        msg: 'Test',
        key1: 'value1',
        key2: 'value2',
      });
    });
  });
});
