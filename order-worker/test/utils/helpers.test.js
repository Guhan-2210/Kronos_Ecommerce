import { expect } from 'chai';
import {
  generateId,
  successResponse,
  errorResponse,
  calculateOrderTotals,
  validateOrderData,
} from '../../src/utils/helpers.js';

describe('Order Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
      expect(id1).to.include('-');
    });

    it('should generate IDs with timestamp and random components', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts).to.have.lengthOf(2);
      expect(parts[0]).to.have.length.greaterThan(0);
      expect(parts[1]).to.have.length.greaterThan(0);
    });

    it('should generate different IDs on subsequent calls', () => {
      const ids = Array(10)
        .fill(null)
        .map(() => generateId());
      const uniqueIds = [...new Set(ids)];

      expect(uniqueIds).to.have.lengthOf(10);
    });
  });

  describe('successResponse', () => {
    it('should create success response with data', () => {
      const data = { orderId: '123', status: 'pending' };
      const response = successResponse(data);

      expect(response).to.deep.equal({
        success: true,
        message: 'Success',
        data,
      });
    });

    it('should create success response with custom message', () => {
      const data = { orderId: '123' };
      const message = 'Order created successfully';
      const response = successResponse(data, message);

      expect(response).to.deep.equal({
        success: true,
        message,
        data,
      });
    });

    it('should default to "Success" message', () => {
      const response = successResponse({ test: 'data' });

      expect(response.message).to.equal('Success');
      expect(response.success).to.be.true;
    });

    it('should handle null data', () => {
      const response = successResponse(null, 'Operation completed');

      expect(response.success).to.be.true;
      expect(response.data).to.be.null;
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = successResponse(data, 'Orders retrieved');

      expect(response.success).to.be.true;
      expect(response.data).to.be.an('array');
      expect(response.data).to.have.lengthOf(2);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with message', () => {
      const message = 'Order not found';
      const response = errorResponse(message);

      expect(response).to.deep.equal({
        success: false,
        error: message,
        statusCode: 400,
      });
    });

    it('should create error response with custom status code', () => {
      const message = 'Unauthorized';
      const statusCode = 401;
      const response = errorResponse(message, statusCode);

      expect(response).to.deep.equal({
        success: false,
        error: message,
        statusCode,
      });
    });

    it('should include details when provided', () => {
      const message = 'Validation failed';
      const statusCode = 422;
      const details = { field: 'email', reason: 'invalid format' };
      const response = errorResponse(message, statusCode, details);

      expect(response).to.deep.include({
        success: false,
        error: message,
        statusCode,
        details,
      });
    });

    it('should default to 400 status code', () => {
      const response = errorResponse('Bad request');

      expect(response.statusCode).to.equal(400);
    });

    it('should not include details when not provided', () => {
      const response = errorResponse('Error message', 500);

      expect(response).to.not.have.property('details');
    });
  });

  describe('calculateOrderTotals', () => {
    it('should calculate totals correctly', () => {
      const products = [
        { price: 10.99, quantity: 2 },
        { price: 5.5, quantity: 1 },
      ];
      const deliveryCost = 3.99;
      const tax = 2.0;

      const totals = calculateOrderTotals(products, deliveryCost, tax);

      expect(totals).to.have.property('subtotal');
      expect(totals).to.have.property('delivery_cost');
      expect(totals).to.have.property('tax');
      expect(totals).to.have.property('total');

      expect(totals.subtotal).to.equal(27.48); // (10.99 * 2) + 5.50
      expect(totals.delivery_cost).to.equal(3.99);
      expect(totals.tax).to.equal(2.0);
      expect(totals.total).to.equal(33.47); // 27.48 + 3.99 + 2.00
    });

    it('should calculate tax as 8% of subtotal if not provided', () => {
      const products = [{ price: 100, quantity: 1 }];

      const totals = calculateOrderTotals(products, 0);

      expect(totals.subtotal).to.equal(100);
      expect(totals.tax).to.equal(8); // 8% of 100
      expect(totals.total).to.equal(108);
    });

    it('should handle zero delivery cost', () => {
      const products = [{ price: 20, quantity: 1 }];

      const totals = calculateOrderTotals(products, 0, 1.6);

      expect(totals.delivery_cost).to.equal(0);
      expect(totals.total).to.equal(21.6);
    });

    it('should handle multiple products', () => {
      const products = [
        { price: 15.0, quantity: 3 },
        { price: 8.5, quantity: 2 },
        { price: 25.99, quantity: 1 },
      ];

      const totals = calculateOrderTotals(products, 5.0);

      expect(totals.subtotal).to.equal(87.99); // (15*3) + (8.5*2) + 25.99
      expect(totals.delivery_cost).to.equal(5.0);
      // 8% of 87.99 = 7.0392, rounded to 7.04
      expect(totals.tax).to.be.closeTo(7.04, 0.01);
      expect(totals.total).to.be.closeTo(100.03, 0.01);
    });

    it('should round to 2 decimal places', () => {
      const products = [{ price: 10.999, quantity: 1 }];

      const totals = calculateOrderTotals(products, 0, 0.888);

      expect(totals.subtotal).to.equal(11);
      expect(totals.tax).to.equal(0.89);
      expect(totals.total).to.equal(11.89);
    });

    it('should handle single product', () => {
      const products = [{ price: 50, quantity: 1 }];

      const totals = calculateOrderTotals(products, 10, 5);

      expect(totals.subtotal).to.equal(50);
      expect(totals.delivery_cost).to.equal(10);
      expect(totals.tax).to.equal(5);
      expect(totals.total).to.equal(65);
    });

    it('should handle empty products array', () => {
      const products = [];

      const totals = calculateOrderTotals(products, 5, 0);

      expect(totals.subtotal).to.equal(0);
      expect(totals.delivery_cost).to.equal(5);
      expect(totals.tax).to.equal(0);
      expect(totals.total).to.equal(5);
    });

    it('should calculate default tax when zero tax is passed', () => {
      const products = [{ price: 50, quantity: 2 }];

      const totals = calculateOrderTotals(products, 0, 0);

      expect(totals.subtotal).to.equal(100);
      expect(totals.tax).to.equal(8); // 8% of 100
      expect(totals.total).to.equal(108);
    });
  });

  describe('validateOrderData', () => {
    it('should validate complete order data', () => {
      const orderData = {
        products: [{ id: '1', quantity: 1, price: 10 }],
        shipping_address: { street: '123 Main St' },
        billing_address: { street: '123 Main St' },
        delivery_mode: 'standard',
        costs: { total: 10 },
      };

      expect(() => validateOrderData(orderData)).to.not.throw();
      expect(validateOrderData(orderData)).to.be.true;
    });

    it('should throw error if products is missing', () => {
      const orderData = {
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw('Missing required field: products');
    });

    it('should throw error if shipping_address is missing', () => {
      const orderData = {
        products: [{ id: '1' }],
        billing_address: {},
        delivery_mode: 'standard',
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw(
        'Missing required field: shipping_address'
      );
    });

    it('should throw error if billing_address is missing', () => {
      const orderData = {
        products: [{ id: '1' }],
        shipping_address: {},
        delivery_mode: 'standard',
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw(
        'Missing required field: billing_address'
      );
    });

    it('should throw error if delivery_mode is missing', () => {
      const orderData = {
        products: [{ id: '1' }],
        shipping_address: {},
        billing_address: {},
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw('Missing required field: delivery_mode');
    });

    it('should throw error if costs is missing', () => {
      const orderData = {
        products: [{ id: '1' }],
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
      };

      expect(() => validateOrderData(orderData)).to.throw('Missing required field: costs');
    });

    it('should throw error if products is not an array', () => {
      const orderData = {
        products: 'not an array',
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw(
        'Order must contain at least one product'
      );
    });

    it('should throw error if products array is empty', () => {
      const orderData = {
        products: [],
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.throw(
        'Order must contain at least one product'
      );
    });

    it('should validate order with multiple products', () => {
      const orderData = {
        products: [
          { id: '1', quantity: 1 },
          { id: '2', quantity: 2 },
          { id: '3', quantity: 1 },
        ],
        shipping_address: { street: '123 Main St' },
        billing_address: { street: '456 Oak Ave' },
        delivery_mode: 'express',
        costs: { subtotal: 100, tax: 8, total: 108 },
      };

      expect(() => validateOrderData(orderData)).to.not.throw();
      expect(validateOrderData(orderData)).to.be.true;
    });

    it('should validate with minimal valid data', () => {
      const orderData = {
        products: [{}], // At least one product
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard', // Must have a value
        costs: {},
      };

      expect(() => validateOrderData(orderData)).to.not.throw();
    });
  });
});
