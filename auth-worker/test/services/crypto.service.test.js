// test/services/crypto.service.test.js
import { expect } from 'chai';
import {
  encryptField,
  decryptField,
  hmacDeterministic,
  hashArgon2id,
  verifyArgon2id,
} from '../../src/services/crypto.service.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('Crypto Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe('encryptField and decryptField', () => {
    it('should encrypt and decrypt a field correctly', async () => {
      const plaintext = 'test@example.com';

      const encrypted = await encryptField(mockEnv, plaintext);

      expect(encrypted).to.have.property('ct');
      expect(encrypted).to.have.property('iv');
      expect(encrypted.ct).to.be.a('string');
      expect(encrypted.iv).to.be.a('string');

      const decrypted = await decryptField(mockEnv, encrypted);

      expect(decrypted).to.equal(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext', async () => {
      const plaintext = 'test@example.com';

      const encrypted1 = await encryptField(mockEnv, plaintext);
      const encrypted2 = await encryptField(mockEnv, plaintext);

      // Different IVs should produce different ciphertexts
      expect(encrypted1.iv).to.not.equal(encrypted2.iv);
      expect(encrypted1.ct).to.not.equal(encrypted2.ct);

      // But both should decrypt to the same plaintext
      const decrypted1 = await decryptField(mockEnv, encrypted1);
      const decrypted2 = await decryptField(mockEnv, encrypted2);

      expect(decrypted1).to.equal(plaintext);
      expect(decrypted2).to.equal(plaintext);
    });

    it('should handle empty strings', async () => {
      const plaintext = '';

      const encrypted = await encryptField(mockEnv, plaintext);
      const decrypted = await decryptField(mockEnv, encrypted);

      expect(decrypted).to.equal(plaintext);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界 🌍';

      const encrypted = await encryptField(mockEnv, plaintext);
      const decrypted = await decryptField(mockEnv, encrypted);

      expect(decrypted).to.equal(plaintext);
    });

    it('should handle long strings', async () => {
      const plaintext = 'a'.repeat(1000);

      const encrypted = await encryptField(mockEnv, plaintext);
      const decrypted = await decryptField(mockEnv, encrypted);

      expect(decrypted).to.equal(plaintext);
    });
  });

  describe('hmacDeterministic', () => {
    it('should produce consistent hash for the same input', async () => {
      const input = 'test@example.com';

      const hash1 = await hmacDeterministic(mockEnv, input);
      const hash2 = await hmacDeterministic(mockEnv, input);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.be.a('string');
      expect(hash1.length).to.be.greaterThan(0);
    });

    it('should normalize input by trimming and lowercasing', async () => {
      const hash1 = await hmacDeterministic(mockEnv, 'test@example.com');
      const hash2 = await hmacDeterministic(mockEnv, '  TEST@EXAMPLE.COM  ');

      expect(hash1).to.equal(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hmacDeterministic(mockEnv, 'test1@example.com');
      const hash2 = await hmacDeterministic(mockEnv, 'test2@example.com');

      expect(hash1).to.not.equal(hash2);
    });

    it('should handle empty strings', async () => {
      const hash = await hmacDeterministic(mockEnv, '');

      expect(hash).to.be.a('string');
      expect(hash.length).to.be.greaterThan(0);
    });
  });

  describe('hashArgon2id and verifyArgon2id', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!';

      const hash = await hashArgon2id(password);

      expect(hash).to.be.a('string');
      expect(hash).to.include('$pbkdf2-sha256$');
      expect(hash.split('$').length).to.equal(5);
    });

    it('should verify a correct password', async () => {
      const password = 'SecurePassword123!';

      const hash = await hashArgon2id(password);
      const isValid = await verifyArgon2id(hash, password);

      expect(isValid).to.be.true;
    });

    it('should reject an incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword456!';

      const hash = await hashArgon2id(password);
      const isValid = await verifyArgon2id(hash, wrongPassword);

      expect(isValid).to.be.false;
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'SecurePassword123!';

      const hash1 = await hashArgon2id(password);
      const hash2 = await hashArgon2id(password);

      // Different salts should produce different hashes
      expect(hash1).to.not.equal(hash2);

      // But both should verify correctly
      expect(await verifyArgon2id(hash1, password)).to.be.true;
      expect(await verifyArgon2id(hash2, password)).to.be.true;
    });

    it('should handle special characters in passwords', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const hash = await hashArgon2id(password);
      const isValid = await verifyArgon2id(hash, password);

      expect(isValid).to.be.true;
    });

    it('should handle unicode characters in passwords', async () => {
      const password = 'Pass世界🔐';

      const hash = await hashArgon2id(password);
      const isValid = await verifyArgon2id(hash, password);

      expect(isValid).to.be.true;
    });

    it('should throw error for invalid hash format', async () => {
      const invalidHash = 'invalid-hash-format';

      try {
        await verifyArgon2id(invalidHash, 'password');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Invalid hash format');
      }
    });

    it('should be case sensitive', async () => {
      const password = 'Password123';

      const hash = await hashArgon2id(password);
      const isValidLower = await verifyArgon2id(hash, 'password123');
      const isValidUpper = await verifyArgon2id(hash, 'PASSWORD123');

      expect(isValidLower).to.be.false;
      expect(isValidUpper).to.be.false;
    });
  });
});
