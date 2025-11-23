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
