import Joi from 'joi';

/**
 * Joi validation schemas for price operations
 */

// Set/Update price schema
export const setPriceSchema = Joi.object({
  product_id: Joi.string().required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().default('INR'),
});

// Batch get prices schema
export const batchPricesSchema = Joi.object({
  product_ids: Joi.array().items(Joi.string()).min(1).max(100).required(),
});
