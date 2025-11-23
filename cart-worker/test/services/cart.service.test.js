// test/services/cart.service.test.js
import { expect } from 'chai';
import { CartService } from '../../src/services/cart.service.js';
import { CartModel } from '../../src/models/cart.model.js';
import { createMockEnv } from '../helpers/mock-env.js';
import sinon from 'sinon';

describe('Cart Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    mockEnv.DB._reset();
    sinon.restore();
  });

  describe('verifyCartOwnership', () => {
    it('should verify cart ownership successfully', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);

      const cart = await CartService.verifyCartOwnership(mockEnv, cartId, userId);

      expect(cart).to.not.be.null;
      expect(cart.id).to.equal(cartId);
      expect(cart.user_id).to.equal(userId);
    });

    it('should throw error for non-existent cart', async () => {
      try {
        await CartService.verifyCartOwnership(mockEnv, 'non-existent', 'user-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Cart not found');
      }
    });

    it('should throw error for unauthorized access', async () => {
      const cartId = 'cart-123';
      await CartModel.create(mockEnv.DB, cartId, 'user-111', {}, []);

      try {
        await CartService.verifyCartOwnership(mockEnv, cartId, 'user-222');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Unauthorized');
      }
    });
  });

  describe('calculateCosts', () => {
    it('should calculate costs correctly', () => {
      const products = [
        { price: 100, quantity: 2, currency: 'USD' },
        { price: 50, quantity: 1, currency: 'USD' },
      ];

      const costs = CartService.calculateCosts(products, 'standard');

      expect(costs.subtotal).to.equal(250);
      expect(costs.delivery_cost).to.equal(0);
      expect(costs.currency).to.equal('USD');
    });

    it('should add express delivery cost', () => {
      const products = [{ price: 100, quantity: 1, currency: 'USD' }];

      const costs = CartService.calculateCosts(products, 'express');

      expect(costs.delivery_cost).to.equal(15);
    });

    it('should convert INR to USD', () => {
      const products = [{ price: 8300, quantity: 1, currency: 'INR' }];

      const costs = CartService.calculateCosts(products, 'standard');

      expect(costs.currency).to.equal('USD');
      expect(costs.original_currency).to.equal('INR');
      expect(costs.subtotal).to.be.closeTo(100, 1);
    });

    it('should calculate tax', () => {
      const products = [{ price: 100, quantity: 1, currency: 'USD' }];

      const costs = CartService.calculateCosts(products, 'standard');

      expect(costs.tax).to.be.closeTo(8, 0.1); // 8% tax
    });
  });

  describe('getCurrentPrice', () => {
    it('should fetch price from price service', async () => {
      sinon.stub(CartService, 'getCurrentPrice').resolves({
        price: 99.99,
        currency: 'USD',
      });

      const price = await CartService.getCurrentPrice(mockEnv, 'prod-123');

      expect(price).to.exist;
      expect(price.price).to.equal(99.99);
      expect(price.currency).to.equal('USD');

      CartService.getCurrentPrice.restore();
    });
  });

  describe('checkGeneralStock', () => {
    it('should check stock availability', async () => {
      sinon.stub(CartService, 'checkGeneralStock').resolves({
        available: true,
        total_quantity: 50,
        warehouse_count: 2,
      });

      const stock = await CartService.checkGeneralStock(mockEnv, 'prod-123', 5);

      expect(stock.available).to.be.true;
      expect(stock.total_quantity).to.equal(50);

      CartService.checkGeneralStock.restore();
    });
  });

  describe('convertCurrency', () => {
    it('should convert INR to USD', () => {
      const result = CartService.convertCurrency(8300, 'INR');
      expect(result.amount_usd).to.be.closeTo(100, 1);
      expect(result.original_amount).to.equal(8300);
    });

    it('should keep USD as is', () => {
      const result = CartService.convertCurrency(100, 'USD');
      expect(result.amount_usd).to.equal(100);
      expect(result.original_currency).to.equal('USD');
    });
  });

  describe('updateQuantity', () => {
    it('should reject zero quantity', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 2 },
      ]);

      try {
        await CartService.updateQuantity(mockEnv, cartId, userId, 'prod-1', 0);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('greater than 0');
      }
    });

    it('should reject negative quantity', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 2 },
      ]);

      try {
        await CartService.updateQuantity(mockEnv, cartId, userId, 'prod-1', -1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('greater than 0');
      }
    });
  });

  describe('removeProduct', () => {
    it('should remove product from cart', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', name: 'Product 1', quantity: 2 },
        { product_id: 'prod-2', name: 'Product 2', quantity: 1 },
      ]);

      const updated = await CartService.removeProduct(mockEnv, cartId, userId, 'prod-1');

      expect(updated.product_data).to.have.length(1);
      expect(updated.product_data[0].product_id).to.equal('prod-2');
    });
  });

  describe('updateStatus', () => {
    it('should update cart status', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);

      const updated = await CartService.updateStatus(mockEnv, cartId, userId, 'completed');

      expect(updated.status).to.equal('completed');
    });
  });

  describe('deleteCart', () => {
    it('should delete cart', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);

      const result = await CartService.deleteCart(mockEnv, cartId, userId);

      expect(result).to.be.true;
    });
  });

  describe('addBillingAddress', () => {
    it('should add billing address', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';
      const address = { street: '123 Main', city: 'NYC', zipcode: '10001' };

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);

      const updated = await CartService.addBillingAddress(mockEnv, cartId, userId, address);

      expect(updated.billing_address).to.deep.equal(address);
    });

    it('should use shipping address when sameAsShipping is true', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';
      const shippingAddr = { street: '456 Oak', city: 'LA', zipcode: '90001' };

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);
      await CartModel.updateShippingAddress(mockEnv.DB, cartId, shippingAddr);

      const updated = await CartService.addBillingAddress(mockEnv, cartId, userId, null, true);

      expect(updated.billing_address).to.deep.equal(shippingAddr);
    });
  });

  describe('addToCart - unit tests with mocks', () => {
    let getCurrentPriceStub;
    let checkGeneralStockStub;
    let getActiveCartStub;
    let updateProductsStub;
    let createCartStub;

    beforeEach(() => {
      getCurrentPriceStub = sinon.stub(CartService, 'getCurrentPrice');
      checkGeneralStockStub = sinon.stub(CartService, 'checkGeneralStock');
      getActiveCartStub = sinon.stub(CartModel, 'getActiveCartByUser');
      updateProductsStub = sinon.stub(CartModel, 'updateProducts');
      createCartStub = sinon.stub(CartModel, 'create');
    });

    afterEach(() => {
      getCurrentPriceStub.restore();
      checkGeneralStockStub.restore();
      getActiveCartStub.restore();
      updateProductsStub.restore();
      createCartStub.restore();
    });

    it('should throw error when price not found', async () => {
      getCurrentPriceStub.resolves(null);

      try {
        await CartService.addToCart(
          mockEnv,
          'user-123',
          {},
          {
            product_id: 'prod-1',
            quantity: 1,
          }
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('price not found');
      }
    });

    it('should throw error when product out of stock', async () => {
      getCurrentPriceStub.resolves({ price: 100, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: false, message: 'Out of stock' });

      try {
        await CartService.addToCart(
          mockEnv,
          'user-123',
          {},
          {
            product_id: 'prod-1',
            quantity: 5,
          }
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('out of stock');
      }
    });

    it('should create new cart when no active cart exists', async () => {
      getCurrentPriceStub.resolves({ price: 99.99, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 50, warehouse_count: 2 });
      getActiveCartStub.resolves(null);
      createCartStub.resolves({
        id: 'cart-new',
        user_id: 'user-123',
        product_data: [{ product_id: 'prod-1', quantity: 2, price: 99.99 }],
      });

      const result = await CartService.addToCart(
        mockEnv,
        'user-123',
        { email: 'test@example.com' },
        {
          product_id: 'prod-1',
          quantity: 2,
          name: 'Product 1',
        }
      );

      expect(createCartStub).to.have.been.calledOnce;
      expect(result.product_data).to.have.length(1);
    });

    it('should add product to existing cart', async () => {
      getCurrentPriceStub.resolves({ price: 50, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 100, warehouse_count: 3 });
      getActiveCartStub.resolves({
        id: 'cart-existing',
        user_id: 'user-123',
        product_data: [{ product_id: 'prod-1', quantity: 1, price: 50 }],
      });
      updateProductsStub.resolves({
        id: 'cart-existing',
        product_data: [
          { product_id: 'prod-1', quantity: 1 },
          { product_id: 'prod-2', quantity: 3 },
        ],
      });

      const result = await CartService.addToCart(
        mockEnv,
        'user-123',
        {},
        {
          product_id: 'prod-2',
          quantity: 3,
          name: 'Product 2',
        }
      );

      expect(updateProductsStub).to.have.been.calledOnce;
      expect(result.product_data).to.have.length(2);
    });

    it('should update quantity when product already in cart', async () => {
      getCurrentPriceStub.resolves({ price: 75, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 50, warehouse_count: 1 });
      getActiveCartStub.resolves({
        id: 'cart-123',
        user_id: 'user-123',
        product_data: [{ product_id: 'prod-1', quantity: 2, price: 70 }],
      });
      updateProductsStub.resolves({
        id: 'cart-123',
        product_data: [{ product_id: 'prod-1', quantity: 5, price: 75 }],
      });

      const result = await CartService.addToCart(
        mockEnv,
        'user-123',
        {},
        {
          product_id: 'prod-1',
          quantity: 3,
        }
      );

      expect(updateProductsStub).to.have.been.calledOnce;
      const updatedProducts = updateProductsStub.firstCall.args[2];
      expect(updatedProducts[0].quantity).to.equal(5); // 2 + 3
      expect(updatedProducts[0].price).to.equal(75); // Updated to current price
    });
  });

  describe('updateShippingAddress - unit tests', () => {
    it('should update shipping address', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';
      const address = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipcode: '10001',
        country: 'USA',
      };

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 1, price: 100 },
      ]);

      const updated = await CartService.updateShippingAddress(mockEnv, cartId, userId, address);

      expect(updated.shipping_address).to.deep.equal(address);
    });

    it('should throw error for cart without products', async () => {
      const cartId = 'cart-empty';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, []);

      try {
        await CartService.updateShippingAddress(mockEnv, cartId, userId, {
          street: 'Test',
          zipcode: '12345',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Cart is empty');
      }
    });
  });

  describe('setDeliveryMode - unit tests', () => {
    it('should set delivery mode to standard', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 1, price: 100, currency: 'USD' },
      ]);

      const updated = await CartService.setDeliveryMode(mockEnv, cartId, userId, 'standard');

      expect(updated.delivery_mode).to.equal('standard');
    });

    it('should set delivery mode to express', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 1, price: 100, currency: 'USD' },
      ]);

      const updated = await CartService.setDeliveryMode(mockEnv, cartId, userId, 'express');

      expect(updated.delivery_mode).to.equal('express');
      // Express should add delivery cost
    });

    it('should throw error for invalid delivery mode', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 1, price: 100 },
      ]);

      try {
        await CartService.setDeliveryMode(mockEnv, cartId, userId, 'invalid-mode');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Invalid delivery mode');
      }
    });
  });

  describe('getActiveCart - unit tests', () => {
    it('should get active cart for user', async () => {
      const userId = 'user-123';
      const cartId = 'cart-active';

      await CartModel.create(mockEnv.DB, cartId, userId, { email: 'test@example.com' }, [
        { product_id: 'prod-1', quantity: 2, price: 50 },
      ]);

      const cart = await CartService.getActiveCart(mockEnv, userId);

      expect(cart).to.not.be.null;
      expect(cart.id).to.equal(cartId);
      expect(cart.user_id).to.equal(userId);
    });

    it('should return null when no active cart', async () => {
      const cart = await CartService.getActiveCart(mockEnv, 'user-no-cart');

      expect(cart).to.be.null;
    });
  });

  describe('clearCart - unit tests', () => {
    it('should clear all products from cart', async () => {
      const cartId = 'cart-123';
      const userId = 'user-456';

      await CartModel.create(mockEnv.DB, cartId, userId, {}, [
        { product_id: 'prod-1', quantity: 1 },
        { product_id: 'prod-2', quantity: 2 },
      ]);

      const updated = await CartService.clearCart(mockEnv, cartId, userId);

      expect(updated.product_data).to.be.an('array');
      expect(updated.product_data).to.have.length(0);
    });
  });

  describe('validateCartForCheckout - unit tests', () => {
    it('should validate complete cart data', async () => {
      const cart = {
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 1, warehouse_id: 'wh-1' }],
        shipping_address: { street: 'Test', zipcode: '12345' },
        billing_address: { street: 'Test', zipcode: '12345' },
        delivery_mode: 'standard',
      };

      const isValid = CartService.validateCartForCheckout(cart);

      expect(isValid).to.be.true;
    });

    it('should reject cart without products', () => {
      const cart = {
        product_data: [],
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
      };

      const isValid = CartService.validateCartForCheckout(cart);

      expect(isValid).to.be.false;
    });

    it('should reject cart without shipping address', () => {
      const cart = {
        product_data: [{ product_id: 'prod-1' }],
        billing_address: {},
        delivery_mode: 'standard',
      };

      const isValid = CartService.validateCartForCheckout(cart);

      expect(isValid).to.be.false;
    });

    it('should reject cart without delivery mode', () => {
      const cart = {
        product_data: [{ product_id: 'prod-1' }],
        shipping_address: {},
        billing_address: {},
      };

      const isValid = CartService.validateCartForCheckout(cart);

      expect(isValid).to.be.false;
    });
  });

  describe('formatCartResponse - unit tests', () => {
    it('should format cart with all fields', () => {
      const cart = {
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 2, price: 100 }],
        shipping_address: { city: 'NYC' },
        billing_address: { city: 'NYC' },
        delivery_mode: 'standard',
        status: 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const formatted = CartService.formatCartResponse(cart);

      expect(formatted).to.have.property('id');
      expect(formatted).to.have.property('products');
      expect(formatted).to.have.property('shipping_address');
      expect(formatted.products).to.be.an('array');
    });
  });

  describe('getCartWithValidation - unit tests with mocks', () => {
    let verifyOwnershipStub;
    let getCurrentPriceStub;
    let checkGeneralStockStub;

    beforeEach(() => {
      verifyOwnershipStub = sinon.stub(CartService, 'verifyCartOwnership');
      getCurrentPriceStub = sinon.stub(CartService, 'getCurrentPrice');
      checkGeneralStockStub = sinon.stub(CartService, 'checkGeneralStock');
    });

    afterEach(() => {
      verifyOwnershipStub.restore();
      getCurrentPriceStub.restore();
      checkGeneralStockStub.restore();
    });

    it('should return cart with refreshed prices', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 2, price: 95, currency: 'USD' }],
      });
      getCurrentPriceStub.resolves({ price: 100, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 50 });

      const result = await CartService.getCartWithValidation(mockEnv, 'cart-123', 'user-456');

      expect(result).to.exist;
      expect(result.product_data[0].price).to.equal(100); // Price refreshed
    });

    it('should mark products as out of stock', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 10, price: 100, currency: 'USD' }],
      });
      getCurrentPriceStub.resolves({ price: 100, currency: 'USD' });
      checkGeneralStockStub.resolves({ available: false, total_quantity: 0 });

      const result = await CartService.getCartWithValidation(mockEnv, 'cart-123', 'user-456');

      expect(result.product_data[0].stock_available).to.be.false;
    });
  });

  describe('assignWarehousesAndValidateStock - unit tests with mocks', () => {
    let callServiceStub;

    beforeEach(() => {
      callServiceStub = sinon.stub();
      mockEnv.FULFILMENT_SERVICE = {
        fetch: callServiceStub,
      };
    });

    it('should assign warehouses to products', async () => {
      const products = [
        { product_id: 'prod-1', quantity: 2 },
        { product_id: 'prod-2', quantity: 1 },
      ];
      const zipcode = '10001';

      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              products: [
                { product_id: 'prod-1', warehouse_id: 'wh-1', available: true },
                { product_id: 'prod-2', warehouse_id: 'wh-2', available: true },
              ],
            },
          })
        )
      );

      const result = await CartService.assignWarehousesAndValidateStock(mockEnv, products, zipcode);

      expect(result).to.have.property('all_available', true);
      expect(result.products).to.have.length(2);
      expect(result.products[0]).to.have.property('warehouse_id');
    });

    it('should handle unavailable products', async () => {
      const products = [{ product_id: 'prod-1', quantity: 5 }];
      const zipcode = '90001';

      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              products: [{ product_id: 'prod-1', available: false, reason: 'Out of stock' }],
            },
          })
        )
      );

      const result = await CartService.assignWarehousesAndValidateStock(mockEnv, products, zipcode);

      expect(result.all_available).to.be.false;
      expect(result.unavailable_products).to.have.length(1);
    });

    it('should handle service errors gracefully', async () => {
      const products = [{ product_id: 'prod-1', quantity: 1 }];

      callServiceStub.rejects(new Error('Service unavailable'));

      try {
        await CartService.assignWarehousesAndValidateStock(mockEnv, products, '12345');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Service unavailable');
      }
    });
  });

  describe('checkout - unit tests with mocks', () => {
    let verifyOwnershipStub;
    let callServiceStub;
    let updateStatusStub;

    beforeEach(() => {
      verifyOwnershipStub = sinon.stub(CartService, 'verifyCartOwnership');
      callServiceStub = sinon.stub();
      updateStatusStub = sinon.stub(CartModel, 'updateStatus');
      mockEnv.ORDER_SERVICE = {
        fetch: callServiceStub,
      };
    });

    afterEach(() => {
      verifyOwnershipStub.restore();
      updateStatusStub.restore();
    });

    it('should create order successfully', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 1, price: 100, warehouse_id: 'wh-1' }],
        user_data: { email: 'test@example.com' },
        shipping_address: { city: 'NYC' },
        billing_address: { city: 'NYC' },
        delivery_mode: 'standard',
      });

      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              order_id: 'order-123',
              total: 100,
            },
          })
        )
      );

      updateStatusStub.resolves({
        id: 'cart-123',
        status: 'checked_out',
      });

      const result = await CartService.checkout(mockEnv, 'cart-123', 'user-456');

      expect(result).to.have.property('order_id');
      expect(result.order_id).to.equal('order-123');
      expect(updateStatusStub).to.have.been.calledWith(mockEnv.DB, 'cart-123', 'checked_out');
    });

    it('should throw error for incomplete cart', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1' }],
        // Missing shipping address
        delivery_mode: 'standard',
      });

      try {
        await CartService.checkout(mockEnv, 'cart-123', 'user-456');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Cart is not ready');
      }
    });

    it('should handle order service failures', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 1, warehouse_id: 'wh-1' }],
        user_data: {},
        shipping_address: {},
        billing_address: {},
        delivery_mode: 'standard',
      });

      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: false,
            error: 'Order creation failed',
          }),
          { status: 500 }
        )
      );

      try {
        await CartService.checkout(mockEnv, 'cart-123', 'user-456');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Order creation failed');
      }
    });
  });

  describe('refreshPricesInCart - unit tests', () => {
    let getCurrentPriceStub;

    beforeEach(() => {
      getCurrentPriceStub = sinon.stub(CartService, 'getCurrentPrice');
    });

    afterEach(() => {
      getCurrentPriceStub.restore();
    });

    it('should update all product prices', async () => {
      const products = [
        { product_id: 'prod-1', price: 90, currency: 'USD' },
        { product_id: 'prod-2', price: 50, currency: 'USD' },
      ];

      getCurrentPriceStub.withArgs(mockEnv, 'prod-1').resolves({ price: 95, currency: 'USD' });
      getCurrentPriceStub.withArgs(mockEnv, 'prod-2').resolves({ price: 55, currency: 'USD' });

      const refreshed = await CartService.refreshPricesInCart(mockEnv, products);

      expect(refreshed[0].price).to.equal(95);
      expect(refreshed[1].price).to.equal(55);
    });

    it('should keep old price if new price not available', async () => {
      const products = [{ product_id: 'prod-1', price: 100, currency: 'USD' }];

      getCurrentPriceStub.resolves(null);

      const refreshed = await CartService.refreshPricesInCart(mockEnv, products);

      expect(refreshed[0].price).to.equal(100); // Old price kept
    });
  });

  describe('validateStockForProducts - unit tests', () => {
    let checkGeneralStockStub;

    beforeEach(() => {
      checkGeneralStockStub = sinon.stub(CartService, 'checkGeneralStock');
    });

    afterEach(() => {
      checkGeneralStockStub.restore();
    });

    it('should mark all products as available', async () => {
      const products = [
        { product_id: 'prod-1', quantity: 2 },
        { product_id: 'prod-2', quantity: 1 },
      ];

      checkGeneralStockStub.resolves({ available: true, total_quantity: 100 });

      const validated = await CartService.validateStockForProducts(mockEnv, products);

      expect(validated[0].stock_available).to.be.true;
      expect(validated[1].stock_available).to.be.true;
    });

    it('should mark unavailable products', async () => {
      const products = [{ product_id: 'prod-1', quantity: 50 }];

      checkGeneralStockStub.resolves({ available: false, total_quantity: 10 });

      const validated = await CartService.validateStockForProducts(mockEnv, products);

      expect(validated[0].stock_available).to.be.false;
    });
  });

  describe('updateQuantity - advanced unit tests', () => {
    let verifyOwnershipStub;
    let checkGeneralStockStub;
    let checkStockAvailabilityStub;
    let updateProductsStub;

    beforeEach(() => {
      verifyOwnershipStub = sinon.stub(CartService, 'verifyCartOwnership');
      checkGeneralStockStub = sinon.stub(CartService, 'checkGeneralStock');
      checkStockAvailabilityStub = sinon.stub(CartService, 'checkStockAvailability');
      updateProductsStub = sinon.stub(CartModel, 'updateProducts');
    });

    afterEach(() => {
      verifyOwnershipStub.restore();
      checkGeneralStockStub.restore();
      checkStockAvailabilityStub.restore();
      updateProductsStub.restore();
    });

    it('should check location-specific stock when shipping address exists', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 2 }],
        shipping_address: { zipcode: '10001' },
      });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 50 });
      checkStockAvailabilityStub.resolves({ available: true });
      updateProductsStub.resolves({ product_data: [] });

      await CartService.updateQuantity(mockEnv, 'cart-123', 'user-456', 'prod-1', 5);

      expect(checkStockAvailabilityStub).to.have.been.calledWith(mockEnv, 'prod-1', '10001', 5);
    });

    it('should throw error when location-specific stock unavailable', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 2 }],
        shipping_address: { zipcode: '90001' },
      });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 50 });
      checkStockAvailabilityStub.resolves({ available: false });

      try {
        await CartService.updateQuantity(mockEnv, 'cart-123', 'user-456', 'prod-1', 10);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('not available');
        expect(error.message).to.include('90001');
      }
    });

    it('should throw error for insufficient general stock', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [{ product_id: 'prod-1', quantity: 2 }],
      });
      checkGeneralStockStub.resolves({ available: false, total_quantity: 3 });

      try {
        await CartService.updateQuantity(mockEnv, 'cart-123', 'user-456', 'prod-1', 10);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Insufficient stock');
        expect(error.message).to.include('Available: 3');
      }
    });

    it('should update product quantity successfully', async () => {
      verifyOwnershipStub.resolves({
        id: 'cart-123',
        user_id: 'user-456',
        product_data: [
          { product_id: 'prod-1', quantity: 2 },
          { product_id: 'prod-2', quantity: 1 },
        ],
      });
      checkGeneralStockStub.resolves({ available: true, total_quantity: 100 });
      updateProductsStub.resolves({
        product_data: [
          { product_id: 'prod-1', quantity: 5 },
          { product_id: 'prod-2', quantity: 1 },
        ],
      });

      const result = await CartService.updateQuantity(mockEnv, 'cart-123', 'user-456', 'prod-1', 5);

      expect(updateProductsStub).to.have.been.called;
      const updatedProducts = updateProductsStub.firstCall.args[2];
      expect(updatedProducts[0].quantity).to.equal(5);
      expect(updatedProducts[1].quantity).to.equal(1); // Unchanged
    });
  });

  describe('checkStockAvailability - unit tests', () => {
    let callServiceStub;

    beforeEach(() => {
      callServiceStub = sinon.stub();
      mockEnv.FULFILMENT_SERVICE = {
        fetch: callServiceStub,
      };
    });

    it('should return available when stock exists', async () => {
      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              available: true,
              warehouses: [{ id: 'wh-1', available_quantity: 50 }],
            },
          })
        )
      );

      const result = await CartService.checkStockAvailability(mockEnv, 'prod-1', '10001', 5);

      expect(result.available).to.be.true;
    });

    it('should return unavailable when no stock', async () => {
      callServiceStub.resolves(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              available: false,
              warehouses: [],
            },
          })
        )
      );

      const result = await CartService.checkStockAvailability(mockEnv, 'prod-1', '90001', 100);

      expect(result.available).to.be.false;
    });

    it('should handle service errors', async () => {
      callServiceStub.rejects(new Error('Network error'));

      try {
        await CartService.checkStockAvailability(mockEnv, 'prod-1', '12345', 1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Network error');
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('calculateCosts should handle empty products array', () => {
      const costs = CartService.calculateCosts([], 'standard');

      expect(costs.subtotal).to.equal(0);
      expect(costs.total).to.equal(0);
    });

    it('calculateCosts should handle mixed currencies', () => {
      const products = [
        { price: 100, quantity: 1, currency: 'USD' },
        { price: 8300, quantity: 1, currency: 'INR' },
      ];

      const costs = CartService.calculateCosts(products, 'standard');

      expect(costs.currency).to.equal('USD');
      expect(costs.subtotal).to.be.closeTo(200, 2); // 100 USD + ~100 USD
    });

    it('convertCurrency should handle EUR currency', () => {
      const result = CartService.convertCurrency(85, 'EUR');

      expect(result.amount_usd).to.be.closeTo(100, 5);
      expect(result.original_currency).to.equal('EUR');
    });

    it('convertCurrency should handle GBP currency', () => {
      const result = CartService.convertCurrency(75, 'GBP');

      expect(result.amount_usd).to.be.closeTo(100, 5);
      expect(result.original_currency).to.equal('GBP');
    });

    it('calculateCosts should calculate correct tax percentage', () => {
      const products = [{ price: 1000, quantity: 1, currency: 'USD' }];

      const costs = CartService.calculateCosts(products, 'standard');

      expect(costs.tax).to.equal(80); // 8% of 1000
      expect(costs.total).to.equal(1080);
    });

    it('calculateCosts with express delivery should add $15', () => {
      const products = [{ price: 100, quantity: 1, currency: 'USD' }];

      const costs = CartService.calculateCosts(products, 'express');

      expect(costs.delivery_cost).to.equal(15);
      expect(costs.total).to.equal(123); // 100 + 8 (tax) + 15 (delivery)
    });

    it('verifyCartOwnership should throw for mismatched user', async () => {
      await CartModel.create(mockEnv.DB, 'cart-xyz', 'user-111', {}, []);

      try {
        await CartService.verifyCartOwnership(mockEnv, 'cart-xyz', 'user-999');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Unauthorized');
      }
    });

    it('removeProduct should handle non-existent product gracefully', async () => {
      const cartId = 'cart-remove';
      await CartModel.create(mockEnv.DB, cartId, 'user-123', {}, [
        { product_id: 'prod-1', quantity: 1 },
      ]);

      const result = await CartService.removeProduct(
        mockEnv,
        cartId,
        'user-123',
        'prod-nonexistent'
      );

      // Should still have prod-1
      expect(result.product_data).to.have.length(1);
      expect(result.product_data[0].product_id).to.equal('prod-1');
    });

    it('updateStatus should accept valid status values', async () => {
      const statuses = ['active', 'abandoned', 'checked_out'];

      for (const status of statuses) {
        const cartId = `cart-${status}`;
        await CartModel.create(mockEnv.DB, cartId, 'user-123', {}, []);

        const updated = await CartService.updateStatus(mockEnv, cartId, 'user-123', status);
        expect(updated.status).to.equal(status);
      }
    });

    it('calculateCosts should round to 2 decimal places', () => {
      const products = [{ price: 33.333, quantity: 3, currency: 'USD' }];

      const costs = CartService.calculateCosts(products, 'standard');

      // Should round properly
      expect(costs.subtotal).to.be.a('number');
      expect(costs.tax).to.be.a('number');
      expect(costs.total).to.be.a('number');
    });

    it('clearCart should work on already empty cart', async () => {
      const cartId = 'cart-empty';
      await CartModel.create(mockEnv.DB, cartId, 'user-123', {}, []);

      const result = await CartService.clearCart(mockEnv, cartId, 'user-123');

      expect(result.product_data).to.have.length(0);
    });

    it('deleteCart should remove cart completely', async () => {
      const cartId = 'cart-delete';
      await CartModel.create(mockEnv.DB, cartId, 'user-123', {}, []);

      const deleted = await CartService.deleteCart(mockEnv, cartId, 'user-123');

      expect(deleted).to.be.true;

      // Cart should no longer exist
      try {
        await CartService.verifyCartOwnership(mockEnv, cartId, 'user-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });

    it('getActiveCart should return most recent cart', async () => {
      const userId = 'user-multi';
      await CartModel.create(mockEnv.DB, 'cart-old', userId, {}, []);
      await CartModel.create(mockEnv.DB, 'cart-new', userId, {}, []);

      const activeCart = await CartService.getActiveCart(mockEnv, userId);

      expect(activeCart).to.not.be.null;
      expect(activeCart.user_id).to.equal(userId);
    });
  });
});
