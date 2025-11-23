// test/middleware/validate.middleware.test.js
import { expect } from 'chai';
import Joi from 'joi';
import { validateBody } from '../../src/middleware/validate.middleware.js';

describe('Validate Middleware', () => {
  describe('validateBody', () => {
    const testSchema = Joi.object({
      email: Joi.string().email({ tlds: false }).required(),
      password: Joi.string().min(8).required(),
      age: Joi.number().integer().min(0).optional(),
    });

    it('should validate and set validated property on valid input', async () => {
      const middleware = validateBody(testSchema);

      const validBody = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      const request = {
        json: async () => validBody,
        validated: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validated).to.deep.equal(validBody);
    });

    it('should return validation error for invalid input', async () => {
      const middleware = validateBody(testSchema);

      const invalidBody = {
        email: 'not-an-email',
        password: 'short',
      };

      const request = {
        json: async () => invalidBody,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.error).to.equal('ValidationError');
      expect(body.details).to.be.an('array');
      expect(body.details.length).to.be.greaterThan(0);
    });

    it('should return error for missing required fields', async () => {
      const middleware = validateBody(testSchema);

      const incompleteBody = {
        email: 'test@example.com',
        // missing password
      };

      const request = {
        json: async () => incompleteBody,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.error).to.equal('ValidationError');
    });

    it('should strip unknown fields', async () => {
      const middleware = validateBody(testSchema);

      const bodyWithExtra = {
        email: 'test@example.com',
        password: 'SecurePass123',
        extraField: 'should be removed',
        anotherExtra: 123,
      };

      const request = {
        json: async () => bodyWithExtra,
        validated: null,
      };

      await middleware(request, {}, {});

      expect(request.validated).to.not.have.property('extraField');
      expect(request.validated).to.not.have.property('anotherExtra');
      expect(request.validated).to.have.property('email');
      expect(request.validated).to.have.property('password');
    });

    it('should handle optional fields', async () => {
      const middleware = validateBody(testSchema);

      const bodyWithOptional = {
        email: 'test@example.com',
        password: 'SecurePass123',
        age: 25,
      };

      const request = {
        json: async () => bodyWithOptional,
        validated: null,
      };

      await middleware(request, {}, {});

      expect(request.validated.age).to.equal(25);
    });

    it('should handle malformed JSON', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      // The middleware catches all errors during json parsing and returns ValidationError or Invalid JSON
      expect(body.error).to.be.oneOf(['Invalid JSON', 'ValidationError']);
    });

    it('should handle empty body', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.error).to.equal('ValidationError');
    });

    it('should validate nested objects', async () => {
      const nestedSchema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email({ tlds: false }).required(),
        }).required(),
      });

      const middleware = validateBody(nestedSchema);

      const validBody = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const request = {
        json: async () => validBody,
        validated: null,
      };

      await middleware(request, {}, {});

      expect(request.validated).to.deep.equal(validBody);
    });

    it('should validate arrays', async () => {
      const arraySchema = Joi.object({
        tags: Joi.array().items(Joi.string()).required(),
      });

      const middleware = validateBody(arraySchema);

      const validBody = {
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const request = {
        json: async () => validBody,
        validated: null,
      };

      await middleware(request, {}, {});

      expect(request.validated.tags).to.deep.equal(validBody.tags);
    });

    it('should handle type coercion for numbers', async () => {
      const middleware = validateBody(testSchema);

      const bodyWithStringNumber = {
        email: 'test@example.com',
        password: 'SecurePass123',
        age: '30', // string instead of number
      };

      const request = {
        json: async () => bodyWithStringNumber,
        validated: null,
      };

      await middleware(request, {}, {});

      // Joi should coerce the string to number
      expect(request.validated.age).to.equal(30);
      expect(typeof request.validated.age).to.equal('number');
    });

    it('should return all validation errors when abortEarly is false', async () => {
      const strictSchema = Joi.object({
        field1: Joi.string().required(),
        field2: Joi.string().required(),
        field3: Joi.string().required(),
      });

      const middleware = validateBody(strictSchema);

      const emptyBody = {};

      const request = {
        json: async () => emptyBody,
      };

      const response = await middleware(request, {}, {});

      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.details).to.be.an('array');
      expect(body.details.length).to.equal(3); // All three fields are missing
    });
  });
});
