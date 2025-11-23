// test/services/payment.service.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import { PaymentService } from '../../src/services/payment.service.js';
import { PaymentModel } from '../../src/models/payment.model.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('Payment Service', () => {
  let mockEnv;
  let fetchStub;

  beforeEach(() => {
    mockEnv = createMockEnv();
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    mockEnv.DB._reset();
    fetchStub.restore();
    sinon.restore();
  });

  describe('getPayPalAccessToken', () => {
    it('should get access token from PayPal', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      });

      const token = await PaymentService.getPayPalAccessToken(mockEnv);

      expect(token).to.equal('test-token');
      expect(fetchStub.calledOnce).to.be.true;
    });

    it('should throw error if PayPal API fails', async () => {
      fetchStub.resolves({
        ok: false,
        json: async () => ({ error: 'invalid_client' }),
      });

      try {
        await PaymentService.getPayPalAccessToken(mockEnv);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Failed to get PayPal access token');
      }
    });

    it('should use correct authorization header', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      });

      await PaymentService.getPayPalAccessToken(mockEnv);

      const call = fetchStub.getCall(0);
      const authHeader = call.args[1].headers['Authorization'];
      expect(authHeader).to.include('Basic ');
    });
  });

  describe('createPayPalOrder', () => {
    beforeEach(() => {
      // Mock access token call
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      });
    });

    it('should create PayPal order successfully', async () => {
      const mockPayPalOrder = {
        id: 'PP-ORDER-123',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
      };

      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockPayPalOrder,
      });

      const result = await PaymentService.createPayPalOrder(
        mockEnv,
        'order-123',
        99.99,
        'USD',
        'Test Order'
      );

      expect(result.id).to.equal('PP-ORDER-123');
      expect(result.status).to.equal('CREATED');
      expect(fetchStub.calledTwice).to.be.true;
    });

    it('should format amount to 2 decimal places', async () => {
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ id: 'PP-123', status: 'CREATED', links: [] }),
      });

      await PaymentService.createPayPalOrder(mockEnv, 'order-1', 100, 'USD');

      const call = fetchStub.getCall(1);
      const body = JSON.parse(call.args[1].body);
      expect(body.purchase_units[0].amount.value).to.equal('100.00');
    });

    it('should include reference_id in purchase units', async () => {
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ id: 'PP-123', status: 'CREATED', links: [] }),
      });

      const orderId = 'order-456';
      await PaymentService.createPayPalOrder(mockEnv, orderId, 100, 'USD');

      const call = fetchStub.getCall(1);
      const body = JSON.parse(call.args[1].body);
      expect(body.purchase_units[0].reference_id).to.equal(orderId);
    });

    it('should throw error if PayPal order creation fails', async () => {
      fetchStub.onSecondCall().resolves({
        ok: false,
        json: async () => ({ message: 'Invalid request' }),
      });

      try {
        await PaymentService.createPayPalOrder(mockEnv, 'order-1', 100, 'USD');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('PayPal order creation failed');
      }
    });
  });

  describe('capturePayPalPayment', () => {
    beforeEach(() => {
      // Mock access token call
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      });
    });

    it('should capture PayPal payment successfully', async () => {
      const mockCaptureResult = {
        id: 'PP-ORDER-123',
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAPTURE-123',
                  amount: { value: '99.99', currency_code: 'USD' },
                },
              ],
            },
          },
        ],
      };

      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockCaptureResult,
      });

      const result = await PaymentService.capturePayPalPayment(mockEnv, 'PP-ORDER-123');

      expect(result.status).to.equal('COMPLETED');
      expect(result.purchase_units[0].payments.captures[0].id).to.equal('CAPTURE-123');
    });

    it('should throw error if capture fails', async () => {
      fetchStub.onSecondCall().resolves({
        ok: false,
        json: async () => ({
          name: 'UNPROCESSABLE_ENTITY',
          details: [{ issue: 'ORDER_NOT_APPROVED', description: 'Order not approved' }],
        }),
      });

      try {
        await PaymentService.capturePayPalPayment(mockEnv, 'PP-ORDER-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('PayPal capture failed');
        expect(error.message).to.include('Order not approved');
      }
    });
  });

  describe('getPayPalOrderDetails', () => {
    beforeEach(() => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      });
    });

    it('should get PayPal order details', async () => {
      const mockOrderDetails = {
        id: 'PP-ORDER-123',
        status: 'APPROVED',
        purchase_units: [{ amount: { value: '99.99', currency_code: 'USD' } }],
      };

      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockOrderDetails,
      });

      const result = await PaymentService.getPayPalOrderDetails(mockEnv, 'PP-ORDER-123');

      expect(result.id).to.equal('PP-ORDER-123');
      expect(result.status).to.equal('APPROVED');
    });

    it('should throw error if order not found', async () => {
      fetchStub.onSecondCall().resolves({
        ok: false,
        json: async () => ({ message: 'Not found' }),
      });

      try {
        await PaymentService.getPayPalOrderDetails(mockEnv, 'INVALID');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Failed to get PayPal order');
      }
    });
  });

  describe('initiatePayment', () => {
    beforeEach(() => {
      // Mock getPayPalAccessToken
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      });

      // Mock createPayPalOrder
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({
          id: 'PP-ORDER-123',
          status: 'CREATED',
          links: [{ rel: 'approve', href: 'https://paypal.com/approve/PP-ORDER-123' }],
        }),
      });
    });

    it('should initiate payment successfully', async () => {
      const result = await PaymentService.initiatePayment(
        mockEnv,
        'order-456',
        'user-789',
        99.99,
        'USD'
      );

      expect(result.payment_id).to.include('pay-');
      expect(result.paypal_order_id).to.equal('PP-ORDER-123');
      expect(result.approval_url).to.include('https://paypal.com/approve');
      expect(result.status).to.equal('initiated');
    });

    it('should create payment record in database', async () => {
      const result = await PaymentService.initiatePayment(
        mockEnv,
        'order-456',
        'user-789',
        99.99,
        'USD'
      );

      const payment = await PaymentModel.getById(mockEnv.DB, result.payment_id);
      expect(payment).to.not.be.null;
      expect(payment.order_id).to.equal('order-456');
      expect(payment.user_id).to.equal('user-789');
    });
  });

  describe('verifyPayment', () => {
    it('should return verified for captured payment', async () => {
      const paymentId = 'pay-123';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');
      await PaymentModel.updateStatus(mockEnv.DB, paymentId, 'captured');

      const result = await PaymentService.verifyPayment(mockEnv, paymentId);

      expect(result.verified).to.be.true;
      expect(result.status).to.equal('captured');
    });

    it('should throw error for non-existent payment', async () => {
      try {
        await PaymentService.verifyPayment(mockEnv, 'non-existent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Payment not found');
      }
    });

    it('should return unverified for initiated payment without PayPal order', async () => {
      const paymentId = 'pay-123';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');

      const result = await PaymentService.verifyPayment(mockEnv, paymentId);

      expect(result.verified).to.be.false;
      expect(result.status).to.equal('initiated');
    });
  });

  describe('getPaymentDetails', () => {
    it('should get payment details', async () => {
      const paymentId = 'pay-123';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-456', 'user-789', 99.99, 'USD');

      const result = await PaymentService.getPaymentDetails(mockEnv, paymentId);

      expect(result.id).to.equal(paymentId);
      expect(result.order_id).to.equal('order-456');
      expect(result.user_id).to.equal('user-789');
      expect(result.amount).to.equal(99.99);
      expect(result.currency).to.equal('USD');
    });

    it('should not expose encrypted response', async () => {
      const paymentId = 'pay-123';
      await PaymentModel.create(mockEnv.DB, paymentId, 'order-1', 'user-1', 100, 'USD');
      await PaymentModel.storeCaptureDetails(
        mockEnv.DB,
        paymentId,
        'cap-123',
        'encrypted-data-here',
        'email-hash',
        'id-hash',
        {}
      );

      const result = await PaymentService.getPaymentDetails(mockEnv, paymentId);

      expect(result.encrypted_response).to.be.undefined;
    });

    it('should throw error for non-existent payment', async () => {
      try {
        await PaymentService.getPaymentDetails(mockEnv, 'non-existent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Payment not found');
      }
    });
  });
});
