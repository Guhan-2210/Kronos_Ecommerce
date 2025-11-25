import { expect } from 'chai';
import { meCtrl } from '../../src/controllers/user.controller.js';
import { createMockEnv, createMockRequest } from '../helpers/mock-env.js';
import { insertUser } from '../../src/models/user.model.js';
import { encryptField } from '../../src/services/crypto.service.js';

describe('UserController', () => {
  let mockEnv;
  let mockRequest;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('meCtrl', () => {
    it('should return user data', async () => {
      // Create encrypted user data
      const name = await encryptField(mockEnv, 'John Doe');
      const email = await encryptField(mockEnv, 'john@example.com');
      const phone = await encryptField(mockEnv, '+1234567890');
      const address = await encryptField(mockEnv, JSON.stringify({ city: 'New York' }));

      const userData = {
        name,
        email,
        phone,
        address,
        email_hash: 'hash123',
        password_hash: 'pass123',
      };

      // Insert user into mock DB
      await insertUser(mockEnv, 'user-123', userData);

      mockRequest = createMockRequest({
        headers: { 'cf-ray': 'test-cf-ray' },
        auth: { userId: 'user-123' },
      });

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(200);
      expect(body.user).to.exist;
      expect(body.user.name).to.equal('John Doe');
      expect(body.user.email).to.equal('john@example.com');
    });

    it('should return 404 when user not found', async () => {
      mockRequest = createMockRequest({
        headers: { 'cf-ray': 'test-cf-ray' },
        auth: { userId: 'nonexistent-user' },
      });

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(404);
      expect(body.error).to.equal('NotFound');
    });

    it('should decrypt all PII fields', async () => {
      // Create encrypted user data with all fields
      const name = await encryptField(mockEnv, 'Jane Doe');
      const email = await encryptField(mockEnv, 'jane@example.com');
      const phone = await encryptField(mockEnv, '+9876543210');
      const address = await encryptField(mockEnv, JSON.stringify({ street: 'Main St' }));

      const userData = {
        name,
        email,
        phone,
        address,
        email_hash: 'hash456',
        password_hash: 'pass456',
      };

      await insertUser(mockEnv, 'user-456', userData);

      mockRequest = createMockRequest({
        headers: { 'cf-ray': 'test-cf-ray' },
        auth: { userId: 'user-456' },
      });

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(200);
      expect(body.user.name).to.equal('Jane Doe');
      expect(body.user.email).to.equal('jane@example.com');
      expect(body.user.phone).to.equal('+9876543210');
      expect(body.user.address).to.deep.equal({ street: 'Main St' });
    });
  });
});
