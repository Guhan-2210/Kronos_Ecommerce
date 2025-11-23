/**
 * Database utility functions
 */

export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

export async function executeQuery(db, query, params = []) {
  try {
    const result = await db
      .prepare(query)
      .bind(...params)
      .run();
    return result;
  } catch (error) {
    throw new DatabaseError(`Database query failed: ${error.message}`, error);
  }
}

export async function fetchOne(db, query, params = []) {
  try {
    const result = await db
      .prepare(query)
      .bind(...params)
      .first();
    return result;
  } catch (error) {
    throw new DatabaseError(`Database fetch failed: ${error.message}`, error);
  }
}

export async function fetchAll(db, query, params = []) {
  try {
    const { results } = await db
      .prepare(query)
      .bind(...params)
      .all();
    return results || [];
  } catch (error) {
    throw new DatabaseError(`Database fetch all failed: ${error.message}`, error);
  }
}
