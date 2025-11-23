import { expect } from 'chai';
import { setPriceSchema, batchPricesSchema } from '../../src/schemas/price.schemas.js';

describe('Price Schemas', () => {
  describe('setPriceSchema', () => {
    it('should validate valid price data', () => {
      const validData = {
        product_id: 'prod-123',
        price: 99.99,
        currency: 'INR',
      };

      const { error, value } = setPriceSchema.validate(validData);
      expect(error).to.be.undefined;
      expect(value).to.deep.equal(validData);
    });

    it('should require product_id', () => {
      const invalidData = {
        price: 50.0,
        currency: 'USD',
      };

      const { error } = setPriceSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('product_id');
    });

    it('should require price', () => {
      const invalidData = {
        product_id: 'prod-456',
        currency: 'EUR',
      };

      const { error } = setPriceSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('price');
    });

    it('should reject negative price', () => {
      const invalidData = {
        product_id: 'prod-789',
        price: -10.5,
        currency: 'USD',
      };

      const { error } = setPriceSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('positive');
    });

    it('should reject zero price', () => {
      const invalidData = {
        product_id: 'prod-000',
        price: 0,
        currency: 'INR',
      };

      const { error } = setPriceSchema.validate(invalidData);
      expect(error).to.exist;
    });

    it('should default currency to INR', () => {
      const dataWithoutCurrency = {
        product_id: 'prod-default',
        price: 1000,
      };

      const { error, value } = setPriceSchema.validate(dataWithoutCurrency);
      expect(error).to.be.undefined;
      expect(value.currency).to.equal('INR');
    });

    it('should require currency to be 3 characters', () => {
      const invalidData = {
        product_id: 'prod-123',
        price: 100,
        currency: 'US',
      };

      const { error } = setPriceSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('3');
    });

    it('should convert currency to uppercase', () => {
      const dataWithLowercase = {
        product_id: 'prod-123',
        price: 100,
        currency: 'usd',
      };

      const { error, value } = setPriceSchema.validate(dataWithLowercase);
      expect(error).to.be.undefined;
      expect(value.currency).to.equal('USD');
    });
  });

  describe('batchPricesSchema', () => {
    it('should validate valid batch request', () => {
      const validData = {
        product_ids: ['prod-1', 'prod-2', 'prod-3'],
      };

      const { error, value } = batchPricesSchema.validate(validData);
      expect(error).to.be.undefined;
      expect(value).to.deep.equal(validData);
    });

    it('should require product_ids', () => {
      const invalidData = {};

      const { error } = batchPricesSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('product_ids');
    });

    it('should require at least one product_id', () => {
      const invalidData = {
        product_ids: [],
      };

      const { error } = batchPricesSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('1');
    });

    it('should reject more than 100 product_ids', () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => `prod-${i}`);
      const invalidData = {
        product_ids: tooMany,
      };

      const { error } = batchPricesSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('100');
    });

    it('should accept exactly 100 product_ids', () => {
      const exactly100 = Array.from({ length: 100 }, (_, i) => `prod-${i}`);
      const validData = {
        product_ids: exactly100,
      };

      const { error } = batchPricesSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should require product_ids to be an array', () => {
      const invalidData = {
        product_ids: 'prod-1',
      };

      const { error } = batchPricesSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('array');
    });

    it('should require product_ids to be strings', () => {
      const invalidData = {
        product_ids: [123, 456, 789],
      };

      const { error } = batchPricesSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('string');
    });
  });
});
