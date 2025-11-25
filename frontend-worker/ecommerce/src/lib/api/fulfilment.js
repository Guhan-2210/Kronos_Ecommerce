// Fulfilment API Service
import { API_CONFIG } from '../config.js';

class FulfilmentAPI {
  constructor() {
    this.baseURL = API_CONFIG.FULFILMENT_API;
  }

  /**
   * Check general stock availability across all warehouses (no zipcode needed)
   * Use this when you just want to know if stock exists anywhere
   */
  async checkGeneralStock(productId, quantity = 1) {
    const response = await fetch(`${this.baseURL}/api/stock/check-general`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        quantity
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to check general stock');
    }

    return data;
  }

  /**
   * Check stock availability for a product at a specific location
   */
  async checkStock(productId, zipcode, quantity = 1) {
    const response = await fetch(`${this.baseURL}/api/stock/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        zipcode,
        quantity
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to check stock');
    }

    return data;
  }

  /**
   * Check stock for multiple products
   */
  async checkBatchStock(items, zipcode) {
    const response = await fetch(`${this.baseURL}/api/stock/check-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        zipcode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to check batch stock');
    }

    return data;
  }

  /**
   * Get delivery options for a zipcode
   */
  async getDeliveryOptions(zipcode, items = []) {
    const response = await fetch(`${this.baseURL}/api/delivery/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zipcode,
        items
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch delivery options');
    }

    return data;
  }

  /**
   * Reserve stock for cart (requires authentication)
   */
  async reserveStock(items, zipcode) {
    const response = await fetch(`${this.baseURL}/api/stock/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Send cookies (access_token)
      body: JSON.stringify({
        items,
        zipcode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to reserve stock');
    }

    return data;
  }

  /**
   * Release stock reservations (requires authentication)
   */
  async releaseStock(reservations) {
    const response = await fetch(`${this.baseURL}/api/stock/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Send cookies (access_token)
      body: JSON.stringify({
        reservations
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to release stock');
    }

    return data;
  }
}

export const fulfilmentAPI = new FulfilmentAPI();
