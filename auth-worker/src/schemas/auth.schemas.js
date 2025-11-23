// src/schemas/auth.schemas.js
import Joi from 'joi';

export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email({ tlds: false }).required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().min(7).max(20).required(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().allow(''),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: false }).required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  session_id: Joi.string().uuid().required(), // we keep session id in cookie as well or in body/header
});
