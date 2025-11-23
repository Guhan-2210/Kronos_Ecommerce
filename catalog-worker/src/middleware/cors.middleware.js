// CORS Middleware for Catalog Worker
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173', // HTTPS localhost for secure cookie support
  'http://localhost:4173',
  'https://localhost:4173',
  'https://main.kronos-311.pages.dev',
  'https://kronos-311.pages.dev',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');

  // Allow the origin if it's in the allowed list, otherwise default to production origin
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCors(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }
  return null;
}

export function addCorsHeaders(response, request) {
  const newResponse = new Response(response.body, response);
  const headers = getCorsHeaders(request);

  Object.entries(headers).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}
