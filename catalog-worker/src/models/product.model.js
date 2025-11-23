import { executeQuery, fetchOne, fetchAll } from './db.js';

/**
 * Product model for database operations
 */

export const ProductModel = {
  /**
   * Create a new product
   */
  async create(db, id, productData) {
    const query = `
      INSERT INTO products (id, product_data, created_at, updated_at)
      VALUES (?, ?, unixepoch(), unixepoch())
    `;

    await executeQuery(db, query, [id, JSON.stringify(productData)]);

    return await this.getById(db, id);
  },

  /**
   * Get product by ID
   */
  async getById(db, id) {
    const query = 'SELECT * FROM products WHERE id = ?';
    const product = await fetchOne(db, query, [id]);

    if (!product) return null;

    return {
      ...product,
      product_data: JSON.parse(product.product_data),
    };
  },

  /**
   * Get all products with pagination and filters
   */
  async getAll(db, options = {}) {
    const {
      limit = 10,
      offset = 0,
      q,
      brand,
      gender,
      minPrice,
      maxPrice,
      material,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = options;

    const conditions = [];
    const params = [];

    // Build WHERE clause based on filters

    // Search query - search in product name, brand, model, and description
    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(`(
        json_extract(product_data, '$.name') LIKE ? OR
        json_extract(product_data, '$.brand') LIKE ? OR
        json_extract(product_data, '$.model') LIKE ? OR
        json_extract(product_data, '$.meta.description') LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (brand) {
      conditions.push("json_extract(product_data, '$.brand') = ?");
      params.push(brand);
    }

    if (gender) {
      conditions.push("json_extract(product_data, '$.gender') = ?");
      params.push(gender);
    }

    if (material) {
      conditions.push("json_extract(product_data, '$.case.material') LIKE ?");
      params.push(`%${material}%`);
    }

    // Note: Price filtering would require price field in product_data
    if (minPrice !== undefined) {
      conditions.push("CAST(json_extract(product_data, '$.price') AS REAL) >= ?");
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      conditions.push("CAST(json_extract(product_data, '$.price') AS REAL) <= ?");
      params.push(maxPrice);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await fetchOne(db, countQuery, params);
    const total = countResult.total;

    // Get paginated results
    const query = `
      SELECT * FROM products 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const results = await fetchAll(db, query, [...params, limit, offset]);

    return {
      data: results.map(row => ({
        ...row,
        product_data: JSON.parse(row.product_data),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  },

  /**
   * Update product by ID
   */
  async update(db, id, productData) {
    const query = `
      UPDATE products 
      SET product_data = ?, updated_at = unixepoch()
      WHERE id = ?
    `;

    await executeQuery(db, query, [JSON.stringify(productData), id]);

    return await this.getById(db, id);
  },

  /**
   * Delete product by ID
   */
  async delete(db, id) {
    const query = 'DELETE FROM products WHERE id = ?';
    const result = await executeQuery(db, query, [id]);
    return result.success;
  },

  /**
   * Check if product exists
   */
  async exists(db, id) {
    const query = 'SELECT 1 FROM products WHERE id = ? LIMIT 1';
    const result = await fetchOne(db, query, [id]);
    return !!result;
  },
};
