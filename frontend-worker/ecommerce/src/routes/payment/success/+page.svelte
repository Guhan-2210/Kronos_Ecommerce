<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth.js';
  import { cart } from '$lib/stores/cart.js';
  import { cartAPI } from '$lib/api/cart.js';
  import Loading from '$lib/components/Loading.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let loading = true;
  let error = null;
  let orderConfirmed = false;
  let orderDetails = null;
  let authReady = false;
  let isPopup = false;

  // Check if we're running in a popup window
  if (typeof window !== 'undefined') {
    isPopup = window.opener && window.opener !== window;
    console.log('🪟 Running in popup:', isPopup);
  }

  // Wait for auth to be initialized before attempting to complete order
  $: if ($auth.initialized && !authReady) {
    console.log('🔐 Auth initialized, ready to complete order', {
      isAuthenticated: $auth.isAuthenticated,
      hasToken: !!$auth.token,
      user: $auth.user?.email
    });
    authReady = true;
    completeOrder();
  }

  async function completeOrder() {
    console.log('📦 Starting order completion...', {
      authInitialized: $auth.initialized,
      isAuthenticated: $auth.isAuthenticated,
      hasToken: !!$auth.token,
      isPopup: isPopup
    });

    // Don't proceed if auth isn't ready or not authenticated
    if (!$auth.initialized) {
      console.error('❌ Auth not initialized yet');
      error = 'Authentication is loading. Please wait...';
      loading = false;
      return;
    }

    if (!$auth.isAuthenticated) {
      console.error('❌ User not authenticated');
      error = 'Please login to complete your order';
      loading = false;
      return;
    }

    try {
      // Get PayPal order ID from URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const paypalOrderId = urlParams.get('token'); // PayPal uses 'token' param
      const payerId = urlParams.get('PayerID'); // PayPal payer ID
      const urlOrderId = urlParams.get('order_id'); // From parent window redirect
      const statusParam = urlParams.get('status'); // From parent window redirect
      
      console.log('📝 Payment details:', { paypalOrderId, payerId, urlOrderId, statusParam });
      
      // Check if order was already completed (redirected from popup)
      if (statusParam === 'completed' && urlOrderId) {
        // Order already processed in popup, just show success
        console.log('✅ Order already completed in popup, showing success');
        
        // Mark as processed and show success
        sessionStorage.setItem(`order_processed_${urlOrderId}`, 'true');
        sessionStorage.removeItem('pending_order');
        
        orderConfirmed = true;
        orderDetails = {
          order_id: urlOrderId,
          status: 'confirmed'
        };
        loading = false;
        
        // Clear cart
        cart.clearCart();
        
        return;
      }
      
      if (!paypalOrderId) {
        error = 'Missing payment information. Please try again.';
        loading = false;
        return;
      }

      // Get pending order info from sessionStorage
      const pendingOrderStr = sessionStorage.getItem('pending_order');
      if (!pendingOrderStr) {
        error = 'Order information not found. Please contact support.';
        loading = false;
        return;
      }

      const pendingOrder = JSON.parse(pendingOrderStr);
      
      console.log('🔄 Completing order:', {
        order_id: pendingOrder.order_id,
        paypal_order_id: paypalOrderId,
        stored_paypal_id: pendingOrder.paypal_order_id
      });
      
      // Check if order was already processed (prevent double submission)
      const alreadyProcessed = sessionStorage.getItem(`order_processed_${pendingOrder.order_id}`);
      if (alreadyProcessed) {
        orderConfirmed = true;
        orderDetails = {
          order_id: pendingOrder.order_id,
          status: 'confirmed'
        };
        loading = false;
        return;
      }
      
      // Complete the order (capture payment and reduce stock)
      const response = await cartAPI.completeOrder(
        pendingOrder.order_id,
        paypalOrderId
      );
      
      console.log('✅ Order completion response:', response);

      if (response.success) {
        orderConfirmed = true;
        orderDetails = {
          order_id: pendingOrder.order_id,
          status: response.data.status
        };

        // Mark order as processed to prevent double submission
        sessionStorage.setItem(`order_processed_${pendingOrder.order_id}`, 'true');
        
        // Clear pending order from storage
        sessionStorage.removeItem('pending_order');
        
        // Clear cart from store
        cart.clearCart();

        // If running in popup, notify parent and close
        if (isPopup && window.opener) {
          console.log('✅ Payment successful in popup, notifying parent window');
          window.opener.postMessage({
            type: 'PAYMENT_SUCCESS',
            orderId: pendingOrder.order_id,
            status: response.data.status
          }, window.location.origin);
          
          // Close popup after a brief delay
          setTimeout(() => {
            window.close();
          }, 1000);
        }
      } else {
        error = response.message || 'Failed to complete order';
        
        // If running in popup, notify parent of error
        if (isPopup && window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_ERROR',
            error: error
          }, window.location.origin);
        }
      }
    } catch (err) {
      console.error('Order completion error:', err);
      error = err.message || 'Failed to complete order. Please contact support.';
      
      // Check if this is a duplicate capture error (order already completed)
      if (err.message && err.message.includes('already captured')) {
        // Order was already processed, show success
        orderConfirmed = true;
        orderDetails = {
          order_id: pendingOrder?.order_id || 'unknown',
          status: 'confirmed'
        };
        sessionStorage.setItem(`order_processed_${pendingOrder?.order_id}`, 'true');
        sessionStorage.removeItem('pending_order');
        cart.clearCart();
        error = null;

        // If running in popup, notify parent and close
        if (isPopup && window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_SUCCESS',
            orderId: pendingOrder?.order_id,
            status: 'confirmed'
          }, window.location.origin);
          
          setTimeout(() => {
            window.close();
          }, 1000);
        }
      } else {
        // Notify parent of error if in popup
        if (isPopup && window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_ERROR',
            error: error
          }, window.location.origin);
        }
      }
    } finally {
      loading = false;
    }
  }

  // Don't use onMount - let the reactive statement handle it when auth is ready
  // This ensures auth is initialized before attempting API calls
</script>

<svelte:head>
  <title>Payment Success - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
  {#if loading}
    <div class="max-w-2xl mx-auto">
      <Loading text="Processing your payment..." />
      <p class="text-center text-slate-600 mt-4">
        Please wait while we confirm your order. Do not refresh this page.
      </p>
      {#if isPopup}
        <p class="text-center text-blue-600 mt-2 text-sm">
          This window will close automatically once your payment is confirmed.
        </p>
      {/if}
    </div>
  {:else if error}
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-md p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Order Processing Failed</h1>
        
        <Alert type="error" message={error} />
        
        <div class="mt-8 space-y-4">
          <p class="text-slate-600">
            Your payment may have been processed, but we encountered an error completing your order.
          </p>
          <p class="text-slate-600">
            Please contact customer support with this error message.
          </p>
          
          <div class="flex gap-4 justify-center mt-6">
            <button
              on:click={() => goto('/')}
              class="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Go Home
            </button>
            <button
              on:click={() => goto('/profile')}
              class="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else if orderConfirmed}
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-md p-8 text-center">
        <!-- Success Icon -->
        <div class="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Order Confirmed!</h1>
        
        <p class="text-lg text-slate-600 mb-6">
          Thank you for your purchase. Your order has been successfully placed.
        </p>
        
        <div class="bg-slate-50 rounded-lg p-6 mb-8">
          <div class="text-sm text-slate-600 mb-2">Order ID</div>
          <div class="text-xl font-mono font-bold text-slate-900">{orderDetails.order_id}</div>
        </div>
        
        <div class="space-y-4 text-slate-600 mb-8">
          <p class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment confirmed
          </p>
          <p class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Order confirmed
          </p>
          <p class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Inventory updated
          </p>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p class="text-sm text-blue-800">
            You will receive a confirmation email shortly with your order details and tracking information.
          </p>
        </div>
        
        <div class="flex gap-4 justify-center">
          <button
            on:click={() => goto('/')}
            class="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Continue Shopping
          </button>
          <button
            on:click={() => goto('/profile')}
            class="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

