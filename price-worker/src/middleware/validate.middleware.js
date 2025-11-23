import Joi from 'joi';
import { errorResponse } from '../utils/helpers.js';

/**
 * Joi validation middleware for itty-router
 */

export function validateBody(schema) {
  return async (request, env, ctx) => {
    try {
      const body = await request.json();
      const { error, value } = schema.validate(body, { abortEarly: false });

      if (error) {
        const details = error.details.map(d => d.message);
        return new Response(JSON.stringify(errorResponse('Validation failed', 400, details)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Attach validated data to request
      request.validatedData = value;
    } catch (err) {
      return new Response(JSON.stringify(errorResponse('Invalid JSON body', 400)), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
