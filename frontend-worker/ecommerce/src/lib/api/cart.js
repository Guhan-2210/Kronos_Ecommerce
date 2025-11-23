// Cart API Service
import { API_CONFIG } from '../config.js';
import { authenticatedAPI } from './client.js';

class CartAPI {
  constructor() {
    this.client = authenticatedAPI(API_CONFIG.CART_API);
  }

  /**
   * Add product to cart
   */
  async addToCart(product) {
    const response = await this.client.post('/api/cart/add', product);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to add to cart');
    }

    return data;
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId) {
    const response = await this.client.get(`/api/cart/${cartId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch cart');
    }

    return data;
  }

  /**
   * Update product quantity
   */
  async updateQuantity(cartId, productId, quantity) {
    const response = await this.client.post(`/api/cart/${cartId}/update-quantity`, {
      product_id: productId,
      quantity
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to update quantity');
    }

    return data;
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId, productId) {
    const response = await this.client.post(`/api/cart/${cartId}/remove-item`, {
      product_id: productId
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to remove item');
    }

    return data;
  }

  /**
   * Add shipping address
   */
  async addShippingAddress(cartId, address) {
    const response = await this.client.post(`/api/cart/${cartId}/shipping-address`, address);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to add shipping address');
    }

    return data;
  }

  /**
   * Add billing address
   */
  async addBillingAddress(cartId, address, sameAsShipping) {
    const response = await this.client.post(`/api/cart/${cartId}/billing-address`, {
      ...address,
      same_as_shipping: sameAsShipping
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to add billing address');
    }

    return data;
  }

  /**
   * Get order summary
   */
  async getOrderSummary(cartId) {
    const response = await this.client.get(`/api/cart/${cartId}/summary`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch order summary');
    }

    return data;
  }

  /**
   * Update cart status
   */
  async updateStatus(cartId, status) {
    const response = await this.client.post(`/api/cart/${cartId}/status`, {
      status
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to update cart status');
    }

    return data;
  }

  /**
   * Clear/delete cart
   */
  async clearCart(cartId) {
    const response = await this.client.delete(`/api/cart/${cartId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to clear cart');
    }

    return data;
  }

  /**
   * Place order (initiate payment)
   */
  async placeOrder(cartId, deliveryMode = 'standard') {
    const response = await this.client.post(`/api/cart/${cartId}/place-order`, {
      delivery_mode: deliveryMode
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to place order');
    }

    return data;
  }

  /**
   * Complete order (after PayPal approval)
   */
  async completeOrder(orderId, paypalOrderId) {
    const response = await this.client.post('/api/cart/complete-order', {
      order_id: orderId,
      paypal_order_id: paypalOrderId
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to complete order');
    }

    return data;
  }
}

export const cartAPI = new CartAPI();
