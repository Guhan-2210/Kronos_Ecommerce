<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { orderAPI } from '$lib/api/order.js';

  let isPopup = false;

  onMount(async () => {
    // Check if we're running in a popup window
    isPopup = window.opener && window.opener !== window;
    
    // Try to cancel the order and release reservations
    const pendingOrderStr = sessionStorage.getItem('pending_order');
    if (pendingOrderStr) {
      try {
        const pendingOrder = JSON.parse(pendingOrderStr);
        console.log('🚫 Payment cancelled, releasing reservations for order:', pendingOrder.order_id);
        
        // Cancel the order (this will release reservations)
        await orderAPI.cancelOrder(pendingOrder.order_id);
        console.log('✅ Order cancelled and reservations released');
      } catch (error) {
        console.error('Failed to cancel order:', error);
        // Continue anyway - reservations will expire via TTL
      }
    }
    
    if (isPopup && window.opener) {
      console.log('🚫 Payment cancelled in popup, notifying parent window');
      
      // Notify parent window that payment was cancelled
      window.opener.postMessage({
        type: 'PAYMENT_CANCELLED',
        message: 'Payment was cancelled'
      }, window.location.origin);
      
      // Close popup after a brief delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // Clean up any pending order data (only if not in popup)
      sessionStorage.removeItem('pending_order');
    }
  });
</script>

<svelte:head>
  <title>Payment Cancelled - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-md p-8 text-center">
      <!-- Cancel Icon -->
      <div class="w-20 h-20 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
        <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h1 class="text-3xl font-bold text-slate-900 mb-4">Payment Cancelled</h1>
      
      <p class="text-lg text-slate-600 mb-6">
        You have cancelled the payment process. No charges have been made to your account.
      </p>
      
      {#if isPopup}
        <p class="text-blue-600 text-sm mb-6">
          This window will close automatically...
        </p>
      {/if}
      
      <div class="bg-slate-50 rounded-lg p-6 mb-8">
        <p class="text-slate-700">
          Your cart has been preserved. You can return to checkout whenever you're ready to complete your purchase.
        </p>
      </div>
      
      <div class="space-y-4 text-slate-600 mb-8">
        <p class="flex items-center justify-center">
          <svg class="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Your cart items are safe
        </p>
        <p class="flex items-center justify-center">
          <svg class="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          No payment was processed
        </p>
      </div>
      
      <div class="flex gap-4 justify-center">
        <button
          on:click={() => goto('/cart')}
          class="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
        >
          Back to Cart
        </button>
        <button
          on:click={() => goto('/checkout')}
          class="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</div>

