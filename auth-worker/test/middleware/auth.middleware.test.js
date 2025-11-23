// test/middleware/auth.middleware.test.js
import { expect } from 'chai';
import { requireAuth } from '../../src/middleware/auth.middleware.js';
import { createMockEnv, createMockRequest } from '../helpers/mock-env.js';
import { issueTokens } from '../../src/services/auth.service.js';

describe('Auth Middleware', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('requireAuth', () => {
    it('should reject request without authorization header', async () => {
      const middleware = requireAuth();
      const request = createMockRequest();

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Missing token');
    });

    it('should reject request without Bearer prefix', async () => {
      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: 'InvalidFormat token123' },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Missing token');
    });

    it('should reject invalid token', async () => {
      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Invalid token');
    });

    it('should accept valid token and set auth context', async () => {
      const userId = 'user-123';
      const { access, sessionId } = await issueTokens(mockEnv, userId);

      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      const response = await middleware(request, mockEnv);

      // Middleware should not return a response for valid token
      expect(response).to.be.undefined;

      // Check that auth context was set
      expect(request.auth).to.exist;
      expect(request.auth.userId).to.equal(userId);
      expect(request.auth.sessionId).to.equal(sessionId);
      expect(request.auth.role).to.equal('customer');
    });

    it('should reject token with revoked session', async () => {
      const userId = 'user-456';
      const { access, sessionId } = await issueTokens(mockEnv, userId);

      // Revoke the session by updating the store directly
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first();

      session.revoked_at = new Date().toISOString();
      mockEnv.DB._getStore().set(`session:${sessionId}`, session);

      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Session inactive');
    });

    it('should reject token with expired session', async () => {
      const userId = 'user-789';
      const { access, sessionId } = await issueTokens(mockEnv, userId);

      // Expire the session
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const session = await mockEnv.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first();

      session.expires_at = pastDate;
      mockEnv.DB._getStore().set(`session:${sessionId}`, session);

      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Session inactive');
    });

    it('should reject token with non-existent session', async () => {
      const userId = 'user-101';
      const { access, sessionId } = await issueTokens(mockEnv, userId);

      // Delete the session
      mockEnv.DB._getStore().delete(`session:${sessionId}`);

      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);

      const body = await response.json();
      expect(body.error).to.equal('Session inactive');
    });

    it('should handle malformed Bearer token', async () => {
      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: 'Bearer ' },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.instanceOf(Response);
      expect(response.status).to.equal(401);
    });

    it('should extract token correctly from Authorization header', async () => {
      const userId = 'user-202';
      const { access } = await issueTokens(mockEnv, userId);

      // Test with extra spaces
      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      const response = await middleware(request, mockEnv);

      expect(response).to.be.undefined;
      expect(request.auth).to.exist;
    });

    it('should set all required auth properties', async () => {
      const userId = 'user-303';
      const { access, sessionId } = await issueTokens(mockEnv, userId);

      const middleware = requireAuth();
      const request = createMockRequest({
        headers: { authorization: `Bearer ${access}` },
      });

      await middleware(request, mockEnv);

      expect(request.auth).to.have.property('userId');
      expect(request.auth).to.have.property('sessionId');
      expect(request.auth).to.have.property('role');
      expect(request.auth.userId).to.be.a('string');
      expect(request.auth.sessionId).to.be.a('string');
      expect(request.auth.role).to.be.a('string');
    });
  });
});
