import { expect } from 'chai';
import { handleCors, addCorsHeaders } from '../../src/middleware/cors.middleware.js';

describe('CORS Middleware', () => {
  describe('handleCors', () => {
    it('should return 204 response for OPTIONS requests', () => {
      const request = new Request('http://example.com', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      });

      const response = handleCors(request);

      expect(response).to.not.be.null;
      expect(response.status).to.equal(204);
    });

    it('should return null for non-OPTIONS requests', () => {
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' },
      });

      const response = handleCors(request);

      expect(response).to.be.null;
    });

    it('should include CORS headers in OPTIONS response', () => {
      const request = new Request('http://example.com', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      });

      const response = handleCors(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).to.include('GET');
      expect(response.headers.get('Access-Control-Allow-Credentials')).to.equal('true');
    });
  });

  describe('addCorsHeaders', () => {
    it('should add CORS headers to response', () => {
      const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const request = new Request('http://example.com', {
        headers: { Origin: 'http://localhost:5173' },
      });

      const newResponse = addCorsHeaders(originalResponse, request);

      expect(newResponse.headers.get('Access-Control-Allow-Origin')).to.equal(
        'http://localhost:5173'
      );
      expect(newResponse.headers.get('Access-Control-Allow-Credentials')).to.equal('true');
    });

    it('should preserve original response body and status', async () => {
      const originalResponse = new Response('Test body', { status: 201 });
      const request = new Request('http://example.com', {
        headers: { Origin: 'http://localhost:5173' },
      });

      const newResponse = addCorsHeaders(originalResponse, request);

      expect(newResponse.status).to.equal(201);
      expect(await newResponse.text()).to.equal('Test body');
    });
  });
});
