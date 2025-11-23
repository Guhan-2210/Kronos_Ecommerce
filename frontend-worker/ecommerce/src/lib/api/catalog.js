// Catalog/Products API Service
import { API_CONFIG } from '../config.js';

class CatalogAPI {
  constructor() {
    this.baseURL = API_CONFIG.CATALOG_API;
  }

  /**
   * Get all products with optional filtering
   */
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseURL}/api/products${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch products');
    }

    return data;
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId) {
    const response = await fetch(`${this.baseURL}/api/products/${productId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Product not found');
    }

    return data;
  }

  /**
   * Search products
   */
  async searchProducts(query, params = {}) {
    const searchParams = new URLSearchParams({ q: query, ...params });
    const response = await fetch(`${this.baseURL}/api/products?${searchParams.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Search failed');
    }

    return data;
  }
}

export const catalogAPI = new CatalogAPI();
