// Cart Store
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { cartAPI } from '../api/cart.js';
import { auth } from './auth.js';

// Create cart store
function createCartStore() {
  const { subscribe, set, update } = writable({
    cart: null,
    cartId: null,
    isLoading: false,
    error: null
  });

  // Initialize from localStorage on browser
  if (browser) {
    const cartId = localStorage.getItem('cart_id');
    if (cartId) {
      set({
        cart: null,
        cartId,
        isLoading: false,
        error: null
      });
    }
  }

  return {
    subscribe,
    
    /**
     * Add product to cart
     */
    async addToCart(product, userData, zipcode = '600002') {
      const authState = get(auth);
      
      if (!authState.isAuthenticated || !authState.token) {
        return { success: false, error: 'Please login to add items to cart' };
      }

      // Ensure we have user email
      const userEmail = userData?.email || authState.user?.email;
      const userName = userData?.name || authState.user?.name;
      
      if (!userEmail) {
        console.error('Auth state:', authState);
        return { success: false, error: 'User email not found. Please try logging in again.' };
      }

      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const cartData = {
          user_data: {
            email: userEmail,
            name: userName,
            phone: userData?.phone
          },
          product_id: product.id,
          sku: product.sku || '',
          name: product.name,
          brand: product.brand || '',
          image: product.image_url || product.images?.[0] || '',
          quantity: product.quantity || 1,
          zipcode
        };

        console.log('Adding to cart:', cartData);
        const response = await cartAPI.addToCart(cartData);
        const cart = response.data;

        // Store cart ID
        if (browser && cart.id) {
          localStorage.setItem('cart_id', cart.id);
        }

        update(state => ({
          ...state,
          cart,
          cartId: cart.id,
          isLoading: false
        }));

        return { success: true, cart };
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Load cart by ID
     */
    async loadCart(cartId) {
      const authState = get(auth);
      
      if (!authState.isAuthenticated || !authState.token) {
        return { success: false, error: 'Authentication required' };
      }

      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const response = await cartAPI.getCart(cartId);
        const cart = response.data;

        update(state => ({
          ...state,
          cart,
          cartId: cart.id,
          isLoading: false
        }));

        return { success: true, cart };
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Update product quantity
     */
    async updateQuantity(productId, quantity) {
      const authState = get(auth);
      const cartState = get({ subscribe });

      if (!cartState.cartId) {
        return { success: false, error: 'No active cart' };
      }

      update(state => ({ ...state, isLoading: true }));

      try {
        const response = await cartAPI.updateQuantity(
          cartState.cartId,
          productId,
          quantity
        );

        update(state => ({
          ...state,
          cart: response.data,
          isLoading: false
        }));

        return { success: true, cart: response.data };
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Remove item from cart
     */
    async removeItem(productId) {
      const authState = get(auth);
      const cartState = get({ subscribe });

      if (!cartState.cartId) {
        return { success: false, error: 'No active cart' };
      }

      update(state => ({ ...state, isLoading: true }));

      try {
        const response = await cartAPI.removeItem(
          cartState.cartId,
          productId
        );

        update(state => ({
          ...state,
          cart: response.data,
          isLoading: false
        }));

        return { success: true, cart: response.data };
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Clear cart
     */
    clearCart() {
      if (browser) {
        localStorage.removeItem('cart_id');
      }
      
      set({
        cart: null,
        cartId: null,
        isLoading: false,
        error: null
      });
    }
  };
}

export const cart = createCartStore();

// Derived store for cart item count
export const cartItemCount = derived(cart, $cart => {
  if (!$cart.cart || !$cart.cart.product_data) return 0;
  return $cart.cart.product_data.reduce((sum, item) => sum + item.quantity, 0);
});

// Derived store for cart total
export const cartTotal = derived(cart, $cart => {
  if (!$cart.cart || !$cart.cart.product_data) return 0;
  return $cart.cart.product_data.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
});
