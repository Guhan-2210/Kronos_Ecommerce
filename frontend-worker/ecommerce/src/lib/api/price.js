// Price API Service
import { API_CONFIG } from '../config.js';

class PriceAPI {
  constructor() {
    this.baseURL = API_CONFIG.PRICE_API;
  }

  /**
   * Get price for a single product
   */
  async getPrice(productId) {
    const response = await fetch(`${this.baseURL}/api/prices/product/${productId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch price');
    }

    return data;
  }

  /**
   * Get prices for multiple products
   */
  async getPrices(productIds) {
    const response = await fetch(`${this.baseURL}/api/prices/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ product_ids: productIds })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch prices');
    }

    return data;
  }
}

export const priceAPI = new PriceAPI();
