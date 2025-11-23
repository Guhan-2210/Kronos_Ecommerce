// test/middleware/validate.middleware.test.js
import { expect } from 'chai';
import Joi from 'joi';
import { validateBody, validateQuery } from '../../src/middleware/validate.middleware.js';

describe('Validate Middleware', () => {
  describe('validateBody', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      tags: Joi.array().items(Joi.string()).optional(),
    });

    it('should validate correct body', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          name: 'Test Product',
          price: 100,
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData).to.not.be.null;
      expect(request.validatedData.name).to.equal('Test Product');
      expect(request.validatedData.price).to.equal(100);
    });

    it('should return error for invalid body', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          name: '',
          price: -5,
        }),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.success).to.be.false;
      expect(body.error.message).to.include('Validation failed');
    });

    it('should return error for missing required fields', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          name: 'Product',
        }),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });

    it('should handle optional fields', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          name: 'Product',
          price: 50,
          tags: ['tag1', 'tag2'],
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.tags).to.deep.equal(['tag1', 'tag2']);
    });

    it('should skip validation for multipart/form-data', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
    });

    it('should handle malformed JSON', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.error.message).to.include('Invalid JSON');
    });

    it('should provide validation details', async () => {
      const middleware = validateBody(testSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          name: 'Test',
          price: -10,
        }),
      };

      const response = await middleware(request, {}, {});
      const body = await response.json();

      expect(body.error.details).to.be.an('array');
      expect(body.error.details.length).to.be.greaterThan(0);
    });

    it('should handle nested object validation', async () => {
      const nestedSchema = Joi.object({
        product: Joi.object({
          name: Joi.string().required(),
          price: Joi.number().required(),
        }).required(),
      });

      const middleware = validateBody(nestedSchema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          product: {
            name: 'Watch',
            price: 500,
          },
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.product.name).to.equal('Watch');
    });
  });

  describe('validateQuery', () => {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
    });

    it('should validate query parameters', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test?page=2&limit=10&search=watch',
        validatedQuery: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedQuery).to.not.be.null;
      expect(request.validatedQuery.page).to.equal(2);
      expect(request.validatedQuery.limit).to.equal(10);
      expect(request.validatedQuery.search).to.equal('watch');
    });

    it('should handle empty query string', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test',
        validatedQuery: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedQuery).to.deep.equal({});
    });

    it('should return error for invalid query parameters', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test?page=0&limit=200',
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);

      const body = await response.json();
      expect(body.success).to.be.false;
    });

    it('should coerce string numbers to integers', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test?page=3&limit=20',
        validatedQuery: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(typeof request.validatedQuery.page).to.equal('number');
      expect(typeof request.validatedQuery.limit).to.equal('number');
    });

    it('should handle URL encoding', async () => {
      const middleware = validateQuery(querySchema);

      const searchTerm = 'luxury watch';
      const encoded = encodeURIComponent(searchTerm);
      const request = {
        url: `http://localhost/test?search=${encoded}`,
        validatedQuery: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedQuery.search).to.equal(searchTerm);
    });

    it('should provide validation details for query errors', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test?page=-1',
      };

      const response = await middleware(request, {}, {});
      const body = await response.json();

      expect(body.error.details).to.be.an('array');
      expect(body.error.details.length).to.be.greaterThan(0);
    });

    it('should handle query validation errors', async () => {
      const strictSchema = Joi.object({
        requiredParam: Joi.string().required(),
      });

      const middleware = validateQuery(strictSchema);

      const request = {
        url: 'http://localhost/test',
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });

    it('should handle multiple query parameters', async () => {
      const middleware = validateQuery(querySchema);

      const request = {
        url: 'http://localhost/test?page=1&limit=50&search=rolex',
        validatedQuery: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedQuery.page).to.equal(1);
      expect(request.validatedQuery.limit).to.equal(50);
      expect(request.validatedQuery.search).to.equal('rolex');
    });
  });

  describe('Error responses format', () => {
    it('should return consistent error format', async () => {
      const schema = Joi.object({
        required: Joi.string().required(),
      });

      const middleware = validateBody(schema);

      const request = {
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});
      const body = await response.json();

      expect(body).to.have.property('success');
      expect(body).to.have.property('error');
      expect(body.error).to.have.property('message');
      expect(body.error).to.have.property('statusCode');
      expect(body.error).to.have.property('details');
    });
  });
});
