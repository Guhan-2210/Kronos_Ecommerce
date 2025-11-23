// test/utils/helpers.test.js
import { expect } from 'chai';
import { generateId, successResponse, errorResponse } from '../../src/utils/helpers.js';

describe('Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id = generateId();

      expect(id).to.be.a('string');
      expect(id.length).to.be.greaterThan(0);
      expect(id).to.include('-');
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).to.not.equal(id2);
      expect(id2).to.not.equal(id3);
      expect(id1).to.not.equal(id3);
    });

    it('should have timestamp component', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts.length).to.equal(2);
      expect(parts[0]).to.be.a('string');
      expect(parts[1]).to.be.a('string');
    });

    it('should generate IDs consistently', () => {
      const ids = Array.from({ length: 100 }, () => generateId());
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).to.equal(100);
    });
  });

  describe('successResponse', () => {
    it('should create success response', () => {
      const data = { price: 1000, currency: 'INR' };
      const result = successResponse(data);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(data);
    });

    it('should include message if provided', () => {
      const data = { price: 1000 };
      const message = 'Price updated successfully';
      const result = successResponse(data, message);

      expect(result.success).to.be.true;
      expect(result.message).to.equal(message);
      expect(result.data).to.deep.equal(data);
    });

    it('should include metadata', () => {
      const data = { price: 1000 };
      const meta = { cached: true, timestamp: Date.now() };
      const result = successResponse(data, null, meta);

      expect(result.success).to.be.true;
      expect(result.cached).to.equal(true);
      expect(result.timestamp).to.be.a('number');
    });

    it('should handle null message', () => {
      const data = { price: 500 };
      const result = successResponse(data, null);

      expect(result.success).to.be.true;
      expect(result.message).to.be.null;
      expect(result.data).to.deep.equal(data);
    });

    it('should handle empty data', () => {
      const result = successResponse({});

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({});
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const message = 'Price not found';
      const result = errorResponse(message);

      expect(result.success).to.be.false;
      expect(result.error.message).to.equal(message);
      expect(result.error.statusCode).to.equal(500);
    });

    it('should include custom status code', () => {
      const message = 'Invalid price format';
      const statusCode = 400;
      const result = errorResponse(message, statusCode);

      expect(result.success).to.be.false;
      expect(result.error.message).to.equal(message);
      expect(result.error.statusCode).to.equal(statusCode);
    });

    it('should include error details', () => {
      const message = 'Validation failed';
      const details = ['Price must be positive', 'Currency is required'];
      const result = errorResponse(message, 400, details);

      expect(result.success).to.be.false;
      expect(result.error.details).to.deep.equal(details);
    });

    it('should handle null details', () => {
      const message = 'Server error';
      const result = errorResponse(message, 500, null);

      expect(result.success).to.be.false;
      expect(result.error.details).to.be.null;
    });

    it('should use default status code', () => {
      const result = errorResponse('Error message');

      expect(result.error.statusCode).to.equal(500);
    });
  });

  describe('Response format consistency', () => {
    it('should have consistent success response format', () => {
      const result = successResponse({ test: 'data' });

      expect(result).to.have.property('success');
      expect(result).to.have.property('data');
      expect(result.success).to.be.a('boolean');
    });

    it('should have consistent error response format', () => {
      const result = errorResponse('Test error');

      expect(result).to.have.property('success');
      expect(result).to.have.property('error');
      expect(result.success).to.be.a('boolean');
      expect(result.error).to.have.property('message');
      expect(result.error).to.have.property('statusCode');
    });
  });
});
