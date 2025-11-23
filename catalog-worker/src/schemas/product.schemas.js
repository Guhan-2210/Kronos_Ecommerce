import Joi from 'joi';

/**
 * Joi validation schemas for products
 */

// Case schema
const caseSchema = Joi.object({
  material: Joi.string(),
  diameter_mm: Joi.number().positive(),
  thickness_mm: Joi.number().positive(),
  lug_to_lug_mm: Joi.number().positive(),
  shape: Joi.string(),
  crystal: Joi.string(),
  back: Joi.string(),
  water_resistance_m: Joi.number().min(0),
  bezel: Joi.object({
    type: Joi.string(),
    material: Joi.string(),
    color: Joi.string(),
  }),
  crown: Joi.object({
    type: Joi.string(),
    position: Joi.string(),
  }),
});

// Movement schema
const movementSchema = Joi.object({
  type: Joi.string().valid('automatic', 'manual', 'quartz', 'spring drive', 'hybrid'),
  caliber: Joi.string(),
  power_reserve_hours: Joi.number().positive(),
  frequency_vph: Joi.number().positive(),
  jewels: Joi.number().integer().positive(),
  complications: Joi.array().items(Joi.string()),
});

// Dial schema
const dialSchema = Joi.object({
  color: Joi.string(),
  finish: Joi.string(),
  index_type: Joi.string(),
  hands_type: Joi.string(),
  lume: Joi.string(),
  subdials: Joi.number().integer().min(0),
  date_window_position: Joi.string().allow(''),
});

// Strap schema
const strapSchema = Joi.object({
  material: Joi.string(),
  color: Joi.string(),
  width_mm: Joi.number().positive(),
  clasp_type: Joi.string(),
  length_mm: Joi.number().positive(),
  interchangeable: Joi.boolean(),
});

// Create product schema
export const createProductSchema = Joi.object({
  name: Joi.string().required(),
  brand: Joi.string().required(),
  model: Joi.string().required(),
  sku: Joi.string().required(),
  reference_number: Joi.string(),
  collection: Joi.string(),
  gender: Joi.string().valid('men', 'women', 'unisex'),
  release_year: Joi.number().integer().min(1800).max(2100),
  discontinued: Joi.boolean(),
  case: caseSchema,
  movement: movementSchema,
  dial: dialSchema,
  strap: strapSchema,
  colors: Joi.object({
    case_color: Joi.string(),
    dial_color: Joi.string(),
    strap_color: Joi.string(),
    bezel_color: Joi.string(),
  }),
  dimensions: Joi.object({
    weight_grams: Joi.number().positive(),
    case_diameter_mm: Joi.number().positive(),
    case_thickness_mm: Joi.number().positive(),
  }),
  features: Joi.object({
    shock_resistant: Joi.boolean(),
    anti_magnetic: Joi.boolean(),
    chronometer_certified: Joi.string(),
    smartwatch: Joi.boolean(),
    connected_features: Joi.array().items(Joi.string()),
  }),
  authenticity: Joi.object({
    box_included: Joi.boolean(),
    papers_included: Joi.boolean(),
    warranty_card: Joi.boolean(),
    original_purchase_receipt: Joi.boolean(),
    service_history: Joi.array().items(Joi.string()),
  }),
  media: Joi.object({
    image: Joi.string().uri(),
  }),
});

// Update product schema (all fields optional except constraints)
export const updateProductSchema = Joi.object({
  name: Joi.string(),
  brand: Joi.string(),
  model: Joi.string(),
  sku: Joi.string(),
  reference_number: Joi.string(),
  collection: Joi.string(),
  gender: Joi.string().valid('men', 'women', 'unisex'),
  release_year: Joi.number().integer().min(1800).max(2100),
  discontinued: Joi.boolean(),
  case: caseSchema,
  movement: movementSchema,
  dial: dialSchema,
  strap: strapSchema,
  colors: Joi.object(),
  dimensions: Joi.object(),
  features: Joi.object(),
  authenticity: Joi.object(),
  media: Joi.object(),
}).min(1); // At least one field must be provided
