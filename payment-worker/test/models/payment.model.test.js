// test/models/payment.model.test.js
import { expect } from 'chai';
import { PaymentModel } from '../../src/models/payment.model.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('Payment Model', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    mockEnv.DB._reset();
  });

  describe('create', () => {
    it('should create a new payment record', async () => {
      const paymentId = 'pay-123';
      const orderId = 'order-456';
      const userId = 'user-789';
      const amount = 99.99;
      const currency = 'USD';

      const payment = await PaymentModel.create(
        mockEnv.DB,
        paymentId,
        orderId,
        userId,
        amount,
        currency
      );

      expect(payment).to.not.be.null;
      expect(payment.id).to.equal(paymentId);
      expect(payment.order_id).to.equal(orderId);
      expect(payment.user_id).to.equal(userId);
      expect(payment.amount).to.equal(amount);
      expect(payment.currency).to.equal(currency);
      expect(payment.status).to.equal('initiated');
    });

    it('should default currency to USD', async () => {
      const payment = await PaymentModel.create(
        mockEnv.DB,
        'pay-test',
        'order-test',
        'user-test',
        50.0
      );

      expect(payment.currency).to.equal('USD');
    });
  });

  describe('getById', () => {
    it('should retrieve payment by ID', async () => {
      const paymentId = 'pay-123';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');

      const payment = await PaymentModel.getById(mockEnv.DB, paymentId);

      expect(payment).to.not.be.null;
      expect(payment.id).to.equal(paymentId);
    });

    it('should return null for non-existent payment', async () => {
      const payment = await PaymentModel.getById(mockEnv.DB, 'non-existent');
      expect(payment).to.be.null;
    });

    it('should parse transaction_metadata JSON', async () => {
      const paymentId = 'pay-meta';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');

      // Simulate storing metadata
      const metadata = { capture_id: 'cap-123', status: 'COMPLETED' };
      await PaymentModel.storeCaptureDetails(
        mockEnv.DB,
        paymentId,
        'cap-123',
        'encrypted',
        'email-hash',
        'id-hash',
        metadata
      );

      const payment = await PaymentModel.getById(mockEnv.DB, paymentId);
      expect(payment.transaction_metadata).to.deep.equal(metadata);
    });
  });

  describe('getByOrderId', () => {
    it('should retrieve payment by order ID', async () => {
      const orderId = 'order-123';
      await PaymentModel.create(mockEnv.DB, 'pay-1', orderId, 'user-1', 100, 'USD');

      const payment = await PaymentModel.getByOrderId(mockEnv.DB, orderId);

      expect(payment).to.not.be.null;
      expect(payment.order_id).to.equal(orderId);
    });

    it('should return null for non-existent order', async () => {
      const payment = await PaymentModel.getByOrderId(mockEnv.DB, 'non-existent');
      expect(payment).to.be.null;
    });
  });

  describe('getByPayPalOrderId', () => {
    it('should retrieve payment by PayPal order ID', async () => {
      const paymentId = 'pay-123';
      const paypalOrderId = 'PP-ORDER-123';

      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');
      await PaymentModel.updatePayPalOrderId(mockEnv.DB, paymentId, paypalOrderId);

      const payment = await PaymentModel.getByPayPalOrderId(mockEnv.DB, paypalOrderId);

      expect(payment).to.not.be.null;
      expect(payment.paypal_order_id).to.equal(paypalOrderId);
    });

    it('should return null for non-existent PayPal order', async () => {
      const payment = await PaymentModel.getByPayPalOrderId(mockEnv.DB, 'non-existent');
      expect(payment).to.be.null;
    });
  });

  describe('updatePayPalOrderId', () => {
    it('should update PayPal order ID', async () => {
      const paymentId = 'pay-123';
      const paypalOrderId = 'PP-ORDER-456';

      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');
      const updated = await PaymentModel.updatePayPalOrderId(mockEnv.DB, paymentId, paypalOrderId);

      expect(updated.paypal_order_id).to.equal(paypalOrderId);
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      const paymentId = 'pay-123';

      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');
      const updated = await PaymentModel.updateStatus(mockEnv.DB, paymentId, 'captured');

      expect(updated.status).to.equal('captured');
    });
  });

  describe('storeCaptureDetails', () => {
    it('should store capture details', async () => {
      const paymentId = 'pay-123';
      const captureId = 'cap-456';
      const metadata = { capture_id: captureId, status: 'COMPLETED' };

      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');

      const updated = await PaymentModel.storeCaptureDetails(
        mockEnv.DB,
        paymentId,
        captureId,
        'encrypted-response',
        'email-hash',
        'id-hash',
        metadata
      );

      expect(updated.paypal_capture_id).to.equal(captureId);
      expect(updated.status).to.equal('captured');
      expect(updated.encrypted_response).to.equal('encrypted-response');
      expect(updated.payer_email_hash).to.equal('email-hash');
      expect(updated.payer_id_hash).to.equal('id-hash');
      expect(updated.transaction_metadata).to.deep.equal(metadata);
      expect(updated.completed_at).to.not.be.null;
    });
  });

  describe('storeFailureDetails', () => {
    it('should store failure details', async () => {
      const paymentId = 'pay-123';

      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');

      const updated = await PaymentModel.storeFailureDetails(
        mockEnv.DB,
        paymentId,
        'CAPTURE_FAILED',
        'Payment capture failed'
      );

      expect(updated.status).to.equal('failed');
      expect(updated.error_code).to.equal('CAPTURE_FAILED');
      expect(updated.error_message).to.equal('Payment capture failed');
    });
  });

  describe('getByUserId', () => {
    it('should retrieve payments by user ID', async () => {
      const userId = 'user-123';

      await PaymentModel.create(mockEnv.DB, 'pay-1', 'order-1', userId, 100, 'USD');
      await PaymentModel.create(mockEnv.DB, 'pay-2', 'order-2', userId, 200, 'USD');
      await PaymentModel.create(mockEnv.DB, 'pay-3', 'order-3', 'other-user', 300, 'USD');

      const payments = await PaymentModel.getByUserId(mockEnv.DB, userId);

      expect(payments).to.have.length(2);
      expect(payments.every(p => p.user_id === userId)).to.be.true;
    });

    it('should respect limit parameter', async () => {
      const userId = 'user-123';

      for (let i = 0; i < 10; i++) {
        await PaymentModel.create(mockEnv.DB, `pay-${i}`, `order-${i}`, userId, 100, 'USD');
      }

      const payments = await PaymentModel.getByUserId(mockEnv.DB, userId, 5);

      expect(payments).to.have.length.at.most(5);
    });

    it('should return empty array for user with no payments', async () => {
      const payments = await PaymentModel.getByUserId(mockEnv.DB, 'no-payments-user');
      expect(payments).to.be.an('array').that.is.empty;
    });
  });
});
