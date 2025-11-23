// src/middleware/validate.middleware.js
export const validateBody = schema => async (request, env, ctx) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return new Response(JSON.stringify({ error: 'ValidationError', details: error.details }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    request.validated = value;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
