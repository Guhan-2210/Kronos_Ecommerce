import Joi from 'joi';

/**
 * Joi validation schemas for cart operations
 */

// Add to cart schema
// Note: user_id is extracted from JWT token, not from request body
export const addToCartSchema = Joi.object({
  user_data: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required(), // Disable TLD validation for Cloudflare Workers
    name: Joi.string(),
    phone: Joi.string(),
  }).required(),
  product_id: Joi.string().required(),
  sku: Joi.string(),
  name: Joi.string(),
  brand: Joi.string(),
  image: Joi.string().uri(),
  quantity: Joi.number().integer().min(1).required(),
  zipcode: Joi.string(),
});

// Update quantity schema
export const updateQuantitySchema = Joi.object({
  product_id: Joi.string().required(),
  quantity: Joi.number().integer().min(0).required(),
});

// Remove item schema
export const removeItemSchema = Joi.object({
  product_id: Joi.string().required(),
});

// Shipping address schema
export const shippingAddressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zipcode: Joi.string().required(),
  country: Joi.string().required(),
});

// Billing address schema
export const billingAddressSchema = Joi.object({
  street: Joi.string(),
  city: Joi.string(),
  state: Joi.string(),
  zipcode: Joi.string(),
  country: Joi.string(),
  same_as_shipping: Joi.boolean().optional(),
});

// Update status schema
export const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'abandoned', 'checked_out').required(),
});
