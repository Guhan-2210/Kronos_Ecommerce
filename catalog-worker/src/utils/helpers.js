/**
 * Utility helper functions
 */

/**
 * Generate unique ID using timestamp and random string
 */
export function generateId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(searchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Parse filter parameters
 */
export function parseFilterParams(searchParams) {
  return {
    q: searchParams.get('q') || undefined, // Search query
    brand: searchParams.get('brand') || undefined,
    gender: searchParams.get('gender') || undefined,
    material: searchParams.get('material') || undefined,
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined,
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'DESC',
  };
}

/**
 * Create success response
 */
export function successResponse(data, message = null, meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta,
  };
}

/**
 * Create error response
 */
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
 * Validate content type for image upload
 */
export function validateImageContentType(contentType) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  return allowedTypes.includes(contentType.toLowerCase());
}

/**
 * Extract filename from content-disposition header
 */
export function extractFilename(contentDisposition, defaultName = 'image.jpg') {
  if (!contentDisposition) {
    return defaultName;
  }

  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : defaultName;
}
