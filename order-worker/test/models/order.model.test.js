import { expect } from 'chai';
import sinon from 'sinon';
import { OrderModel } from '../../src/models/order.model.js';

describe('OrderModel', () => {
  let mockDb;
  let prepareStub;
  let bindStub;
  let runStub;
  let firstStub;
  let allStub;

  beforeEach(() => {
    // Create chainable stubs
    runStub = sinon.stub().resolves({ success: true });
    firstStub = sinon.stub();
    allStub = sinon.stub();
    bindStub = sinon.stub().returns({
      run: runStub,
      first: firstStub,
      all: allStub,
    });
    prepareStub = sinon.stub().returns({
      bind: bindStub,
    });

    mockDb = {
      prepare: prepareStub,
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Structure', () => {
    it('should have create method', () => {
      expect(OrderModel).to.have.property('create');
      expect(OrderModel.create).to.be.a('function');
    });

    it('should have getById method', () => {
      expect(OrderModel).to.have.property('getById');
      expect(OrderModel.getById).to.be.a('function');
    });

    it('should have getByUserId method', () => {
      expect(OrderModel).to.have.property('getByUserId');
      expect(OrderModel.getByUserId).to.be.a('function');
    });

    it('should have getByCartId method', () => {
      expect(OrderModel).to.have.property('getByCartId');
      expect(OrderModel.getByCartId).to.be.a('function');
    });

    it('should have updateStatus method', () => {
      expect(OrderModel).to.have.property('updateStatus');
      expect(OrderModel.updateStatus).to.be.a('function');
    });

    it('should have updatePaymentId method', () => {
      expect(OrderModel).to.have.property('updatePaymentId');
      expect(OrderModel.updatePaymentId).to.be.a('function');
    });

    it('should have softDelete method', () => {
      expect(OrderModel).to.have.property('softDelete');
      expect(OrderModel.softDelete).to.be.a('function');
    });

    it('should have updateOrderData method', () => {
      expect(OrderModel).to.have.property('updateOrderData');
      expect(OrderModel.updateOrderData).to.be.a('function');
    });
  });

  describe('Method Signatures', () => {
    it('create should accept required parameters', () => {
      expect(OrderModel.create.length).to.be.at.least(7);
    });

    it('getById should accept db and orderId', () => {
      expect(OrderModel.getById.length).to.equal(2);
    });

    it('getByUserId should accept db, userId, and optional pagination', () => {
      expect(OrderModel.getByUserId.length).to.be.at.least(2);
    });

    it('getByCartId should accept db and cartId', () => {
      expect(OrderModel.getByCartId.length).to.equal(2);
    });

    it('updateStatus should accept db, orderId, and status', () => {
      expect(OrderModel.updateStatus.length).to.equal(3);
    });

    it('updatePaymentId should accept db, orderId, and paymentId', () => {
      expect(OrderModel.updatePaymentId.length).to.equal(3);
    });

    it('softDelete should accept db and orderId', () => {
      expect(OrderModel.softDelete.length).to.equal(2);
    });

    it('updateOrderData should accept db, orderId, and orderData', () => {
      expect(OrderModel.updateOrderData.length).to.equal(3);
    });
  });

  describe('Behavioral Expectations', () => {
    it('all methods should be async or return promises', () => {
      // All OrderModel methods should be async
      const methods = [
        'create',
        'getById',
        'getByUserId',
        'getByCartId',
        'updateStatus',
        'updatePaymentId',
        'softDelete',
        'updateOrderData',
      ];

      methods.forEach(method => {
        expect(OrderModel[method]).to.be.a('function');
        expect(OrderModel[method].constructor.name).to.equal('AsyncFunction');
      });
    });
  });

  describe('create', () => {
    it('should create an order with all required fields', async () => {
      const orderData = { products: [{ id: 'p1', quantity: 2 }] };
      const userData = { name: 'John', email: 'john@example.com' };

      firstStub.resolves({
        id: 'order-123',
        user_id: 'user-1',
        cart_id: 'cart-1',
        order_data: JSON.stringify(orderData),
        user_data: JSON.stringify(userData),
        status: 'pending',
        total_amount: 100.5,
        currency: 'USD',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      const result = await OrderModel.create(
        mockDb,
        'order-123',
        'user-1',
        'cart-1',
        orderData,
        userData,
        100.5,
        'USD'
      );

      sinon.assert.calledTwice(prepareStub);
      sinon.assert.calledTwice(bindStub);
      sinon.assert.calledOnce(runStub);
      expect(result).to.have.property('id', 'order-123');
      expect(result.order_data).to.deep.equal(orderData);
      expect(result.user_data).to.deep.equal(userData);
    });

    it('should default currency to USD if not provided', async () => {
      const orderData = { products: [] };
      const userData = { name: 'Jane' };

      firstStub.resolves({
        id: 'order-456',
        user_id: 'user-2',
        cart_id: 'cart-2',
        order_data: JSON.stringify(orderData),
        user_data: JSON.stringify(userData),
        status: 'pending',
        total_amount: 50,
        currency: 'USD',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      await OrderModel.create(mockDb, 'order-456', 'user-2', 'cart-2', orderData, userData, 50);

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[7]).to.equal('USD'); // currency parameter
    });
  });

  describe('getById', () => {
    it('should return order when found', async () => {
      const orderData = { products: [{ id: 'p1' }] };
      const userData = { name: 'Test User' };

      firstStub.resolves({
        id: 'order-123',
        user_id: 'user-1',
        cart_id: 'cart-1',
        order_data: JSON.stringify(orderData),
        user_data: JSON.stringify(userData),
        status: 'pending',
        total_amount: 100,
        currency: 'USD',
      });

      const result = await OrderModel.getById(mockDb, 'order-123');

      expect(result).to.not.be.null;
      expect(result.id).to.equal('order-123');
      expect(result.order_data).to.deep.equal(orderData);
      expect(result.user_data).to.deep.equal(userData);
    });

    it('should return null when order not found', async () => {
      firstStub.resolves(null);

      const result = await OrderModel.getById(mockDb, 'nonexistent');

      expect(result).to.be.null;
    });

    it('should exclude soft-deleted orders', async () => {
      firstStub.resolves(null);

      await OrderModel.getById(mockDb, 'deleted-order');

      sinon.assert.calledOnce(prepareStub);
      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include('deleted_at IS NULL');
    });
  });

  describe('getByUserId', () => {
    it('should return orders for a user', async () => {
      const orders = [
        {
          id: 'order-1',
          user_id: 'user-123',
          order_data: JSON.stringify({ products: [] }),
          user_data: JSON.stringify({ name: 'User' }),
        },
        {
          id: 'order-2',
          user_id: 'user-123',
          order_data: JSON.stringify({ products: [] }),
          user_data: JSON.stringify({ name: 'User' }),
        },
      ];

      allStub.resolves({ results: orders });

      const result = await OrderModel.getByUserId(mockDb, 'user-123');

      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('order-1');
      expect(result[1].id).to.equal('order-2');
    });

    it('should use default pagination values', async () => {
      allStub.resolves({ results: [] });

      await OrderModel.getByUserId(mockDb, 'user-123');

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[1]).to.equal(50); // default limit
      expect(bindArgs[2]).to.equal(0); // default offset
    });

    it('should accept custom pagination', async () => {
      allStub.resolves({ results: [] });

      await OrderModel.getByUserId(mockDb, 'user-123', 20, 40);

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[1]).to.equal(20); // custom limit
      expect(bindArgs[2]).to.equal(40); // custom offset
    });
  });

  describe('getByCartId', () => {
    it('should return order when found by cart ID', async () => {
      const orderData = { products: [] };
      const userData = { name: 'Test' };

      firstStub.resolves({
        id: 'order-123',
        cart_id: 'cart-456',
        order_data: JSON.stringify(orderData),
        user_data: JSON.stringify(userData),
      });

      const result = await OrderModel.getByCartId(mockDb, 'cart-456');

      expect(result).to.not.be.null;
      expect(result.cart_id).to.equal('cart-456');
      expect(result.order_data).to.deep.equal(orderData);
    });

    it('should return null when cart not found', async () => {
      firstStub.resolves(null);

      const result = await OrderModel.getByCartId(mockDb, 'nonexistent-cart');

      expect(result).to.be.null;
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      firstStub.resolves({
        id: 'order-123',
        status: 'confirmed',
        order_data: JSON.stringify({}),
        user_data: JSON.stringify({}),
      });

      const result = await OrderModel.updateStatus(mockDb, 'order-123', 'confirmed');

      sinon.assert.calledOnce(runStub);
      expect(result.status).to.equal('confirmed');
    });

    it('should update the updated_at timestamp', async () => {
      firstStub.resolves({
        id: 'order-123',
        order_data: JSON.stringify({}),
        user_data: JSON.stringify({}),
      });

      await OrderModel.updateStatus(mockDb, 'order-123', 'cancelled');

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[0]).to.equal('cancelled');
      expect(bindArgs[1]).to.be.a('number'); // timestamp
    });
  });

  describe('updatePaymentId', () => {
    it('should update payment ID', async () => {
      firstStub.resolves({
        id: 'order-123',
        payment_id: 'pay-456',
        order_data: JSON.stringify({}),
        user_data: JSON.stringify({}),
      });

      const result = await OrderModel.updatePaymentId(mockDb, 'order-123', 'pay-456');

      sinon.assert.calledOnce(runStub);
      expect(result.payment_id).to.equal('pay-456');
    });
  });

  describe('softDelete', () => {
    it('should soft delete an order', async () => {
      const result = await OrderModel.softDelete(mockDb, 'order-123');

      sinon.assert.calledOnce(runStub);
      expect(result).to.be.true;
    });

    it('should set deleted_at timestamp', async () => {
      await OrderModel.softDelete(mockDb, 'order-123');

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[0]).to.be.a('number'); // deleted_at timestamp
      expect(bindArgs[1]).to.be.a('number'); // updated_at timestamp
      expect(bindArgs[2]).to.equal('order-123'); // order ID
    });
  });

  describe('updateOrderData', () => {
    it('should update order data', async () => {
      const newOrderData = { products: [{ id: 'new-product' }], updated: true };

      firstStub.resolves({
        id: 'order-123',
        order_data: JSON.stringify(newOrderData),
        user_data: JSON.stringify({}),
      });

      const result = await OrderModel.updateOrderData(mockDb, 'order-123', newOrderData);

      sinon.assert.calledOnce(runStub);
      expect(result.order_data).to.deep.equal(newOrderData);
    });

    it('should stringify order data before storing', async () => {
      const orderData = { key: 'value' };

      firstStub.resolves({
        id: 'order-123',
        order_data: JSON.stringify(orderData),
        user_data: JSON.stringify({}),
      });

      await OrderModel.updateOrderData(mockDb, 'order-123', orderData);

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[0]).to.equal(JSON.stringify(orderData));
    });
  });
});
