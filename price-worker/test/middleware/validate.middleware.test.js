// test/middleware/validate.middleware.test.js
import { expect } from 'chai';
import Joi from 'joi';
import { validateBody } from '../../src/middleware/validate.middleware.js';

describe('Validate Middleware', () => {
  describe('validateBody', () => {
    const priceSchema = Joi.object({
      productId: Joi.string().required(),
      price: Joi.number().min(0).required(),
      currency: Joi.string().length(3).optional(),
    });

    it('should validate correct body', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: 1000,
          currency: 'INR',
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData).to.not.be.null;
      expect(request.validatedData.productId).to.equal('product-123');
      expect(request.validatedData.price).to.equal(1000);
    });

    it('should return error for invalid body', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: '',
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
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
        }),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });

    it('should handle optional fields', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: 500,
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.currency).to.be.undefined;
    });

    it('should handle malformed JSON', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
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
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'test',
          price: -10,
        }),
      };

      const response = await middleware(request, {}, {});
      const body = await response.json();

      expect(body.error.details).to.be.an('array');
      expect(body.error.details.length).to.be.greaterThan(0);
    });

    it('should validate price boundaries', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: 0,
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.price).to.equal(0);
    });

    it('should validate currency length', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: 100,
          currency: 'INVALID',
        }),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });

    it('should accept valid currency codes', async () => {
      const middleware = validateBody(priceSchema);

      const validCurrencies = ['INR', 'USD', 'EUR', 'GBP'];

      for (const currency of validCurrencies) {
        const request = {
          json: async () => ({
            productId: 'product-123',
            price: 100,
            currency,
          }),
          validatedData: null,
        };

        const response = await middleware(request, {}, {});
        expect(response).to.be.undefined;
        expect(request.validatedData.currency).to.equal(currency);
      }
    });

    it('should handle nested validation', async () => {
      const nestedSchema = Joi.object({
        productId: Joi.string().required(),
        pricing: Joi.object({
          amount: Joi.number().required(),
          currency: Joi.string().required(),
        }).required(),
      });

      const middleware = validateBody(nestedSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          pricing: {
            amount: 1000,
            currency: 'INR',
          },
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.pricing.amount).to.equal(1000);
    });

    it('should handle type coercion', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: '500', // String instead of number
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(typeof request.validatedData.price).to.equal('number');
      expect(request.validatedData.price).to.equal(500);
    });

    it('should return all validation errors', async () => {
      const strictSchema = Joi.object({
        field1: Joi.string().required(),
        field2: Joi.number().required(),
        field3: Joi.string().required(),
      });

      const middleware = validateBody(strictSchema);

      const request = {
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});
      const body = await response.json();

      expect(body.error.details).to.be.an('array');
      expect(body.error.details.length).to.equal(3);
    });

    it('should handle empty body', async () => {
      const middleware = validateBody(priceSchema);

      const request = {
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });

    it('should handle null values correctly', async () => {
      const nullableSchema = Joi.object({
        productId: Joi.string().required(),
        price: Joi.number().allow(null).required(),
      });

      const middleware = validateBody(nullableSchema);

      const request = {
        json: async () => ({
          productId: 'product-123',
          price: null,
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.price).to.be.null;
    });
  });

  describe('Error response format', () => {
    it('should return consistent error format', async () => {
      const schema = Joi.object({
        required: Joi.string().required(),
      });

      const middleware = validateBody(schema);

      const request = {
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

    it('should include proper content-type header', async () => {
      const schema = Joi.object({
        field: Joi.string().required(),
      });

      const middleware = validateBody(schema);

      const request = {
        json: async () => ({}),
      };

      const response = await middleware(request, {}, {});

      expect(response.headers.get('Content-Type')).to.equal('application/json');
    });
  });

  describe('Complex validation scenarios', () => {
    it('should validate array of prices', async () => {
      const batchSchema = Joi.object({
        prices: Joi.array()
          .items(
            Joi.object({
              productId: Joi.string().required(),
              price: Joi.number().min(0).required(),
            })
          )
          .required(),
      });

      const middleware = validateBody(batchSchema);

      const request = {
        json: async () => ({
          prices: [
            { productId: 'p1', price: 100 },
            { productId: 'p2', price: 200 },
          ],
        }),
        validatedData: null,
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.undefined;
      expect(request.validatedData.prices.length).to.equal(2);
    });

    it('should handle conditional validation', async () => {
      const conditionalSchema = Joi.object({
        productId: Joi.string().required(),
        price: Joi.number().when('productId', {
          is: Joi.string().pattern(/^premium-/),
          then: Joi.number().min(1000),
          otherwise: Joi.number().min(0),
        }),
      });

      const middleware = validateBody(conditionalSchema);

      const request = {
        json: async () => ({
          productId: 'premium-watch',
          price: 500,
        }),
      };

      const response = await middleware(request, {}, {});

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(400);
    });
  });
});
