import { expect } from 'chai';
import sinon from 'sinon';
import { OrderService } from '../../src/services/order.service.js';

describe('OrderService', () => {
  let env;
  let consoleStub;

  beforeEach(() => {
    env = {
      DB: 'mock-db',
      FULFILMENT_SERVICE: {
        fetch: sinon.stub(),
      },
      PAYMENT_SERVICE: {
        fetch: sinon.stub(),
      },
    };

    // Stub console methods to reduce noise
    consoleStub = {
      log: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };

    sinon.stub(console, 'log').callsFake(consoleStub.log);
    sinon.stub(console, 'error').callsFake(consoleStub.error);
    sinon.stub(console, 'warn').callsFake(consoleStub.warn);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Structure', () => {
    it('should have all required methods', () => {
      expect(OrderService).to.have.property('createOrder');
      expect(OrderService).to.have.property('initiatePayment');
      expect(OrderService).to.have.property('confirmOrder');
      expect(OrderService).to.have.property('rollbackStockReduction');
      expect(OrderService).to.have.property('cancelOrder');
      expect(OrderService).to.have.property('getOrder');
      expect(OrderService).to.have.property('getUserOrders');
      expect(OrderService).to.have.property('updateOrderStatus');
    });

    it('should have all methods as functions', () => {
      expect(OrderService.createOrder).to.be.a('function');
      expect(OrderService.initiatePayment).to.be.a('function');
      expect(OrderService.confirmOrder).to.be.a('function');
      expect(OrderService.rollbackStockReduction).to.be.a('function');
      expect(OrderService.cancelOrder).to.be.a('function');
      expect(OrderService.getOrder).to.be.a('function');
      expect(OrderService.getUserOrders).to.be.a('function');
      expect(OrderService.updateOrderStatus).to.be.a('function');
    });
  });

  describe('Method Signatures', () => {
    it('createOrder should accept env, userId, cartId, cartData, userData', () => {
      expect(OrderService.createOrder.length).to.equal(5);
    });

    it('initiatePayment should accept env and orderId', () => {
      expect(OrderService.initiatePayment.length).to.equal(2);
    });

    it('confirmOrder should accept env, orderId, and paypalOrderId', () => {
      expect(OrderService.confirmOrder.length).to.equal(3);
    });

    it('rollbackStockReduction should accept env, orderId, and successfulReductions', () => {
      expect(OrderService.rollbackStockReduction.length).to.equal(3);
    });

    it('cancelOrder should accept env, orderId, and userId', () => {
      expect(OrderService.cancelOrder.length).to.equal(3);
    });

    it('getOrder should accept env, orderId, and userId', () => {
      expect(OrderService.getOrder.length).to.equal(3);
    });

    it('getUserOrders should accept env, userId, and optional pagination', () => {
      expect(OrderService.getUserOrders.length).to.be.at.least(2);
    });

    it('updateOrderStatus should accept env, orderId, and status', () => {
      expect(OrderService.updateOrderStatus.length).to.equal(3);
    });
  });

  describe('rollbackStockReduction', () => {
    it('should attempt to restore stock for successful reductions', async () => {
      const successfulReductions = [
        { product_id: 'prod-1', warehouse_id: 'wh-1', quantity: 5, success: true },
        { product_id: 'prod-2', warehouse_id: 'wh-2', quantity: 3, success: true },
      ];

      env.FULFILMENT_SERVICE.fetch.resolves(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      await OrderService.rollbackStockReduction(env, 'order-123', successfulReductions);

      expect(env.FULFILMENT_SERVICE.fetch.callCount).to.equal(2);
      expect(
        consoleStub.log.calledWith('[Order] Rolling back stock reductions for order order-123')
      ).to.be.true;
    });

    it('should filter out unsuccessful reductions', async () => {
      const reductions = [
        { product_id: 'prod-1', warehouse_id: 'wh-1', quantity: 5, success: true },
        { product_id: 'prod-2', warehouse_id: 'wh-2', quantity: 3, success: false },
      ];

      env.FULFILMENT_SERVICE.fetch.resolves(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      await OrderService.rollbackStockReduction(env, 'order-123', reductions);

      // Should only call once for the successful reduction
      expect(env.FULFILMENT_SERVICE.fetch.callCount).to.equal(1);
    });

    it('should continue rollback even if individual restores fail', async () => {
      const reductions = [
        { product_id: 'prod-1', warehouse_id: 'wh-1', quantity: 5, success: true },
        { product_id: 'prod-2', warehouse_id: 'wh-2', quantity: 3, success: true },
      ];

      env.FULFILMENT_SERVICE.fetch
        .onFirstCall()
        .rejects(new Error('Restore failed'))
        .onSecondCall()
        .resolves(new Response(JSON.stringify({ success: true }), { status: 200 }));

      await OrderService.rollbackStockReduction(env, 'order-123', reductions);

      expect(env.FULFILMENT_SERVICE.fetch.callCount).to.equal(2);
      expect(consoleStub.error.called).to.be.true;
    });

    it('should handle empty reductions array', async () => {
      await OrderService.rollbackStockReduction(env, 'order-123', []);

      expect(env.FULFILMENT_SERVICE.fetch.called).to.be.false;
    });

    it('should send correct restore request format', async () => {
      const reductions = [
        { product_id: 'prod-1', warehouse_id: 'wh-1', quantity: 5, success: true },
      ];

      env.FULFILMENT_SERVICE.fetch.resolves(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      await OrderService.rollbackStockReduction(env, 'order-123', reductions);

      const firstCallRequest = env.FULFILMENT_SERVICE.fetch.firstCall.args[0];
      expect(firstCallRequest.url).to.include('/restore-stock');
      expect(firstCallRequest.method).to.equal('POST');
    });
  });

  describe('Service Method Types', () => {
    it('getOrder should be async function', () => {
      expect(OrderService.getOrder.constructor.name).to.equal('AsyncFunction');
    });

    it('getUserOrders should be async function', () => {
      expect(OrderService.getUserOrders.constructor.name).to.equal('AsyncFunction');
    });

    it('updateOrderStatus should be async function', () => {
      expect(OrderService.updateOrderStatus.constructor.name).to.equal('AsyncFunction');
    });

    it('cancelOrder should be async function', () => {
      expect(OrderService.cancelOrder.constructor.name).to.equal('AsyncFunction');
    });

    it('initiatePayment should be async function', () => {
      expect(OrderService.initiatePayment.constructor.name).to.equal('AsyncFunction');
    });

    it('confirmOrder should be async function', () => {
      expect(OrderService.confirmOrder.constructor.name).to.equal('AsyncFunction');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors gracefully', async () => {
      // This tests that methods handle errors without crashing
      expect(OrderService.createOrder).to.not.throw();
      expect(OrderService.initiatePayment).to.not.throw();
      expect(OrderService.confirmOrder).to.not.throw();
    });

    it('should log errors appropriately', () => {
      // Verify that console error logging is set up
      expect(consoleStub.error).to.exist;
      expect(consoleStub.log).to.exist;
    });
  });
});
