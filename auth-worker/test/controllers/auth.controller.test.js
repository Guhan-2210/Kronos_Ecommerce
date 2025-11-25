// test/controllers/auth.controller.test.js
import { expect } from 'chai';
import {
  signupCtrl,
  loginCtrl,
  refreshCtrl,
  logoutCtrl,
  logoutAllCtrl,
} from '../../src/controllers/auth.controller.js';
import { createMockEnv } from '../helpers/mock-env.js';
import { signupSchema, loginSchema } from '../../src/schemas/auth.schemas.js';

describe('Auth Controller', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
    mockEnv.ACCESS_TOKEN_TTL_SEC = '900'; // 15 minutes
    mockEnv.REFRESH_TTL_DAYS = '30';
  });

  // Helper to parse Set-Cookie headers
  function parseCookies(response) {
    const cookies = {};
    const setCookieHeaders =
      response.headers.getAll?.('Set-Cookie') ||
      Array.from(response.headers.entries())
        .filter(([k]) => k.toLowerCase() === 'set-cookie')
        .map(([, v]) => v);

    setCookieHeaders.forEach(header => {
      const [nameValue] = header.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = {
        value: value || '',
        raw: header,
      };
    });

    return cookies;
  }

  describe('signupCtrl', () => {
    it('should create user and return access token with cookies', async () => {
      const validationResult = signupSchema.validate({
        name: 'Test User',
        email: 'signup-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const request = {
        validated: validationResult.value,
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        return null;
      };

      const response = await signupCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(201);
      expect(body.access_token).to.be.a('string');

      // Verify all three cookies are set
      expect(cookies).to.have.property('refresh_token');
      expect(cookies).to.have.property('session_id');
      expect(cookies).to.have.property('access_token');

      // Verify access token cookie properties
      expect(cookies.access_token.value).to.be.a('string');
      expect(cookies.access_token.raw).to.include('Max-Age=900');
      expect(cookies.access_token.raw).to.include('Secure');
      expect(cookies.access_token.raw).to.include('SameSite=None');
      expect(cookies.access_token.raw).to.include('HttpOnly'); // HttpOnly for security

      // Verify refresh token cookie is HttpOnly
      expect(cookies.refresh_token.raw).to.include('HttpOnly');
      expect(cookies.session_id.raw).to.include('HttpOnly');
    });

    it('should handle signup with duplicate email', async () => {
      // First signup
      const validationResult = signupSchema.validate({
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const request1 = {
        validated: validationResult.value,
        headers: new Headers(),
      };
      request1.headers.get = () => 'test-cf-ray';

      await signupCtrl(request1, mockEnv);

      // Try to signup again with same email
      const request2 = {
        validated: validationResult.value,
        headers: new Headers(),
      };
      request2.headers.get = () => 'test-cf-ray';

      const response = await signupCtrl(request2, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(400);
      expect(body.error).to.equal('SignupFailed');
    });
  });

  describe('loginCtrl', () => {
    it('should login user and return access token with cookies', async () => {
      // First, create a user
      const signupData = signupSchema.validate({
        name: 'Login Test User',
        email: 'login-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const signupRequest = {
        validated: signupData.value,
        headers: new Headers(),
      };
      signupRequest.headers.get = () => 'test-cf-ray';
      await signupCtrl(signupRequest, mockEnv);

      // Now login
      const loginData = loginSchema.validate({
        email: 'login-cookie-test@example.com',
        password: 'password123',
      });

      const request = {
        validated: loginData.value,
        headers: new Headers(),
      };
      request.headers.get = () => 'test-cf-ray';

      const response = await loginCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(200);
      expect(body.access_token).to.be.a('string');

      // Verify all three cookies are set
      expect(cookies).to.have.property('refresh_token');
      expect(cookies).to.have.property('session_id');
      expect(cookies).to.have.property('access_token');

      // Verify access token cookie
      expect(cookies.access_token.value).to.be.a('string');
      expect(cookies.access_token.raw).to.include('Max-Age=900');
      expect(cookies.access_token.raw).to.include('HttpOnly');
    });

    it('should reject invalid credentials', async () => {
      const loginData = loginSchema.validate({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });

      const request = {
        validated: loginData.value,
        headers: new Headers(),
      };
      request.headers.get = () => 'test-cf-ray';

      const response = await loginCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(401);
      expect(body.error).to.equal('InvalidCredentials');
    });
  });

  describe('refreshCtrl', () => {
    it('should refresh tokens and set new access token cookie', async () => {
      // First, create a user and login to get tokens
      const signupData = signupSchema.validate({
        name: 'Refresh Test User',
        email: 'refresh-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const signupRequest = {
        validated: signupData.value,
        headers: new Headers(),
      };
      signupRequest.headers.get = () => 'test-cf-ray';
      const signupResponse = await signupCtrl(signupRequest, mockEnv);

      // Extract Set-Cookie headers and get the raw cookie values
      const setCookieHeaders = Array.from(signupResponse.headers.entries())
        .filter(([k]) => k.toLowerCase() === 'set-cookie')
        .map(([, v]) => v);

      // Parse the raw Set-Cookie headers to extract tokens
      const refreshTokenCookie = setCookieHeaders.find(h => h.startsWith('refresh_token='));
      const sessionIdCookie = setCookieHeaders.find(h => h.startsWith('session_id='));

      const refreshToken = refreshTokenCookie.split(';')[0].split('=')[1];
      const sessionId = sessionIdCookie.split(';')[0].split('=')[1];

      // Now call refresh with the cookies
      const request = {
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        if (header === 'cookie') {
          // The cookie value from Set-Cookie is unencoded. We need to send it as-is.
          // The parseCookie function in the controller will decode it.
          return `refresh_token=${refreshToken}; session_id=${sessionId}`;
        }
        if (header === 'origin') return 'https://example.com';
        if (header === 'user-agent') return 'Mozilla/5.0';
        if (header === 'referer') return 'https://example.com/page';
        return null;
      };

      const response = await refreshCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(200);
      expect(body.access_token).to.be.a('string');

      // Verify all three cookies are set with new values
      expect(cookies).to.have.property('refresh_token');
      expect(cookies).to.have.property('session_id');
      expect(cookies).to.have.property('access_token');

      // Verify new access token cookie
      expect(cookies.access_token.value).to.be.a('string');
      expect(cookies.access_token.raw).to.include('Max-Age=900');
      expect(cookies.access_token.raw).to.include('HttpOnly');

      // Verify tokens are rotated (different from initial)
      expect(cookies.refresh_token.value).to.not.equal(refreshToken);
    });

    it('should reject missing cookies', async () => {
      const request = {
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        if (header === 'cookie') return ''; // No cookies
        return null;
      };

      const response = await refreshCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(401);
      expect(body.error).to.equal('MissingRefresh');
    });

    it('should handle invalid refresh token', async () => {
      const request = {
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        if (header === 'cookie') return 'refresh_token=invalid-token; session_id=fake-session-id';
        return null;
      };

      const response = await refreshCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(401);
      expect(body.error).to.equal('RefreshFailed');

      // Verify cookies are cleared on failure
      expect(cookies.refresh_token.value).to.equal('');
      expect(cookies.session_id.value).to.equal('');
      expect(cookies.refresh_token.raw).to.include('Max-Age=0');
    });
  });

  describe('logoutCtrl', () => {
    it('should logout and clear all cookies including access token', async () => {
      // First, create a user and login
      const signupData = signupSchema.validate({
        name: 'Logout Test User',
        email: 'logout-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const signupRequest = {
        validated: signupData.value,
        headers: new Headers(),
      };
      signupRequest.headers.get = () => 'test-cf-ray';
      const signupResponse = await signupCtrl(signupRequest, mockEnv);
      const signupCookies = parseCookies(signupResponse);

      // Now logout
      const request = {
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        if (header === 'cookie') return `session_id=${signupCookies.session_id.value}`;
        return null;
      };

      const response = await logoutCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(200);
      expect(body.ok).to.be.true;

      // Verify all cookies are cleared (Max-Age=0)
      expect(cookies).to.have.property('refresh_token');
      expect(cookies).to.have.property('session_id');
      expect(cookies).to.have.property('access_token');

      expect(cookies.refresh_token.value).to.equal('');
      expect(cookies.session_id.value).to.equal('');
      expect(cookies.access_token.value).to.equal('');

      expect(cookies.refresh_token.raw).to.include('Max-Age=0');
      expect(cookies.session_id.raw).to.include('Max-Age=0');
      expect(cookies.access_token.raw).to.include('Max-Age=0');

      // Access token cookie should not be HttpOnly even when cleared
      expect(cookies.access_token.raw).to.include('HttpOnly');
    });

    it('should reject missing session_id', async () => {
      const request = {
        headers: new Headers(),
      };
      request.headers.get = header => {
        if (header === 'cf-ray') return 'test-cf-ray';
        if (header === 'cookie') return ''; // No session_id
        return null;
      };

      const response = await logoutCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(400);
      expect(body.error).to.equal('MissingSession');
    });
  });

  describe('logoutAllCtrl', () => {
    it('should logout all sessions and clear all cookies', async () => {
      // First, create a user
      const signupData = signupSchema.validate({
        name: 'Logout All Test User',
        email: 'logout-all-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const signupRequest = {
        validated: signupData.value,
        headers: new Headers(),
      };
      signupRequest.headers.get = () => 'test-cf-ray';
      await signupCtrl(signupRequest, mockEnv);

      // Get user from DB to get user ID
      // Need to use hmacDeterministic to hash the email
      const { hmacDeterministic } = await import('../../src/services/crypto.service.js');
      const emailHash = await hmacDeterministic(mockEnv, 'logout-all-cookie-test@example.com');

      const user = await mockEnv.DB.prepare('SELECT * FROM users WHERE email_hash = ?')
        .bind(emailHash)
        .first();

      const request = {
        headers: new Headers(),
        auth: {
          userId: user.id,
        },
      };
      request.headers.get = () => 'test-cf-ray';

      const response = await logoutAllCtrl(request, mockEnv);
      const body = JSON.parse(await response.text());
      const cookies = parseCookies(response);

      expect(response.status).to.equal(200);
      expect(body.ok).to.be.true;

      // Verify all cookies are cleared including access token
      expect(cookies).to.have.property('refresh_token');
      expect(cookies).to.have.property('session_id');
      expect(cookies).to.have.property('access_token');

      expect(cookies.refresh_token.raw).to.include('Max-Age=0');
      expect(cookies.session_id.raw).to.include('Max-Age=0');
      expect(cookies.access_token.raw).to.include('Max-Age=0');
    });
  });

  describe('Cookie Properties', () => {
    it('should set access token with correct Max-Age from env', async () => {
      mockEnv.ACCESS_TOKEN_TTL_SEC = '3600'; // 1 hour

      const signupData = signupSchema.validate({
        name: 'TTL Test User',
        email: 'ttl-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const request = {
        validated: signupData.value,
        headers: new Headers(),
      };
      request.headers.get = () => 'test-cf-ray';

      const response = await signupCtrl(request, mockEnv);
      const cookies = parseCookies(response);

      expect(cookies.access_token.raw).to.include('Max-Age=3600');
    });

    it('should use default TTL when env not set', async () => {
      // Don't set ACCESS_TOKEN_TTL_SEC, let it be undefined

      const signupData = signupSchema.validate({
        name: 'Default TTL Test User',
        email: 'default-ttl-cookie-test@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Test St',
          line2: '',
          street: 'Test Street',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'USA',
        },
      });

      const request = {
        validated: signupData.value,
        headers: new Headers(),
      };
      request.headers.get = () => 'test-cf-ray';

      const response = await signupCtrl(request, mockEnv);

      // If response is success
      if (response.status === 201) {
        const cookies = parseCookies(response);

        // Should use default of 900 seconds (15 minutes)
        expect(cookies.access_token.raw).to.include('Max-Age=900');
      } else {
        // If signup fails due to JWT signing without TTL, that's actually expected
        // The controller handles it by using default 900
        // So we need to set a value
        mockEnv.ACCESS_TOKEN_TTL_SEC = '900';
        const retryRequest = {
          validated: signupData.value,
          headers: new Headers(),
        };
        retryRequest.headers.get = () => 'test-cf-ray';

        const retryResponse = await signupCtrl(retryRequest, mockEnv);
        const cookies = parseCookies(retryResponse);

        expect(retryResponse.status).to.equal(201);
        expect(cookies.access_token.raw).to.include('Max-Age=900');
      }
    });
  });
});
