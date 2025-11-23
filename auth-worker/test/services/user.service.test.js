// test/services/user.service.test.js
import { expect } from 'chai';
import { registerUser, verifyUserPassword } from '../../src/services/user.service.js';
import { createMockEnv } from '../helpers/mock-env.js';
import { decryptField } from '../../src/services/crypto.service.js';

describe('User Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('registerUser', () => {
    const validInput = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      phone: '+1234567890',
      address: {
        line1: '123 Main St',
        line2: 'Apt 4',
        street: 'Main Street',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
      },
    };

    it('should register a new user', async () => {
      const result = await registerUser(mockEnv, validInput);

      expect(result).to.have.property('id');
      expect(result.id).to.be.a('string');
      expect(result.id.length).to.be.greaterThan(0);
    });

    it('should generate unique user IDs', async () => {
      const result1 = await registerUser(mockEnv, validInput);

      const input2 = { ...validInput, email: 'jane@example.com' };
      const result2 = await registerUser(mockEnv, input2);

      expect(result1.id).to.not.equal(result2.id);
    });

    it('should encrypt user PII fields', async () => {
      const result = await registerUser(mockEnv, validInput);

      // Get user from database
      const store = mockEnv.DB._getStore();
      const userEntry = store.get(`user:${result.id}`);

      expect(userEntry).to.exist;

      const userData =
        typeof userEntry.user_data === 'string'
          ? JSON.parse(userEntry.user_data)
          : userEntry.user_data;

      // Check that sensitive fields are encrypted (have ct and iv properties)
      expect(userData.name).to.have.property('ct');
      expect(userData.name).to.have.property('iv');
      expect(userData.email).to.have.property('ct');
      expect(userData.email).to.have.property('iv');
      expect(userData.phone).to.have.property('ct');
      expect(userData.phone).to.have.property('iv');
      expect(userData.address).to.have.property('ct');
      expect(userData.address).to.have.property('iv');

      // Verify we can decrypt back to original values
      const decryptedName = await decryptField(mockEnv, userData.name);
      const decryptedEmail = await decryptField(mockEnv, userData.email);
      const decryptedPhone = await decryptField(mockEnv, userData.phone);
      const decryptedAddress = JSON.parse(await decryptField(mockEnv, userData.address));

      expect(decryptedName).to.equal(validInput.name);
      expect(decryptedEmail).to.equal(validInput.email);
      expect(decryptedPhone).to.equal(validInput.phone);
      expect(decryptedAddress).to.deep.equal(validInput.address);
    });

    it('should store email and phone hashes', async () => {
      const result = await registerUser(mockEnv, validInput);

      const store = mockEnv.DB._getStore();
      const userEntry = store.get(`user:${result.id}`);
      const userData =
        typeof userEntry.user_data === 'string'
          ? JSON.parse(userEntry.user_data)
          : userEntry.user_data;

      expect(userData).to.have.property('email_hash');
      expect(userData).to.have.property('phone_hash');
      expect(userData.email_hash).to.be.a('string');
      expect(userData.phone_hash).to.be.a('string');
    });

    it('should hash passwords securely', async () => {
      const result = await registerUser(mockEnv, validInput);

      const store = mockEnv.DB._getStore();
      const userEntry = store.get(`user:${result.id}`);
      const userData =
        typeof userEntry.user_data === 'string'
          ? JSON.parse(userEntry.user_data)
          : userEntry.user_data;

      expect(userData.password).to.be.a('string');
      expect(userData.password).to.include('$pbkdf2-sha256$');
      expect(userData.password).to.not.equal(validInput.password);
    });

    it('should reject duplicate email', async () => {
      await registerUser(mockEnv, validInput);

      // Try to register with same email
      try {
        await registerUser(mockEnv, validInput);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('email_exists');
      }
    });

    it('should handle different email cases as duplicates', async () => {
      await registerUser(mockEnv, validInput);

      // Try with uppercase email
      const duplicateInput = { ...validInput, email: 'JOHN@EXAMPLE.COM' };

      try {
        await registerUser(mockEnv, duplicateInput);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('email_exists');
      }
    });

    it('should handle special characters in fields', async () => {
      const specialInput = {
        ...validInput,
        email: 'test+tag@example.com',
        name: "O'Brien-Smith",
        phone: '+1 (555) 123-4567',
      };

      const result = await registerUser(mockEnv, specialInput);
      expect(result).to.have.property('id');
    });
  });

  describe('verifyUserPassword', () => {
    const userInput = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePass456!',
      phone: '+9876543210',
      address: {
        line1: '456 Oak St',
        line2: '',
        street: 'Oak Street',
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
        country: 'USA',
      },
    };

    it('should verify correct password', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, userInput.email, userInput.password);

      expect(user).to.exist;
      expect(user).to.have.property('id');
    });

    it('should reject incorrect password', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, userInput.email, 'WrongPassword123!');

      expect(user).to.be.null;
    });

    it('should return null for non-existent email', async () => {
      const user = await verifyUserPassword(mockEnv, 'nonexistent@example.com', 'AnyPassword123!');

      expect(user).to.be.null;
    });

    it('should handle case-insensitive email lookup', async () => {
      await registerUser(mockEnv, userInput);

      const user1 = await verifyUserPassword(mockEnv, 'JANE@EXAMPLE.COM', userInput.password);
      const user2 = await verifyUserPassword(mockEnv, 'jane@example.com', userInput.password);

      expect(user1).to.exist;
      expect(user2).to.exist;
      expect(user1.id).to.equal(user2.id);
    });

    it('should be case-sensitive for passwords', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, userInput.email, 'SECUREPASS456!');

      expect(user).to.be.null;
    });

    it('should reject empty password', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, userInput.email, '');

      expect(user).to.be.null;
    });

    it('should handle whitespace in email during lookup', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, '  jane@example.com  ', userInput.password);

      expect(user).to.exist;
    });

    it('should return user with encrypted data intact', async () => {
      await registerUser(mockEnv, userInput);

      const user = await verifyUserPassword(mockEnv, userInput.email, userInput.password);

      expect(user).to.exist;
      expect(user.user_data).to.exist;
      expect(user.user_data).to.have.property('email_hash');
      expect(user.user_data).to.have.property('password');
    });
  });
});
