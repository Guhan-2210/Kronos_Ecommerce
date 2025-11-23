// test/utils/helpers.test.js
import { expect } from 'chai';
import { generateId, successResponse, errorResponse } from '../../src/utils/helpers.js';

describe('Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate unique ID', () => {
      const id = generateId();
      expect(id).to.be.a('string');
      expect(id).to.include('-');
    });

    it('should generate different IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).to.not.equal(id2);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[0]);
      expect(timestamp).to.be.at.least(before);
      expect(timestamp).to.be.at.most(after);
    });
  });

  describe('successResponse', () => {
    it('should create success response', () => {
      const data = { test: 'data' };
      const result = successResponse(data);

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Success');
      expect(result.data).to.deep.equal(data);
    });

    it('should include custom message', () => {
      const result = successResponse({}, 'Custom message');
      expect(result.message).to.equal('Custom message');
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const result = errorResponse('Error message');

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error message');
      expect(result.statusCode).to.equal(400);
    });

    it('should include custom status code', () => {
      const result = errorResponse('Server error', 500);
      expect(result.statusCode).to.equal(500);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid' };
      const result = errorResponse('Validation error', 400, details);

      expect(result.details).to.deep.equal(details);
    });

    it('should not include details when not provided', () => {
      const result = errorResponse('Error');
      expect(result.details).to.be.undefined;
    });
  });
});
