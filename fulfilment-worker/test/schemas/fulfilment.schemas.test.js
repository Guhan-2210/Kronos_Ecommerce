import { expect } from 'chai';
import {
  checkStockSchema,
  batchStockSchema,
  deliveryOptionsSchema,
  reserveStockSchema,
} from '../../src/schemas/fulfilment.schemas.js';

describe('Fulfilment Schemas', () => {
  describe('checkStockSchema', () => {
    it('should validate valid stock check data', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
        quantity: 5,
      };

      const { error, value } = checkStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value).to.deep.equal(data);
    });

    it('should default quantity to 1 if not provided', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
      };

      const { error, value } = checkStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.quantity).to.equal(1);
    });

    it('should require product_id', () => {
      const data = {
        zipcode: '600002',
        quantity: 5,
      };

      const { error } = checkStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('product_id');
    });

    it('should require zipcode', () => {
      const data = {
        product_id: 'prod-123',
        quantity: 5,
      };

      const { error } = checkStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('zipcode');
    });

    it('should reject negative quantity', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
        quantity: -1,
      };

      const { error } = checkStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('quantity');
    });

    it('should reject zero quantity', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
        quantity: 0,
      };

      const { error } = checkStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should reject non-integer quantity', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
        quantity: 5.5,
      };

      const { error } = checkStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should accept large quantity values', () => {
      const data = {
        product_id: 'prod-123',
        zipcode: '600002',
        quantity: 1000,
      };

      const { error, value } = checkStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.quantity).to.equal(1000);
    });
  });

  describe('batchStockSchema', () => {
    it('should validate valid batch stock check', () => {
      const data = {
        items: [
          { product_id: 'prod-1', quantity: 5 },
          { product_id: 'prod-2', quantity: 10 },
        ],
        zipcode: '600002',
      };

      const { error, value } = batchStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(2);
    });

    it('should require items array', () => {
      const data = {
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('items');
    });

    it('should require zipcode', () => {
      const data = {
        items: [{ product_id: 'prod-1', quantity: 5 }],
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('zipcode');
    });

    it('should reject empty items array', () => {
      const data = {
        items: [],
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should reject items array with more than 50 items', () => {
      const items = Array(51)
        .fill(null)
        .map((_, i) => ({
          product_id: `prod-${i}`,
          quantity: 1,
        }));

      const data = {
        items,
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should accept exactly 50 items', () => {
      const items = Array(50)
        .fill(null)
        .map((_, i) => ({
          product_id: `prod-${i}`,
          quantity: 1,
        }));

      const data = {
        items,
        zipcode: '600002',
      };

      const { error, value } = batchStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(50);
    });

    it('should require product_id in each item', () => {
      const data = {
        items: [{ quantity: 5 }],
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.message).to.include('product_id');
    });

    it('should require quantity in each item', () => {
      const data = {
        items: [{ product_id: 'prod-1' }],
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.message).to.include('quantity');
    });

    it('should reject non-array items', () => {
      const data = {
        items: { product_id: 'prod-1', quantity: 5 },
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should validate quantity constraints in items', () => {
      const data = {
        items: [{ product_id: 'prod-1', quantity: -1 }],
        zipcode: '600002',
      };

      const { error } = batchStockSchema.validate(data);

      expect(error).to.exist;
    });
  });

  describe('deliveryOptionsSchema', () => {
    it('should validate valid delivery options request', () => {
      const data = {
        zipcode: '600002',
        items: [{ product_id: 'prod-1', quantity: 5 }],
      };

      const { error, value } = deliveryOptionsSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value).to.deep.equal(data);
    });

    it('should require zipcode', () => {
      const data = {
        items: [],
      };

      const { error } = deliveryOptionsSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('zipcode');
    });

    it('should default items to empty array', () => {
      const data = {
        zipcode: '600002',
      };

      const { error, value } = deliveryOptionsSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.deep.equal([]);
    });

    it('should accept empty items array', () => {
      const data = {
        zipcode: '600002',
        items: [],
      };

      const { error, value } = deliveryOptionsSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(0);
    });

    it('should validate items structure when provided', () => {
      const data = {
        zipcode: '600002',
        items: [
          { product_id: 'prod-1', quantity: 5 },
          { product_id: 'prod-2', quantity: 3 },
        ],
      };

      const { error, value } = deliveryOptionsSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(2);
    });

    it('should default quantity to 1 in items', () => {
      const data = {
        zipcode: '600002',
        items: [{ product_id: 'prod-1' }],
      };

      const { error, value } = deliveryOptionsSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items[0].quantity).to.equal(1);
    });

    it('should validate quantity constraints in items', () => {
      const data = {
        zipcode: '600002',
        items: [{ product_id: 'prod-1', quantity: 0 }],
      };

      const { error } = deliveryOptionsSchema.validate(data);

      expect(error).to.exist;
    });
  });

  describe('reserveStockSchema', () => {
    it('should validate valid reserve stock request', () => {
      const data = {
        items: [
          { product_id: 'prod-1', quantity: 5 },
          { product_id: 'prod-2', quantity: 3 },
        ],
        zipcode: '600002',
      };

      const { error, value } = reserveStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value).to.deep.equal(data);
    });

    it('should require items array', () => {
      const data = {
        zipcode: '600002',
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('items');
    });

    it('should require zipcode', () => {
      const data = {
        items: [{ product_id: 'prod-1', quantity: 5 }],
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.details[0].path).to.include('zipcode');
    });

    it('should reject empty items array', () => {
      const data = {
        items: [],
        zipcode: '600002',
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should require product_id in each item', () => {
      const data = {
        items: [{ quantity: 5 }],
        zipcode: '600002',
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.message).to.include('product_id');
    });

    it('should require quantity in each item', () => {
      const data = {
        items: [{ product_id: 'prod-1' }],
        zipcode: '600002',
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
      expect(error.message).to.include('quantity');
    });

    it('should validate quantity constraints', () => {
      const data = {
        items: [{ product_id: 'prod-1', quantity: -1 }],
        zipcode: '600002',
      };

      const { error } = reserveStockSchema.validate(data);

      expect(error).to.exist;
    });

    it('should accept single item reservation', () => {
      const data = {
        items: [{ product_id: 'prod-1', quantity: 1 }],
        zipcode: '600002',
      };

      const { error, value } = reserveStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(1);
    });

    it('should accept multiple items reservation', () => {
      const data = {
        items: [
          { product_id: 'prod-1', quantity: 5 },
          { product_id: 'prod-2', quantity: 10 },
          { product_id: 'prod-3', quantity: 2 },
        ],
        zipcode: '600002',
      };

      const { error, value } = reserveStockSchema.validate(data);

      expect(error).to.be.undefined;
      expect(value.items).to.have.lengthOf(3);
    });
  });
});
