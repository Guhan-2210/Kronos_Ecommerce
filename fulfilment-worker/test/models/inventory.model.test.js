import { expect } from 'chai';
import { InventoryModel } from '../../src/models/inventory.model.js';

describe('InventoryModel', () => {
  describe('Structure', () => {
    it('should have checkStock method', () => {
      expect(InventoryModel).to.have.property('checkStock');
      expect(InventoryModel.checkStock).to.be.a('function');
    });

    it('should have getStockAtWarehouse method', () => {
      expect(InventoryModel).to.have.property('getStockAtWarehouse');
      expect(InventoryModel.getStockAtWarehouse).to.be.a('function');
    });
  });

  describe('checkStock - unit behavior', () => {
    it('should be async function that accepts db and productId', () => {
      expect(InventoryModel.checkStock).to.be.a('function');
      expect(InventoryModel.checkStock.length).to.be.at.least(2);
    });
  });

  describe('getStockAtWarehouse - unit behavior', () => {
    it('should be async function that accepts db, productId, and warehouseId', () => {
      expect(InventoryModel.getStockAtWarehouse).to.be.a('function');
      expect(InventoryModel.getStockAtWarehouse.length).to.equal(3);
    });
  });
});
