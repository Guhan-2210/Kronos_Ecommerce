<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.js';
  import { cart, cartItemCount, cartTotal } from '$lib/stores/cart.js';
  import CartItem from '$lib/components/CartItem.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let loading = false;
  let updating = false;
  let error = null;
  let successMessage = '';

  async function loadCartData() {
    // Load cart if we have a cartId
    if ($cart.cartId) {
      loading = true;
      const result = await cart.loadCart($cart.cartId);
      loading = false;

      if (!result.success) {
        error = result.error;
      }
    }
  }

  onMount(async () => {
    // Wait for auth initialization
    if ($auth.isLoading) {
      // Subscribe to auth changes
      const unsubscribe = auth.subscribe((authState) => {
        if (!authState.isLoading) {
          unsubscribe();
          if (!authState.isAuthenticated) {
            goto('/auth/login?redirect=/cart');
            return;
          }
          // Continue with cart logic
          loadCartData();
        }
      });
    } else if (!$auth.isAuthenticated) {
      goto('/auth/login?redirect=/cart');
      return;
    } else {
      // Continue with cart logic
      loadCartData();
    }
  });

  async function handleUpdateQuantity(event) {
    updating = true;
    error = null;
    
    const result = await cart.updateQuantity(event.detail.productId, event.detail.quantity);
    
    if (!result.success) {
      error = result.error || 'Failed to update quantity';
    }
    
    updating = false;
  }

  async function handleRemoveItem(event) {
    updating = true;
    error = null;
    
    const result = await cart.removeItem(event.detail.productId);
    
    if (result.success) {
      successMessage = 'Item removed from cart';
      setTimeout(() => successMessage = '', 3000);
    } else {
      error = result.error || 'Failed to remove item';
    }
    
    updating = false;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  function proceedToCheckout() {
    if ($cart.cart && $cart.cart.product_data && $cart.cart.product_data.length > 0) {
      goto('/checkout');
    }
  }
</script>

<svelte:head>
  <title>Shopping Cart - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

  <!-- Messages -->
  {#if error}
    <div class="mb-6">
      <Alert type="error" message={error} on:dismiss={() => error = null} />
    </div>
  {/if}
  {#if successMessage}
    <div class="mb-6">
      <Alert type="success" message={successMessage} on:dismiss={() => successMessage = ''} />
    </div>
  {/if}

  {#if loading}
    <Loading text="Loading your cart..." />
  {:else if !$cart.cart || !$cart.cart.product_data || $cart.cart.product_data.length === 0}
    <!-- Empty Cart -->
    <div class="text-center py-16">
      <svg class="w-32 h-32 text-slate-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h2 class="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
      <p class="text-slate-600 mb-8">Start adding some products to your cart!</p>
      <a
        href="/products"
        class="inline-block px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
      >
        Continue Shopping
      </a>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Cart Items -->
      <div class="lg:col-span-2 space-y-4">
        {#each $cart.cart.product_data as item (item.product_id)}
          <CartItem
            {item}
            {updating}
            on:updateQuantity={handleUpdateQuantity}
            on:remove={handleRemoveItem}
          />
        {/each}
      </div>

      <!-- Order Summary -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-md p-6 sticky top-24">
          <h2 class="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

          <div class="space-y-4 mb-6">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal ({$cartItemCount} {$cartItemCount === 1 ? 'item' : 'items'})</span>
              <span class="font-medium text-slate-900">{formatPrice($cartTotal)}</span>
            </div>

            {#if $cart.cart.shipping_address}
              <div class="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span class="font-medium text-slate-900">Calculated at checkout</span>
              </div>
            {/if}

            <div class="border-t border-slate-200 pt-4">
              <div class="flex justify-between items-baseline">
                <span class="text-lg font-semibold text-slate-900">Total</span>
                <span class="text-2xl font-bold text-slate-900">{formatPrice($cartTotal)}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">Inclusive of all taxes</p>
            </div>
          </div>

          <!-- Checkout Button -->
          <button
            on:click={proceedToCheckout}
            disabled={updating}
            class="w-full px-6 py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors mb-4"
          >
            Proceed to Checkout
          </button>

          <!-- Continue Shopping -->
          <a
            href="/products"
            class="block text-center px-6 py-3 text-slate-700 hover:text-slate-900 font-medium transition-colors"
          >
            Continue Shopping
          </a>

          <!-- Security Badge -->
          <div class="mt-6 pt-6 border-t border-slate-200">
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

