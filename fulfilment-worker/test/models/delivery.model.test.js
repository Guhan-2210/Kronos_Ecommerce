import { expect } from 'chai';
import { DeliveryModel } from '../../src/models/delivery.model.js';

describe('DeliveryModel', () => {
  describe('Structure', () => {
    it('should have getZoneForZipcode method', () => {
      expect(DeliveryModel).to.have.property('getZoneForZipcode');
      expect(DeliveryModel.getZoneForZipcode).to.be.a('function');
    });

    it('should have getDeliveryModesForZone method', () => {
      expect(DeliveryModel).to.have.property('getDeliveryModesForZone');
      expect(DeliveryModel.getDeliveryModesForZone).to.be.a('function');
    });

    it('should have getDeliveryModesForZipcode method', () => {
      expect(DeliveryModel).to.have.property('getDeliveryModesForZipcode');
      expect(DeliveryModel.getDeliveryModesForZipcode).to.be.a('function');
    });

    it('should have getDefaultDeliveryModes method', () => {
      expect(DeliveryModel).to.have.property('getDefaultDeliveryModes');
      expect(DeliveryModel.getDefaultDeliveryModes).to.be.a('function');
    });
  });

  describe('getDefaultDeliveryModes', () => {
    it('should return standard and express default modes', () => {
      const result = DeliveryModel.getDefaultDeliveryModes();

      expect(result).to.have.lengthOf(2);

      const standard = result.find(m => m.mode_name === 'standard');
      const express = result.find(m => m.mode_name === 'express');

      expect(standard).to.exist;
      expect(express).to.exist;
    });

    it('should have standard mode with free shipping', () => {
      const result = DeliveryModel.getDefaultDeliveryModes();
      const standard = result.find(m => m.mode_name === 'standard');

      expect(standard.conditions.base_cost).to.equal(0);
      expect(standard.conditions.min_days).to.equal(5);
      expect(standard.conditions.max_days).to.equal(7);
      expect(standard.conditions.cutoff_time).to.equal('17:00');
      expect(standard.is_active).to.equal(1);
    });

    it('should have express mode with cost', () => {
      const result = DeliveryModel.getDefaultDeliveryModes();
      const express = result.find(m => m.mode_name === 'express');

      expect(express.conditions.base_cost).to.equal(500);
      expect(express.conditions.min_days).to.equal(2);
      expect(express.conditions.max_days).to.equal(3);
      expect(express.conditions.cutoff_time).to.equal('12:00');
      expect(express.is_active).to.equal(1);
    });

    it('should return modes with proper structure', () => {
      const result = DeliveryModel.getDefaultDeliveryModes();

      result.forEach(mode => {
        expect(mode).to.have.property('id');
        expect(mode).to.have.property('mode_name');
        expect(mode).to.have.property('conditions');
        expect(mode).to.have.property('is_active');
        expect(mode.conditions).to.be.an('object');
        expect(mode.conditions).to.have.property('min_days');
        expect(mode.conditions).to.have.property('max_days');
        expect(mode.conditions).to.have.property('base_cost');
        expect(mode.conditions).to.have.property('cutoff_time');
      });
    });

    it('should have unique IDs for default modes', () => {
      const result = DeliveryModel.getDefaultDeliveryModes();
      const ids = result.map(m => m.id);
      const uniqueIds = [...new Set(ids)];

      expect(uniqueIds).to.have.lengthOf(ids.length);
    });

    it('should return same result on multiple calls', () => {
      const result1 = DeliveryModel.getDefaultDeliveryModes();
      const result2 = DeliveryModel.getDefaultDeliveryModes();

      expect(result1).to.deep.equal(result2);
    });
  });
});
