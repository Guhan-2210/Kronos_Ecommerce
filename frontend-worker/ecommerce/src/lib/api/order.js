// Order API Service (via Cart Worker)
import { API_CONFIG } from '../config.js';
import { authenticatedAPI } from './client.js';

class OrderAPI {
  constructor() {
    // Use CART_API instead of ORDER_API to avoid CORS issues
    // Cart worker proxies requests to order-worker via service binding
    this.client = authenticatedAPI(API_CONFIG.CART_API);
  }

  /**
   * Get user's orders (via cart-worker proxy)
   * No userId needed - extracted from auth token
   */
  async getUserOrders() {
    const response = await this.client.get('/api/orders/my-orders');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch orders');
    }

    return data;
  }

  /**
   * Get order by ID
   * Note: This would need a similar proxy endpoint if needed
   */
  async getOrder(orderId) {
    const response = await this.client.get(`/api/orders/${orderId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Order not found');
    }

    return data;
  }

  /**
   * Cancel an order (releases reservations immediately)
   */
  async cancelOrder(orderId) {
    const response = await this.client.post(`/api/orders/${orderId}/cancel`, {});
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to cancel order');
    }

    return data;
  }
}

export const orderAPI = new OrderAPI();

