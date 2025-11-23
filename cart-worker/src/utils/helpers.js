/**
 * Utility helper functions
 */

export function generateId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
}

export function successResponse(data, message = null, meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta,
  };
}

export function errorResponse(message, statusCode = 500, details = null) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      details,
    },
  };
}

/**
 * Call external service (Price or Fulfilment)
 */
export async function callService(serviceUrl, endpoint, method = 'POST', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${serviceUrl}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Service call failed');
    }

    return data;
  } catch (error) {
    console.error(`Service call error (${serviceUrl}${endpoint}):`, error);
    throw error;
  }
}
