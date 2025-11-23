// test/utils/helpers.test.js
import { expect } from 'chai';
import {
  generateId,
  successResponse,
  errorResponse,
  callService,
} from '../../src/utils/helpers.js';
import sinon from 'sinon';

describe('Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate unique ID', () => {
      const id = generateId();
      expect(id).to.be.a('string').and.include('-');
    });

    it('should generate unique IDs', () => {
      const ids = [generateId(), generateId(), generateId()];
      expect(new Set(ids).size).to.equal(3);
    });
  });

  describe('successResponse', () => {
    it('should create success response', () => {
      const result = successResponse({ test: 'data' });
      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ test: 'data' });
    });

    it('should include message', () => {
      const result = successResponse({}, 'Test message');
      expect(result.message).to.equal('Test message');
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const result = errorResponse('Error');
      expect(result.success).to.be.false;
      expect(result.error.message).to.equal('Error');
      expect(result.error.statusCode).to.equal(500);
    });

    it('should include custom status code', () => {
      const result = errorResponse('Bad Request', 400);
      expect(result.error.statusCode).to.equal(400);
    });
  });

  describe('callService', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should call service successfully', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ success: true, data: { test: 'result' } }),
      });

      const result = await callService('http://test', '/api/test', 'POST', { input: 'data' });

      expect(result.success).to.be.true;
      expect(fetchStub.calledOnce).to.be.true;
    });

    it('should handle service errors', async () => {
      fetchStub.resolves({
        ok: false,
        json: async () => ({ error: { message: 'Service error' } }),
      });

      try {
        await callService('http://test', '/api/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Service error');
      }
    });
  });
});
