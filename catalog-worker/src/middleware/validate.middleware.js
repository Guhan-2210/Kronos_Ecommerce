import Joi from 'joi';
import { errorResponse } from '../utils/helpers.js';

/**
 * Joi validation middleware for itty-router
 */

export function validateBody(schema) {
  return async (request, env, ctx) => {
    try {
      // Skip validation for multipart/form-data
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        return; // Continue to next handler
      }

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

export function validateQuery(schema) {
  return async (request, env, ctx) => {
    try {
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams);

      const { error, value } = schema.validate(queryParams, { abortEarly: false });

      if (error) {
        const details = error.details.map(d => d.message);
        return new Response(JSON.stringify(errorResponse('Validation failed', 400, details)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      request.validatedQuery = value;
    } catch (err) {
      return new Response(JSON.stringify(errorResponse('Query validation failed', 400)), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
