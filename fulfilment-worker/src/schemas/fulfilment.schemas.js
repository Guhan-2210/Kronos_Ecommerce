import Joi from 'joi';

/**
 * Joi validation schemas for fulfilment operations
 */

// Check stock schema
export const checkStockSchema = Joi.object({
  product_id: Joi.string().required(),
  zipcode: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
});

// Batch stock check schema
export const batchStockSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .max(50)
    .required(),
  zipcode: Joi.string().required(),
});

// Delivery options schema
export const deliveryOptionsSchema = Joi.object({
  zipcode: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string(),
        quantity: Joi.number().integer().min(1).default(1),
        warehouse_id: Joi.string().optional(), // Required for EXPRESS filtering
      })
    )
    .default([]),
});

// Reserve stock schema
export const reserveStockSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  zipcode: Joi.string().required(),
});
