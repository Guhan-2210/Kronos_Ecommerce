// test/services/session.service.test.js
import { expect } from 'chai';
import {
  newRefreshToken,
  issueSession,
  rotateRefresh,
} from '../../src/services/session.service.js';
import { createMockEnv } from '../helpers/mock-env.js';
import { verifyArgon2id } from '../../src/services/crypto.service.js';

describe('Session Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('newRefreshToken', () => {
    it('should generate a refresh token', () => {
      const token = newRefreshToken();

      expect(token).to.be.a('string');
      expect(token.length).to.be.greaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = newRefreshToken();
      const token2 = newRefreshToken();
      const token3 = newRefreshToken();

      expect(token1).to.not.equal(token2);
      expect(token2).to.not.equal(token3);
      expect(token1).to.not.equal(token3);
    });

    it('should generate base64 encoded tokens', () => {
      const token = newRefreshToken();

      // Base64 regex pattern
      const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
      expect(token).to.match(base64Pattern);
    });

    it('should generate tokens of consistent length', () => {
      const tokens = Array.from({ length: 10 }, () => newRefreshToken());
      const lengths = tokens.map(t => t.length);

      // All tokens should have the same length
      expect(new Set(lengths).size).to.equal(1);
    });
  });

  describe('issueSession', () => {
    it('should create a new session', async () => {
      const userId = 'user-123';

      const result = await issueSession(mockEnv, userId);

      expect(result).to.have.property('accessTokenRefreshTokenRaw');
      expect(result).to.have.property('sessionId');
      expect(result.accessTokenRefreshTokenRaw).to.be.a('string');
      expect(result.sessionId).to.be.a('string');
    });

    it('should generate unique session IDs', async () => {
      const userId = 'user-123';

      const session1 = await issueSession(mockEnv, userId);
      const session2 = await issueSession(mockEnv, userId);

      expect(session1.sessionId).to.not.equal(session2.sessionId);
    });

    it('should generate unique refresh tokens', async () => {
      const userId = 'user-123';

      const session1 = await issueSession(mockEnv, userId);
      const session2 = await issueSession(mockEnv, userId);

      expect(session1.accessTokenRefreshTokenRaw).to.not.equal(session2.accessTokenRefreshTokenRaw);
    });

    it('should store hashed refresh token in database', async () => {
      const userId = 'user-123';

      const result = await issueSession(mockEnv, userId);

      // Retrieve session from mock DB
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(result.sessionId)
        .first();

      expect(session).to.exist;
      expect(session.refresh_token_hash).to.be.a('string');
      expect(session.refresh_token_hash).to.include('$pbkdf2-sha256$');

      // Verify the raw token matches the stored hash
      const isValid = await verifyArgon2id(
        session.refresh_token_hash,
        result.accessTokenRefreshTokenRaw
      );
      expect(isValid).to.be.true;
    });

    it('should set correct user_id in session', async () => {
      const userId = 'user-456';

      const result = await issueSession(mockEnv, userId);

      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(result.sessionId)
        .first();

      expect(session.user_id).to.equal(userId);
    });
  });

  describe('rotateRefresh', () => {
    it('should rotate refresh token when provided valid token', async () => {
      const userId = 'user-123';

      // Create initial session
      const initial = await issueSession(mockEnv, userId);

      // Get the session object
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      // Rotate the token
      const newToken = await rotateRefresh(mockEnv, session, initial.accessTokenRefreshTokenRaw);

      expect(newToken).to.be.a('string');
      expect(newToken).to.not.equal(initial.accessTokenRefreshTokenRaw);
    });

    it('should update hash in database', async () => {
      const userId = 'user-123';

      const initial = await issueSession(mockEnv, userId);
      const sessionBefore = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      const oldHash = sessionBefore.refresh_token_hash;

      // Rotate the token
      const newToken = await rotateRefresh(
        mockEnv,
        sessionBefore,
        initial.accessTokenRefreshTokenRaw
      );

      // Get updated session
      const sessionAfter = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      expect(sessionAfter.refresh_token_hash).to.not.equal(oldHash);

      // Verify new token matches new hash
      const isValid = await verifyArgon2id(sessionAfter.refresh_token_hash, newToken);
      expect(isValid).to.be.true;
    });

    it('should reject invalid refresh token', async () => {
      const userId = 'user-123';

      const initial = await issueSession(mockEnv, userId);
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      const wrongToken = 'wrong-token-value';

      try {
        await rotateRefresh(mockEnv, session, wrongToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('invalid_refresh_token');
      }
    });

    it('should reject empty refresh token', async () => {
      const userId = 'user-123';

      const initial = await issueSession(mockEnv, userId);
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      try {
        await rotateRefresh(mockEnv, session, '');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should generate unique tokens on each rotation', async () => {
      const userId = 'user-123';

      const initial = await issueSession(mockEnv, userId);
      let session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      const token1 = await rotateRefresh(mockEnv, session, initial.accessTokenRefreshTokenRaw);

      session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      const token2 = await rotateRefresh(mockEnv, session, token1);

      session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      const token3 = await rotateRefresh(mockEnv, session, token2);

      expect(token1).to.not.equal(token2);
      expect(token2).to.not.equal(token3);
      expect(token1).to.not.equal(token3);
    });
  });
});
