import { expect } from 'chai';
import {
  addToCartSchema,
  updateQuantitySchema,
  removeItemSchema,
  shippingAddressSchema,
  billingAddressSchema,
  updateStatusSchema,
} from '../../src/schemas/cart.schemas.js';

describe('Cart Schemas', () => {
  describe('addToCartSchema', () => {
    it('should validate valid add to cart data', () => {
      const validData = {
        user_data: {
          email: 'user@example.com',
          name: 'John Doe',
          phone: '+1234567890',
        },
        product_id: 'prod-123',
        sku: 'SKU-123',
        name: 'Product Name',
        brand: 'Brand',
        image: 'https://example.com/image.jpg',
        quantity: 2,
        zipcode: '12345',
      };

      const { error } = addToCartSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should require user_data', () => {
      const invalidData = {
        product_id: 'prod-123',
        quantity: 1,
      };

      const { error } = addToCartSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('user_data');
    });

    it('should require product_id', () => {
      const invalidData = {
        user_data: { email: 'test@example.com' },
        quantity: 1,
      };

      const { error } = addToCartSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('product_id');
    });

    it('should require quantity', () => {
      const invalidData = {
        user_data: { email: 'test@example.com' },
        product_id: 'prod-123',
      };

      const { error } = addToCartSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('quantity');
    });

    it('should require quantity to be at least 1', () => {
      const invalidData = {
        user_data: { email: 'test@example.com' },
        product_id: 'prod-123',
        quantity: 0,
      };

      const { error } = addToCartSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('1');
    });

    it('should require valid email in user_data', () => {
      const invalidData = {
        user_data: { email: 'invalid-email' },
        product_id: 'prod-123',
        quantity: 1,
      };

      const { error } = addToCartSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('email');
    });

    it('should allow optional fields', () => {
      const minimalData = {
        user_data: { email: 'test@example.com' },
        product_id: 'prod-123',
        quantity: 1,
      };

      const { error } = addToCartSchema.validate(minimalData);
      expect(error).to.be.undefined;
    });
  });

  describe('updateQuantitySchema', () => {
    it('should validate valid update quantity data', () => {
      const validData = {
        product_id: 'prod-123',
        quantity: 5,
      };

      const { error } = updateQuantitySchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should require product_id', () => {
      const invalidData = {
        quantity: 3,
      };

      const { error } = updateQuantitySchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('product_id');
    });

    it('should require quantity', () => {
      const invalidData = {
        product_id: 'prod-123',
      };

      const { error } = updateQuantitySchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('quantity');
    });

    it('should allow quantity of 0', () => {
      const validData = {
        product_id: 'prod-123',
        quantity: 0,
      };

      const { error } = updateQuantitySchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject negative quantity', () => {
      const invalidData = {
        product_id: 'prod-123',
        quantity: -1,
      };

      const { error } = updateQuantitySchema.validate(invalidData);
      expect(error).to.exist;
    });
  });

  describe('removeItemSchema', () => {
    it('should validate valid remove item data', () => {
      const validData = {
        product_id: 'prod-123',
      };

      const { error } = removeItemSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should require product_id', () => {
      const invalidData = {};

      const { error } = removeItemSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('product_id');
    });
  });

  describe('shippingAddressSchema', () => {
    it('should validate valid shipping address', () => {
      const validData = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipcode: '10001',
        country: 'USA',
      };

      const { error } = shippingAddressSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should require all fields', () => {
      const fields = ['street', 'city', 'state', 'zipcode', 'country'];

      fields.forEach(field => {
        const invalidData = {
          street: '123 Main',
          city: 'City',
          state: 'ST',
          zipcode: '12345',
          country: 'US',
        };
        delete invalidData[field];

        const { error } = shippingAddressSchema.validate(invalidData);
        expect(error).to.exist;
        expect(error.details[0].message).to.include(field);
      });
    });
  });

  describe('billingAddressSchema', () => {
    it('should validate valid billing address', () => {
      const validData = {
        street: '456 Oak Ave',
        city: 'Boston',
        state: 'MA',
        zipcode: '02101',
        country: 'USA',
        same_as_shipping: false,
      };

      const { error } = billingAddressSchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should allow all fields to be optional', () => {
      const minimalData = {
        same_as_shipping: true,
      };

      const { error } = billingAddressSchema.validate(minimalData);
      expect(error).to.be.undefined;
    });

    it('should allow empty object', () => {
      const emptyData = {};

      const { error } = billingAddressSchema.validate(emptyData);
      expect(error).to.be.undefined;
    });
  });

  describe('updateStatusSchema', () => {
    it('should validate valid status', () => {
      const validStatuses = ['active', 'abandoned', 'checked_out'];

      validStatuses.forEach(status => {
        const data = { status };
        const { error } = updateStatusSchema.validate(data);
        expect(error).to.be.undefined;
      });
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'invalid_status',
      };

      const { error } = updateStatusSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('active');
    });

    it('should require status', () => {
      const invalidData = {};

      const { error } = updateStatusSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('status');
    });
  });
});
