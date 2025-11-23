import { expect } from 'chai';
import sinon from 'sinon';
import { InventoryReservationDOService } from '../../src/services/inventory-reservation-do.service.js';

describe('InventoryReservationDOService', () => {
  let env;
  let stubInstance;
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub();
    stubInstance = {
      fetch: fetchStub,
    };

    env = {
      INVENTORY_RESERVATIONS: {
        idFromName: sinon.stub().returns('mock-id'),
        get: sinon.stub().returns(stubInstance),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getStub', () => {
    it('should create DO stub with product and warehouse ID', () => {
      const stub = InventoryReservationDOService.getStub(env, 'prod-123', 'wh-456');

      expect(env.INVENTORY_RESERVATIONS.idFromName.calledWith('prod-123:wh-456')).to.be.true;
      expect(env.INVENTORY_RESERVATIONS.get.calledWith('mock-id')).to.be.true;
      expect(stub).to.equal(stubInstance);
    });

    it('should throw error if productId is missing', () => {
      expect(() => {
        InventoryReservationDOService.getStub(env, null, 'wh-456');
      }).to.throw('Invalid parameters for DO stub');
    });

    it('should throw error if warehouseId is missing', () => {
      expect(() => {
        InventoryReservationDOService.getStub(env, 'prod-123', null);
      }).to.throw('Invalid parameters for DO stub');
    });

    it('should create correct DO ID format', () => {
      InventoryReservationDOService.getStub(env, 'product-1', 'warehouse-2');

      expect(env.INVENTORY_RESERVATIONS.idFromName.firstCall.args[0]).to.equal(
        'product-1:warehouse-2'
      );
    });
  });

  describe('reserveStock', () => {
    it('should successfully reserve stock', async () => {
      const mockResponse = {
        success: true,
        expires_at: Date.now() + 600000,
        expires_in_ms: 600000,
        message: 'Reserved successfully',
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.reserveStock(
        env,
        'prod-123',
        'wh-456',
        'order-789',
        5,
        'user-001'
      );

      expect(result.success).to.be.true;
      expect(result.expires_at).to.exist;
      expect(fetchStub.calledOnce).to.be.true;

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('http://do/reserve');
      expect(options.method).to.equal('POST');

      const body = JSON.parse(options.body);
      expect(body).to.deep.include({
        orderId: 'order-789',
        quantity: 5,
        userId: 'user-001',
        productId: 'prod-123',
        warehouseId: 'wh-456',
      });
    });

    it('should handle reservation failure', async () => {
      const mockResponse = {
        success: false,
        reason: 'insufficient_stock',
        message: 'Not enough stock',
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.reserveStock(
        env,
        'prod-123',
        'wh-456',
        'order-789',
        100,
        'user-001'
      );

      expect(result.success).to.be.false;
      expect(result.reason).to.equal('insufficient_stock');
    });

    it('should handle network errors', async () => {
      fetchStub.rejects(new Error('Network error'));

      try {
        await InventoryReservationDOService.reserveStock(
          env,
          'prod-123',
          'wh-456',
          'order-789',
          5,
          'user-001'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });
  });

  describe('confirmReservation', () => {
    it('should successfully confirm reservation', async () => {
      const mockResponse = {
        success: true,
        quantity_committed: 5,
        remaining_stock: 95,
        message: 'Confirmed',
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.confirmReservation(
        env,
        'prod-123',
        'wh-456',
        'order-789'
      );

      expect(result.success).to.be.true;
      expect(result.quantity_committed).to.equal(5);
      expect(result.remaining_stock).to.equal(95);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('http://do/confirm');
      expect(options.method).to.equal('POST');

      const body = JSON.parse(options.body);
      expect(body).to.deep.include({
        orderId: 'order-789',
        productId: 'prod-123',
        warehouseId: 'wh-456',
      });
    });

    it('should handle confirmation failure', async () => {
      const mockResponse = {
        success: false,
        reason: 'reservation_not_found',
        message: 'Reservation expired or not found',
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.confirmReservation(
        env,
        'prod-123',
        'wh-456',
        'order-789'
      );

      expect(result.success).to.be.false;
      expect(result.reason).to.equal('reservation_not_found');
    });
  });

  describe('releaseReservation', () => {
    it('should successfully release reservation', async () => {
      const mockResponse = {
        success: true,
        message: 'Reservation released',
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.releaseReservation(
        env,
        'prod-123',
        'wh-456',
        'order-789'
      );

      expect(result.success).to.be.true;

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('http://do/release');
      expect(options.method).to.equal('POST');

      const body = JSON.parse(options.body);
      expect(body).to.deep.equal({
        orderId: 'order-789',
      });
    });

    it('should handle release errors', async () => {
      fetchStub.rejects(new Error('DO error'));

      try {
        await InventoryReservationDOService.releaseReservation(
          env,
          'prod-123',
          'wh-456',
          'order-789'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('DO error');
      }
    });
  });

  describe('checkStock', () => {
    it('should check stock availability', async () => {
      const mockResponse = {
        available: true,
        quantity: 50,
        reserved: 10,
        available_quantity: 40,
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.checkStock(env, 'prod-123', 'wh-456', 15);

      expect(result.available).to.be.true;
      expect(result.quantity).to.equal(50);
      expect(result.available_quantity).to.equal(40);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('http://do/check');

      const body = JSON.parse(options.body);
      expect(body).to.deep.include({
        quantity: 15,
        productId: 'prod-123',
        warehouseId: 'wh-456',
      });
    });

    it('should return unavailable when stock is insufficient', async () => {
      const mockResponse = {
        available: false,
        quantity: 5,
        reserved: 0,
        available_quantity: 5,
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.checkStock(env, 'prod-123', 'wh-456', 10);

      expect(result.available).to.be.false;
      expect(result.available_quantity).to.equal(5);
    });
  });

  describe('getInfo', () => {
    it('should retrieve reservation info', async () => {
      const mockResponse = {
        productId: 'prod-123',
        warehouseId: 'wh-456',
        totalStock: 100,
        reservations: [{ orderId: 'order-1', quantity: 5, expires_at: Date.now() + 300000 }],
        available: 95,
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      });

      const result = await InventoryReservationDOService.getInfo(env, 'prod-123', 'wh-456');

      expect(result.productId).to.equal('prod-123');
      expect(result.warehouseId).to.equal('wh-456');
      expect(result.totalStock).to.equal(100);
      expect(result.reservations).to.have.lengthOf(1);
      expect(result.available).to.equal(95);

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('http://do/info');
      expect(options.method).to.equal('GET');
    });

    it('should handle errors when getting info', async () => {
      fetchStub.rejects(new Error('Info fetch failed'));

      try {
        await InventoryReservationDOService.getInfo(env, 'prod-123', 'wh-456');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Info fetch failed');
      }
    });
  });
});
