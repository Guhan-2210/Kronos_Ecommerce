import { expect } from 'chai';
import sinon from 'sinon';
import { FulfilmentService } from '../../src/services/fulfilment.service.js';

describe('FulfilmentService', () => {
  let env;

  beforeEach(() => {
    env = {
      DB: 'mock-db',
      INVENTORY_RESERVATIONS: 'mock-do-binding',
    };

    // Stub console methods
    sinon.stub(console, 'log');
    sinon.stub(console, 'error');
    sinon.stub(console, 'warn');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Structure', () => {
    it('should have all required methods', () => {
      expect(FulfilmentService).to.have.property('checkGeneralStockAvailability');
      expect(FulfilmentService).to.have.property('checkStockAvailability');
      expect(FulfilmentService).to.have.property('checkBatchStockAvailability');
      expect(FulfilmentService).to.have.property('getDeliveryOptions');
      expect(FulfilmentService).to.have.property('reserveStockForCart');
      expect(FulfilmentService).to.have.property('releaseReservations');
      expect(FulfilmentService).to.have.property('calculateEstimatedDays');
      expect(FulfilmentService).to.have.property('getDeliveryDescription');
      expect(FulfilmentService).to.have.property('reduceStock');
      expect(FulfilmentService).to.have.property('restoreStock');
    });

    it('should have all methods as functions', () => {
      expect(FulfilmentService.checkGeneralStockAvailability).to.be.a('function');
      expect(FulfilmentService.checkStockAvailability).to.be.a('function');
      expect(FulfilmentService.checkBatchStockAvailability).to.be.a('function');
      expect(FulfilmentService.getDeliveryOptions).to.be.a('function');
      expect(FulfilmentService.calculateEstimatedDays).to.be.a('function');
      expect(FulfilmentService.getDeliveryDescription).to.be.a('function');
    });
  });

  describe('calculateEstimatedDays', () => {
    it('should return 1-2 days for distance < 100km', () => {
      const days = FulfilmentService.calculateEstimatedDays(50);
      expect(days).to.deep.equal({ min: 1, max: 2 });
    });

    it('should return 2-3 days for distance < 500km', () => {
      const days = FulfilmentService.calculateEstimatedDays(300);
      expect(days).to.deep.equal({ min: 2, max: 3 });
    });

    it('should return 3-5 days for distance < 1000km', () => {
      const days = FulfilmentService.calculateEstimatedDays(750);
      expect(days).to.deep.equal({ min: 3, max: 5 });
    });

    it('should return 5-7 days for distance >= 1000km', () => {
      const days = FulfilmentService.calculateEstimatedDays(1500);
      expect(days).to.deep.equal({ min: 5, max: 7 });
    });

    it('should handle edge cases', () => {
      expect(FulfilmentService.calculateEstimatedDays(99)).to.deep.equal({ min: 1, max: 2 });
      expect(FulfilmentService.calculateEstimatedDays(100)).to.deep.equal({ min: 2, max: 3 });
      expect(FulfilmentService.calculateEstimatedDays(500)).to.deep.equal({ min: 3, max: 5 });
      expect(FulfilmentService.calculateEstimatedDays(1000)).to.deep.equal({ min: 5, max: 7 });
    });

    it('should handle zero distance', () => {
      const days = FulfilmentService.calculateEstimatedDays(0);
      expect(days).to.deep.equal({ min: 1, max: 2 });
    });

    it('should handle very large distances', () => {
      const days = FulfilmentService.calculateEstimatedDays(5000);
      expect(days).to.deep.equal({ min: 5, max: 7 });
    });
  });

  describe('getDeliveryDescription', () => {
    it('should return express delivery description with cost and distance', () => {
      const desc = FulfilmentService.getDeliveryDescription(
        'express',
        { min_days: 2, max_days: 3 },
        500,
        10
      );
      expect(desc).to.equal('Express delivery in 2-3 business days (~10 km) - ₹500');
    });

    it('should return standard delivery description with FREE', () => {
      const desc = FulfilmentService.getDeliveryDescription(
        'standard',
        { min_days: 5, max_days: 7 },
        0,
        50
      );
      expect(desc).to.equal('Standard delivery in 5-7 business days (~50 km) - FREE');
    });

    it('should handle delivery description without distance', () => {
      const desc = FulfilmentService.getDeliveryDescription(
        'economy',
        { min_days: 7, max_days: 10 },
        0,
        null
      );
      expect(desc).to.equal('Standard delivery in 7-10 business days - FREE');
    });

    it('should handle different day ranges', () => {
      const desc1 = FulfilmentService.getDeliveryDescription('express', {
        min_days: 1,
        max_days: 2,
      });
      expect(desc1).to.include('1-2 business days');

      const desc2 = FulfilmentService.getDeliveryDescription('standard', {
        min_days: 3,
        max_days: 5,
      });
      expect(desc2).to.include('3-5 business days');
    });

    it('should always include FREE for non-express modes', () => {
      const modes = ['standard', 'economy', 'regular', 'normal'];
      modes.forEach(mode => {
        const desc = FulfilmentService.getDeliveryDescription(mode, { min_days: 5, max_days: 7 });
        expect(desc).to.include('FREE');
      });
    });

    it('should never include FREE for express mode', () => {
      const desc = FulfilmentService.getDeliveryDescription('express', {
        min_days: 2,
        max_days: 3,
      });
      expect(desc).to.not.include('FREE');
    });
  });

  describe('releaseStockForOrder', () => {
    it('should return success message', async () => {
      const result = await FulfilmentService.releaseStockForOrder(env, 'order-123');

      expect(result.success).to.be.true;
      expect(result.message).to.include('automatically released');
    });

    it('should work with different order IDs', async () => {
      const result1 = await FulfilmentService.releaseStockForOrder(env, 'order-1');
      const result2 = await FulfilmentService.releaseStockForOrder(env, 'order-2');

      expect(result1.success).to.be.true;
      expect(result2.success).to.be.true;
    });

    it('should mention TTL in message', async () => {
      const result = await FulfilmentService.releaseStockForOrder(env, 'order-123');

      expect(result.message).to.include('TTL');
    });
  });
});
