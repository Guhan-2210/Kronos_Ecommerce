/**
 * CORS middleware for order worker
 * Note: This worker should primarily be accessed via service bindings,
 * but CORS is included for development/testing
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173', // HTTPS localhost for secure cookie support
  'http://localhost:4173',
  'https://localhost:4173',
  'https://ecommerce-frontend.guhan2210.workers.dev', // Production frontend worker
  'http://localhost:3000',
  'http://localhost:8788',
  'http://localhost:8789',
];

export function handleCors(request) {
  const origin = request.headers.get('Origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true', // Required for cookie sharing
      },
    });
  }

  return new Response(null, { status: 204 });
}

export function addCorsHeaders(response, request) {
  const origin = request.headers.get('Origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}
