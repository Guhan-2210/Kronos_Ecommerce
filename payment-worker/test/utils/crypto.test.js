// test/utils/crypto.test.js
import { expect } from 'chai';
import { hashData, encryptData, decryptData } from '../../src/utils/crypto.js';

describe('Crypto Utils', () => {
  // Generate a test encryption key
  const generateTestKey = () => {
    const keyArray = new Uint8Array(32);
    crypto.getRandomValues(keyArray);
    return btoa(String.fromCharCode(...keyArray));
  };

  describe('hashData', () => {
    it('should hash data using SHA-256', async () => {
      const data = 'test@example.com';
      const hash = await hashData(data);

      expect(hash).to.be.a('string');
      expect(hash).to.have.length(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hashes', async () => {
      const data = 'test@example.com';
      const hash1 = await hashData(data);
      const hash2 = await hashData(data);

      expect(hash1).to.equal(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hashData('test1@example.com');
      const hash2 = await hashData('test2@example.com');

      expect(hash1).to.not.equal(hash2);
    });

    it('should return null for null input', async () => {
      const hash = await hashData(null);
      expect(hash).to.be.null;
    });

    it('should return null for undefined input', async () => {
      const hash = await hashData(undefined);
      expect(hash).to.be.null;
    });
  });

  describe('encryptData and decryptData', () => {
    let encryptionKey;

    beforeEach(() => {
      encryptionKey = generateTestKey();
    });

    it('should encrypt and decrypt data successfully', async () => {
      const originalData = { user: 'test', amount: 100 };

      const encrypted = await encryptData(originalData, encryptionKey);
      expect(encrypted).to.be.a('string');

      const decrypted = await decryptData(encrypted, encryptionKey);
      expect(decrypted).to.deep.equal(originalData);
    });

    it('should encrypt complex objects', async () => {
      const complexData = {
        id: 'pay-123',
        amount: 99.99,
        currency: 'USD',
        nested: {
          field: 'value',
          array: [1, 2, 3],
        },
      };

      const encrypted = await encryptData(complexData, encryptionKey);
      const decrypted = await decryptData(encrypted, encryptionKey);

      expect(decrypted).to.deep.equal(complexData);
    });

    it('should produce different encrypted output for same data', async () => {
      const data = { test: 'data' };

      const encrypted1 = await encryptData(data, encryptionKey);
      const encrypted2 = await encryptData(data, encryptionKey);

      // Different IVs should produce different ciphertext
      expect(encrypted1).to.not.equal(encrypted2);

      // But both should decrypt to same value
      const decrypted1 = await decryptData(encrypted1, encryptionKey);
      const decrypted2 = await decryptData(encrypted2, encryptionKey);
      expect(decrypted1).to.deep.equal(data);
      expect(decrypted2).to.deep.equal(data);
    });

    it('should fail to decrypt with wrong key', async () => {
      const data = { test: 'data' };
      const encrypted = await encryptData(data, encryptionKey);

      const wrongKey = generateTestKey();

      try {
        await decryptData(encrypted, wrongKey);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Failed to decrypt');
      }
    });

    it('should return null for null encrypted data', async () => {
      const result = await decryptData(null, encryptionKey);
      expect(result).to.be.null;
    });

    it('should return null for null data to encrypt', async () => {
      const result = await encryptData(null, encryptionKey);
      expect(result).to.be.null;
    });
  });
});
