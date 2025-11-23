import { expect } from 'chai';
import { WarehouseModel } from '../../src/models/warehouse.model.js';

describe('WarehouseModel', () => {
  describe('Structure', () => {
    it('should have getAllActive method', () => {
      expect(WarehouseModel).to.have.property('getAllActive');
      expect(WarehouseModel.getAllActive).to.be.a('function');
    });

    it('should have getById method', () => {
      expect(WarehouseModel).to.have.property('getById');
      expect(WarehouseModel.getById).to.be.a('function');
    });

    it('should have getByProximity method', () => {
      expect(WarehouseModel).to.have.property('getByProximity');
      expect(WarehouseModel.getByProximity).to.be.a('function');
    });
  });

  describe('getAllActive', () => {
    it('should be async function that accepts db parameter', () => {
      expect(WarehouseModel.getAllActive).to.be.a('function');
      expect(WarehouseModel.getAllActive.length).to.equal(1);
    });
  });

  describe('getById', () => {
    it('should be async function that accepts db and warehouseId', () => {
      expect(WarehouseModel.getById).to.be.a('function');
      expect(WarehouseModel.getById.length).to.equal(2);
    });
  });

  describe('getByProximity', () => {
    it('should be async function that accepts db, latitude, and longitude', () => {
      expect(WarehouseModel.getByProximity).to.be.a('function');
      expect(WarehouseModel.getByProximity.length).to.equal(3);
    });
  });
});
