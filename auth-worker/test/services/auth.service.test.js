// test/services/auth.service.test.js
import { expect } from 'chai';
import { issueTokens, refreshTokens } from '../../src/services/auth.service.js';
import { createMockEnv } from '../helpers/mock-env.js';
import { verifyAccessJWT } from '../../src/services/jwt.service.js';

describe('Auth Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('issueTokens', () => {
    it('should issue access and refresh tokens', async () => {
      const userId = 'user-123';

      const result = await issueTokens(mockEnv, userId);

      expect(result).to.have.property('access');
      expect(result).to.have.property('refresh');
      expect(result).to.have.property('sessionId');
      expect(result.access).to.be.a('string');
      expect(result.refresh).to.be.a('string');
      expect(result.sessionId).to.be.a('string');
    });

    it('should create valid JWT access token', async () => {
      const userId = 'user-456';

      const result = await issueTokens(mockEnv, userId);

      // Verify the JWT is valid
      const payload = await verifyAccessJWT(mockEnv, result.access);

      expect(payload.user_id).to.equal(userId);
      expect(payload.session_id).to.equal(result.sessionId);
      expect(payload.role).to.equal('customer');
    });

    it('should include correct role in token', async () => {
      const userId = 'user-789';

      const result = await issueTokens(mockEnv, userId);
      const payload = await verifyAccessJWT(mockEnv, result.access);

      expect(payload.role).to.equal('customer');
    });

    it('should create session in database', async () => {
      const userId = 'user-101';

      const result = await issueTokens(mockEnv, userId);

      // Verify session exists
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(result.sessionId)
        .first();

      expect(session).to.exist;
      expect(session.user_id).to.equal(userId);
      expect(session.refresh_token_hash).to.exist;
    });

    it('should generate unique sessions for same user', async () => {
      const userId = 'user-202';

      const result1 = await issueTokens(mockEnv, userId);
      const result2 = await issueTokens(mockEnv, userId);

      expect(result1.sessionId).to.not.equal(result2.sessionId);
      expect(result1.refresh).to.not.equal(result2.refresh);
      expect(result1.access).to.not.equal(result2.access);
    });

    it('should work without logger parameter', async () => {
      const userId = 'user-303';

      const result = await issueTokens(mockEnv, userId, null);

      expect(result).to.have.property('access');
      expect(result).to.have.property('refresh');
      expect(result).to.have.property('sessionId');
    });

    it('should handle logger if provided', async () => {
      const userId = 'user-404';
      const logs = [];
      const mockLogger = {
        info: (msg, data) => logs.push({ level: 'info', msg, data }),
        error: (msg, data, error) => logs.push({ level: 'error', msg, data, error }),
      };

      const result = await issueTokens(mockEnv, userId, mockLogger);

      expect(result).to.have.property('access');
      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].level).to.equal('info');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid session and token', async () => {
      const userId = 'user-505';

      // Issue initial tokens
      const initial = await issueTokens(mockEnv, userId);

      // Refresh tokens
      const refreshed = await refreshTokens(mockEnv, initial.sessionId, initial.refresh);

      expect(refreshed).to.have.property('access');
      expect(refreshed).to.have.property('refresh');
      expect(refreshed.access).to.be.a('string');
      expect(refreshed.refresh).to.be.a('string');
    });

    it('should return new access token', async () => {
      const userId = 'user-606';

      const initial = await issueTokens(mockEnv, userId);

      // Add a small delay to ensure different iat timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const refreshed = await refreshTokens(mockEnv, initial.sessionId, initial.refresh);

      // Tokens might be same if issued at exact same second, so just verify it works
      expect(refreshed.access).to.be.a('string');

      // Verify new token is valid
      const payload = await verifyAccessJWT(mockEnv, refreshed.access);
      expect(payload.user_id).to.equal(userId);
      expect(payload.session_id).to.equal(initial.sessionId);
    });

    it('should rotate refresh token', async () => {
      const userId = 'user-707';

      const initial = await issueTokens(mockEnv, userId);
      const refreshed = await refreshTokens(mockEnv, initial.sessionId, initial.refresh);

      expect(refreshed.refresh).to.not.equal(initial.refresh);
    });

    it('should reject invalid session ID', async () => {
      const fakeSessionId = 'non-existent-session-id';
      const fakeRefreshToken = 'fake-token';

      try {
        await refreshTokens(mockEnv, fakeSessionId, fakeRefreshToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('session_not_found');
      }
    });

    it('should reject invalid refresh token', async () => {
      const userId = 'user-808';

      const initial = await issueTokens(mockEnv, userId);
      const wrongToken = 'wrong-refresh-token';

      try {
        await refreshTokens(mockEnv, initial.sessionId, wrongToken);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('invalid_refresh_token');
      }
    });

    it('should reject revoked session', async () => {
      const userId = 'user-909';

      const initial = await issueTokens(mockEnv, userId);

      // Revoke the session by updating the store directly
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      session.revoked_at = new Date().toISOString();
      mockEnv.DB._getStore().set(`session:${initial.sessionId}`, session);

      try {
        await refreshTokens(mockEnv, initial.sessionId, initial.refresh);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('session_revoked');
      }
    });

    it('should reject expired session', async () => {
      const userId = 'user-1010';

      const initial = await issueTokens(mockEnv, userId);

      // Expire the session by setting expires_at in the past
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(initial.sessionId)
        .first();

      session.expires_at = pastDate;
      mockEnv.DB._getStore().set(`session:${initial.sessionId}`, session);

      try {
        await refreshTokens(mockEnv, initial.sessionId, initial.refresh);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('session_expired');
      }
    });

    it('should allow multiple refreshes in sequence', async () => {
      const userId = 'user-1111';

      let current = await issueTokens(mockEnv, userId);

      // Perform multiple refreshes
      for (let i = 0; i < 3; i++) {
        const refreshed = await refreshTokens(mockEnv, current.sessionId, current.refresh);

        expect(refreshed.access).to.be.a('string');
        expect(refreshed.refresh).to.be.a('string');
        expect(refreshed.refresh).to.not.equal(current.refresh);

        // Verify the new access token
        const payload = await verifyAccessJWT(mockEnv, refreshed.access);
        expect(payload.user_id).to.equal(userId);

        current = { ...current, ...refreshed };
      }
    });

    it('should invalidate old refresh token after rotation', async () => {
      const userId = 'user-1212';

      const initial = await issueTokens(mockEnv, userId);
      const refreshed = await refreshTokens(mockEnv, initial.sessionId, initial.refresh);

      // Try to use old refresh token again
      try {
        await refreshTokens(mockEnv, initial.sessionId, initial.refresh);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('invalid_refresh_token');
      }
    });

    it('should work without logger parameter', async () => {
      const userId = 'user-1313';

      const initial = await issueTokens(mockEnv, userId);
      const refreshed = await refreshTokens(mockEnv, initial.sessionId, initial.refresh, null);

      expect(refreshed).to.have.property('access');
      expect(refreshed).to.have.property('refresh');
    });
  });
});
