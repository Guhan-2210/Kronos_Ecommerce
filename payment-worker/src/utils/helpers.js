/**
 * Generate unique ID with prefix
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Success response helper
 */
export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Error response helper
 */
export function errorResponse(message, statusCode = 400, details = null) {
  const response = {
    success: false,
    error: message,
    statusCode,
  };

  if (details) {
    response.details = details;
  }

  return response;
}
