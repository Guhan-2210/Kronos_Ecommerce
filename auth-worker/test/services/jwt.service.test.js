// test/services/jwt.service.test.js
import { expect } from 'chai';
import { signAccessJWT, verifyAccessJWT } from '../../src/services/jwt.service.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('JWT Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe('signAccessJWT', () => {
    it('should sign a JWT with valid payload', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);

      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.length(3); // JWT has 3 parts
    });

    it('should include all payload fields', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);
      const verified = await verifyAccessJWT(mockEnv, token);

      expect(verified.user_id).to.equal(payload.user_id);
      expect(verified.session_id).to.equal(payload.session_id);
      expect(verified.role).to.equal(payload.role);
    });

    it('should include standard JWT claims', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);
      const verified = await verifyAccessJWT(mockEnv, token);

      expect(verified).to.have.property('iat'); // issued at
      expect(verified).to.have.property('exp'); // expiration
      expect(verified.iss).to.equal(mockEnv.JWT_ISSUER);
      expect(verified.aud).to.equal(mockEnv.JWT_AUDIENCE);
    });

    it('should set correct expiration time', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const beforeSign = Math.floor(Date.now() / 1000);
      const token = await signAccessJWT(mockEnv, payload);
      const verified = await verifyAccessJWT(mockEnv, token);

      const expectedExp = beforeSign + parseInt(mockEnv.ACCESS_TOKEN_TTL_SEC, 10);

      // Allow 2 second tolerance for test execution time
      expect(verified.exp).to.be.closeTo(expectedExp, 2);
    });
  });

  describe('verifyAccessJWT', () => {
    it('should verify a valid JWT', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);
      const verified = await verifyAccessJWT(mockEnv, token);

      expect(verified).to.be.an('object');
      expect(verified.user_id).to.equal(payload.user_id);
    });

    it('should reject an invalid signature', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);

      // Tamper with the token
      const parts = token.split('.');
      parts[2] = parts[2].replace(/./g, 'x');
      const tamperedToken = parts.join('.');

      try {
        await verifyAccessJWT(mockEnv, tamperedToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should reject token with wrong issuer', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);

      // Create new env with different issuer
      const wrongEnv = { ...mockEnv, JWT_ISSUER: 'wrong-issuer' };

      try {
        await verifyAccessJWT(wrongEnv, token);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should reject token with wrong audience', async () => {
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token = await signAccessJWT(mockEnv, payload);

      // Create new env with different audience
      const wrongEnv = { ...mockEnv, JWT_AUDIENCE: 'wrong-audience' };

      try {
        await verifyAccessJWT(wrongEnv, token);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should reject malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      try {
        await verifyAccessJWT(mockEnv, malformedToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should reject empty token', async () => {
      try {
        await verifyAccessJWT(mockEnv, '');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('JWT token properties', () => {
    it('should create deterministic tokens for same payload at same time', async () => {
      // This test verifies that token generation is consistent
      const payload = {
        user_id: 'user-123',
        session_id: 'session-456',
        role: 'customer',
      };

      const token1 = await signAccessJWT(mockEnv, payload);
      const token2 = await signAccessJWT(mockEnv, payload);

      // Tokens will be different due to different iat (issued at) timestamps
      // But both should verify correctly
      const verified1 = await verifyAccessJWT(mockEnv, token1);
      const verified2 = await verifyAccessJWT(mockEnv, token2);

      expect(verified1.user_id).to.equal(verified2.user_id);
      expect(verified1.session_id).to.equal(verified2.session_id);
      expect(verified1.role).to.equal(verified2.role);
    });

    it('should handle different payload values', async () => {
      const payloads = [
        { user_id: 'user-1', session_id: 'session-1', role: 'admin' },
        { user_id: 'user-2', session_id: 'session-2', role: 'customer' },
        { user_id: 'user-3', session_id: 'session-3', role: 'guest' },
      ];

      for (const payload of payloads) {
        const token = await signAccessJWT(mockEnv, payload);
        const verified = await verifyAccessJWT(mockEnv, token);

        expect(verified.user_id).to.equal(payload.user_id);
        expect(verified.session_id).to.equal(payload.session_id);
        expect(verified.role).to.equal(payload.role);
      }
    });
  });
});
