import { expect } from 'chai';
import sinon from 'sinon';
import { requireAuth } from '../../src/middleware/auth.middleware.js';
import * as jose from 'jose';

describe('Auth Middleware', () => {
  let mockEnv;
  let joseStub;

  beforeEach(() => {
    mockEnv = {
      ACCESS_TOKEN_SECRET_B64: Buffer.from('test-secret-key-32-bytes-long!').toString('base64'),
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience',
    };

    joseStub = sinon.stub(jose, 'jwtVerify');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('requireAuth', () => {
    it('should return middleware function', () => {
      const middleware = requireAuth();
      expect(middleware).to.be.a('function');
    });

    it('should reject requests without authorization header', async () => {
      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {},
      });

      const response = await middleware(request, mockEnv);

      expect(response.status).to.equal(401);
      const body = await response.json();
      expect(body.success).to.be.false;
      expect(body.error).to.include('authorization header');
    });

    it('should reject requests with invalid authorization format', async () => {
      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      const response = await middleware(request, mockEnv);

      expect(response.status).to.equal(401);
      const body = await response.json();
      expect(body.success).to.be.false;
    });

    it('should attach user info to request for valid token', async () => {
      joseStub.resolves({
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      });

      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await middleware(request, mockEnv);

      expect(result).to.be.null;
      expect(request.auth).to.exist;
      expect(request.auth.userId).to.equal('user-123');
      expect(request.auth.email).to.equal('test@example.com');
    });

    it('should return 401 for expired token', async () => {
      joseStub.rejects(new Error('Token expired'));

      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {
          authorization: 'Bearer expired-token',
        },
      });

      const response = await middleware(request, mockEnv);

      expect(response.status).to.equal(401);
      const body = await response.json();
      expect(body.success).to.be.false;
      expect(body.error).to.include('Invalid or expired token');
    });

    it('should return 401 for tampered token', async () => {
      joseStub.rejects(new Error('Signature verification failed'));

      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {
          authorization: 'Bearer tampered-token',
        },
      });

      const response = await middleware(request, mockEnv);

      expect(response.status).to.equal(401);
      const body = await response.json();
      expect(body.success).to.be.false;
    });

    it('should extract Bearer token correctly', async () => {
      joseStub.resolves({
        payload: {
          sub: 'user-456',
        },
      });

      const middleware = requireAuth();
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: {
          authorization: 'Bearer my.jwt.token',
        },
      });

      await middleware(request, mockEnv);

      expect(joseStub).to.have.been.calledOnce;
      const tokenArg = joseStub.firstCall.args[0];
      expect(tokenArg).to.equal('my.jwt.token');
    });
  });
});
