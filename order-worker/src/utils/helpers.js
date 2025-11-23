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

/**
 * Calculate order totals
 */
export function calculateOrderTotals(products, deliveryCost = 0, tax = 0) {
  const subtotal = products.reduce((sum, product) => {
    return sum + product.price * product.quantity;
  }, 0);

  const totalTax = tax || subtotal * 0.08; // 8% default tax
  const total = subtotal + deliveryCost + totalTax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    delivery_cost: Math.round(deliveryCost * 100) / 100,
    tax: Math.round(totalTax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Validate order data structure
 */
export function validateOrderData(orderData) {
  const required = ['products', 'shipping_address', 'billing_address', 'delivery_mode', 'costs'];

  for (const field of required) {
    if (!orderData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
    throw new Error('Order must contain at least one product');
  }

  return true;
}
