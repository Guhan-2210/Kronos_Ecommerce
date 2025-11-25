import { expect } from 'chai';
import * as SessionModel from '../../src/models/session.model.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('SessionModel', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const sessionId = 'sess-123';
      const userId = 'user-456';
      const hash = 'token-hash';
      const ttlDays = 30;

      await SessionModel.createSession(mockEnv, sessionId, userId, hash, ttlDays);

      // Verify session was created
      const session = await SessionModel.getSession(mockEnv, sessionId);
      expect(session).to.not.be.null;
      expect(session.id).to.equal(sessionId);
      expect(session.user_id).to.equal(userId);
      expect(session.refresh_token_hash).to.equal(hash);
    });

    it('should set expiration date based on TTL', async () => {
      const beforeTime = Date.now();
      await SessionModel.createSession(mockEnv, 'sess-1', 'user-1', 'hash', 7);

      const session = await SessionModel.getSession(mockEnv, 'sess-1');
      expect(session).to.not.be.null;

      // Check expiration is approximately 7 days from now
      const expiresAt = new Date(session.expires_at).getTime();
      const expectedExpiry = beforeTime + 7 * 24 * 60 * 60 * 1000;
      // Allow 1 second tolerance
      expect(expiresAt).to.be.within(expectedExpiry - 1000, expectedExpiry + 1000);
    });
  });

  describe('getSession', () => {
    it('should retrieve a session by ID', async () => {
      await SessionModel.createSession(mockEnv, 'sess-123', 'user-456', 'hash', 30);

      const result = await SessionModel.getSession(mockEnv, 'sess-123');

      expect(result).to.not.be.null;
      expect(result.id).to.equal('sess-123');
      expect(result.user_id).to.equal('user-456');
      expect(result.refresh_token_hash).to.equal('hash');
      expect(result.revoked_at).to.be.null;
    });

    it('should return null when session not found', async () => {
      const result = await SessionModel.getSession(mockEnv, 'nonexistent');

      expect(result).to.be.null;
    });
  });

  describe('rotateSessionToken', () => {
    it('should update session with new token hash', async () => {
      const sessionId = 'sess-123';
      const newHash = 'new-hash-value';

      await SessionModel.createSession(mockEnv, sessionId, 'user-123', 'old-hash', 30);
      await SessionModel.rotateSessionToken(mockEnv, sessionId, newHash);

      const session = await SessionModel.getSession(mockEnv, sessionId);
      expect(session.refresh_token_hash).to.equal(newHash);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const sessionId = 'sess-123';

      await SessionModel.createSession(mockEnv, sessionId, 'user-123', 'hash', 30);
      await SessionModel.revokeSession(mockEnv, sessionId);

      const session = await SessionModel.getSession(mockEnv, sessionId);
      expect(session.revoked_at).to.not.be.null;
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = 'user-123';

      // Create multiple sessions for the user
      await SessionModel.createSession(mockEnv, 'sess-1', userId, 'hash1', 30);
      await SessionModel.createSession(mockEnv, 'sess-2', userId, 'hash2', 30);
      await SessionModel.createSession(mockEnv, 'sess-3', 'user-456', 'hash3', 30);

      await SessionModel.revokeAllSessions(mockEnv, userId);

      // Check that user-123's sessions are revoked
      const session1 = await SessionModel.getSession(mockEnv, 'sess-1');
      const session2 = await SessionModel.getSession(mockEnv, 'sess-2');
      const session3 = await SessionModel.getSession(mockEnv, 'sess-3');

      expect(session1.revoked_at).to.not.be.null;
      expect(session2.revoked_at).to.not.be.null;
      expect(session3.revoked_at).to.be.null; // Different user's session should not be revoked
    });
  });
});
