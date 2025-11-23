// test/middleware/validate.middleware.test.js
import { expect } from 'chai';
import { validateBody } from '../../src/middleware/validate.middleware.js';
import Joi from 'joi';

describe('Validate Middleware', () => {
  describe('validateBody', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0),
    });

    it('should pass validation with valid body', async () => {
      const mockRequest = {
        json: async () => ({ name: 'John', age: 30 }),
      };
      const mockEnv = {};

      const result = await validateBody(schema)(mockRequest, mockEnv);

      expect(result).to.be.undefined;
    });

    it('should return error for missing required field', async () => {
      const mockRequest = {
        json: async () => ({ age: 25 }),
      };
      const mockEnv = {};

      const result = await validateBody(schema)(mockRequest, mockEnv);

      expect(result).to.be.instanceOf(Response);
      const json = await result.json();
      expect(json.success).to.be.false;
      expect(json.error.details).to.be.an('array');
    });

    it('should return error for invalid type', async () => {
      const mockRequest = {
        json: async () => ({ name: 'John', age: 'invalid' }),
      };
      const mockEnv = {};

      const result = await validateBody(schema)(mockRequest, mockEnv);

      expect(result).to.be.instanceOf(Response);
      const json = await result.json();
      expect(json.success).to.be.false;
    });

    it('should handle JSON parse errors', async () => {
      const mockRequest = {
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      };
      const mockEnv = {};

      const result = await validateBody(schema)(mockRequest, mockEnv);

      expect(result).to.be.instanceOf(Response);
      const json = await result.json();
      expect(json.error.message).to.include('Invalid JSON body');
    });

    it('should attach validated data to request', async () => {
      const mockRequest = {
        json: async () => ({ name: 'Alice', age: 25 }),
      };
      const mockEnv = {};

      await validateBody(schema)(mockRequest, mockEnv);

      expect(mockRequest.validatedData).to.deep.equal({ name: 'Alice', age: 25 });
    });
  });
});
