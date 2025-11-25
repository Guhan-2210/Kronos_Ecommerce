// CORS Middleware for Auth Worker
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173', // HTTPS localhost for secure cookie support
  'http://localhost:4173',
  'https://localhost:4173',
  'https://ecommerce-frontend.guhan2210.workers.dev', // Production frontend worker ✅
  'https://main.kronos-311.pages.dev',
  'https://preview.kronos-311.pages.dev',
  'https://production.kronos-311.pages.dev',
  'https://kronos-311.pages.dev',
];

// Also allow any preview branch URLs (format: https://<hash>.kronos-311.pages.dev)
function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  // Allow any preview branch from pages.dev
  if (origin && origin.match(/^https:\/\/[a-z0-9-]+\.kronos-311\.pages\.dev$/)) {
    return true;
  }
  return false;
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');

  // Only allow explicitly approved origins (no fallback for security)
  // If origin is not in the allowed list, default to the first production URL
  // This ensures CORS works while maintaining security
  const allowedOrigin =
    origin && isAllowedOrigin(origin) ? origin : 'https://main.kronos-311.pages.dev';

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
