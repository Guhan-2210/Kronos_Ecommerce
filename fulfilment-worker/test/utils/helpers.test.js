import { expect } from 'chai';
import {
  generateId,
  successResponse,
  errorResponse,
  calculateDistance,
  getCoordinatesFromZipcode,
} from '../../src/utils/helpers.js';

describe('Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
      expect(id1).to.include('-');
    });

    it('should generate IDs with timestamp and random components', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts).to.have.lengthOf(2);
      expect(parts[0]).to.have.length.greaterThan(0);
      expect(parts[1]).to.have.length.greaterThan(0);
    });
  });

  describe('successResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'test' };
      const response = successResponse(data);

      expect(response).to.deep.equal({
        success: true,
        message: null,
        data,
      });
    });

    it('should create success response with message', () => {
      const data = { id: '123' };
      const message = 'Operation successful';
      const response = successResponse(data, message);

      expect(response).to.deep.equal({
        success: true,
        message,
        data,
      });
    });

    it('should include metadata if provided', () => {
      const data = { id: '123' };
      const message = 'Success';
      const meta = { count: 5, page: 1 };
      const response = successResponse(data, message, meta);

      expect(response).to.deep.include({
        success: true,
        message,
        data,
        count: 5,
        page: 1,
      });
    });
  });

  describe('errorResponse', () => {
    it('should create error response with default status code', () => {
      const message = 'Something went wrong';
      const response = errorResponse(message);

      expect(response).to.deep.equal({
        success: false,
        error: {
          message,
          statusCode: 500,
          details: null,
        },
      });
    });

    it('should create error response with custom status code', () => {
      const message = 'Not found';
      const statusCode = 404;
      const response = errorResponse(message, statusCode);

      expect(response).to.deep.equal({
        success: false,
        error: {
          message,
          statusCode,
          details: null,
        },
      });
    });

    it('should include error details if provided', () => {
      const message = 'Validation failed';
      const statusCode = 400;
      const details = { field: 'email', error: 'invalid format' };
      const response = errorResponse(message, statusCode, details);

      expect(response).to.deep.equal({
        success: false,
        error: {
          message,
          statusCode,
          details,
        },
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Chennai to Coimbatore (approximately 500km)
      const chennaiLat = 13.0827;
      const chennaiLon = 80.2707;
      const coimbatoreLat = 11.0168;
      const coimbatoreLon = 76.9558;

      const distance = calculateDistance(chennaiLat, chennaiLon, coimbatoreLat, coimbatoreLon);

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(400);
      expect(distance).to.be.lessThan(600);
    });

    it('should return zero for same coordinates', () => {
      const lat = 13.0827;
      const lon = 80.2707;

      const distance = calculateDistance(lat, lon, lat, lon);

      expect(distance).to.equal(0);
    });

    it('should calculate short distances correctly', () => {
      // Two nearby locations in Chennai
      const lat1 = 13.0827;
      const lon1 = 80.2707;
      const lat2 = 13.0878;
      const lon2 = 80.2785;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(0);
      expect(distance).to.be.lessThan(10); // Should be less than 10km
    });

    it('should handle negative coordinates', () => {
      // Test with negative coordinates
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(0);
    });
  });

  describe('getCoordinatesFromZipcode', () => {
    it('should return coordinates for known Chennai zipcode', () => {
      const coords = getCoordinatesFromZipcode('600002');

      expect(coords).to.be.an('object');
      expect(coords).to.have.property('lat');
      expect(coords).to.have.property('lon');
      expect(coords.lat).to.be.closeTo(13.0827, 0.01);
      expect(coords.lon).to.be.closeTo(80.2707, 0.01);
    });

    it('should return coordinates for known Coimbatore zipcode', () => {
      const coords = getCoordinatesFromZipcode('641001');

      expect(coords).to.have.property('lat');
      expect(coords).to.have.property('lon');
      expect(coords.lat).to.be.closeTo(11.0168, 0.01);
      expect(coords.lon).to.be.closeTo(76.9558, 0.01);
    });

    it('should return coordinates for known Madurai zipcode', () => {
      const coords = getCoordinatesFromZipcode('625001');

      expect(coords).to.have.property('lat');
      expect(coords).to.have.property('lon');
      expect(coords.lat).to.be.closeTo(9.9252, 0.01);
    });

    it('should return pattern-based coordinates for unknown zipcode in known area', () => {
      // Unknown zipcode but starts with 600 (Chennai area)
      const coords = getCoordinatesFromZipcode('600099');

      expect(coords).to.have.property('lat');
      expect(coords).to.have.property('lon');
      // Should match Chennai pattern
      expect(coords.lat).to.be.closeTo(13.0827, 0.01);
    });

    it('should return default coordinates for completely unknown zipcode', () => {
      const coords = getCoordinatesFromZipcode('999999');

      expect(coords).to.have.property('lat');
      expect(coords).to.have.property('lon');
      // Should return Tamil Nadu default
      expect(coords.lat).to.be.closeTo(11.1271, 0.01);
      expect(coords.lon).to.be.closeTo(78.6569, 0.01);
    });

    it('should handle various zipcode formats', () => {
      const coords1 = getCoordinatesFromZipcode('620001');
      const coords2 = getCoordinatesFromZipcode('632001');
      const coords3 = getCoordinatesFromZipcode('613001');

      expect(coords1).to.have.property('lat');
      expect(coords2).to.have.property('lat');
      expect(coords3).to.have.property('lat');

      // All should be different
      expect(coords1.lat).to.not.equal(coords2.lat);
      expect(coords2.lat).to.not.equal(coords3.lat);
    });
  });
});
