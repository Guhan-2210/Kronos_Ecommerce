<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.js';
  import { cart, cartItemCount, cartTotal } from '$lib/stores/cart.js';
  import { cartAPI } from '$lib/api/cart.js';
  import { orderAPI } from '$lib/api/order.js';
  import Loading from '$lib/components/Loading.svelte';
  import Alert from '$lib/components/Alert.svelte';

  let loading = true;
  let submitting = false;
  let step = 1; // 1: Shipping, 2: Billing, 3: Review
  let error = null;
  let successMessage = '';
  let paymentInProgress = false;
  let paymentWindow = null;
  let checkPaymentInterval = null;

  // Shipping Address
  let shippingAddress = {
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India'
  };

  // Billing Address
  let billingAddress = {
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India'
  };
  let sameAsShipping = true;

  // Delivery Options
  let deliveryOptions = [];
  let selectedDelivery = null;
  let orderSummary = null;

  // Validation helpers
  function validateZipcode(zipcode) {
    return /^[0-9]{6}$/.test(zipcode);
  }

  async function loadCheckout() {
    if (!$cart.cartId || !$cart.cart || $cart.cart.product_data?.length === 0) {
      goto('/cart');
      return;
    }

    // Load cart data
    await cart.loadCart($cart.cartId);
    loading = false;
  }

  async function handlePayPalCheckout() {
    if (!selectedDelivery) {
      error = 'Please select a delivery option';
      return;
    }

    submitting = true;
    error = null;

    try {
      const response = await cartAPI.placeOrder($cart.cartId, selectedDelivery.mode);
      
      if (response.success) {
        const { order_id, paypal_order_id, approval_url } = response.data;
        
        // Store order info in sessionStorage
        sessionStorage.setItem('pending_order', JSON.stringify({
          order_id,
          paypal_order_id,
          cart_id: $cart.cartId
        }));
        
        // Open PayPal in new window
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        paymentWindow = window.open(
          approval_url,
          'PayPal Payment',
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );
        
        submitting = false;
        paymentInProgress = true;
        
        // Monitor the payment window
        monitorPaymentWindow();
      } else {
        error = response.message || 'Failed to create order';
        submitting = false;
      }
    } catch (err) {
      error = err.message || 'Failed to place order';
      submitting = false;
    }
  }

  function monitorPaymentWindow() {
    // Check if window is closed every second
    checkPaymentInterval = setInterval(() => {
      if (paymentWindow && paymentWindow.closed) {
        clearInterval(checkPaymentInterval);
        paymentWindow = null;
        
        // Don't show error immediately - wait for postMessage
        // The popup might have successfully completed and sent a message
        // Give it 2 seconds to receive the message
        setTimeout(async () => {
          // Only show error if we're still in payment progress state
          // (meaning no success message was received)
          if (paymentInProgress) {
            const pendingOrderStr = sessionStorage.getItem('pending_order');
            if (pendingOrderStr) {
              // Payment was not completed (user closed window)
              // Cancel the order and release reservations
              try {
                const pendingOrder = JSON.parse(pendingOrderStr);
                console.log('🚫 Payment window closed, cancelling order:', pendingOrder.order_id);
                await orderAPI.cancelOrder(pendingOrder.order_id);
                console.log('✅ Order cancelled and reservations released');
                sessionStorage.removeItem('pending_order');
              } catch (err) {
                console.error('Failed to cancel order:', err);
                // Continue anyway - reservations will expire via TTL
              }
              
              paymentInProgress = false;
              error = 'Payment window was closed. If you completed the payment, please check your order history or contact support.';
            }
          }
        }, 2000);
      }
    }, 1000);
  }

  async function cancelPayment() {
    if (paymentWindow) {
      paymentWindow.close();
    }
    if (checkPaymentInterval) {
      clearInterval(checkPaymentInterval);
    }
    paymentInProgress = false;
    
    // Cancel the order and release reservations
    const pendingOrderStr = sessionStorage.getItem('pending_order');
    if (pendingOrderStr) {
      try {
        const pendingOrder = JSON.parse(pendingOrderStr);
        console.log('🚫 Cancelling payment and releasing reservations for order:', pendingOrder.order_id);
        
        // Cancel the order (this will release reservations immediately)
        await orderAPI.cancelOrder(pendingOrder.order_id);
        console.log('✅ Order cancelled and reservations released');
        
        // Clear pending order
        sessionStorage.removeItem('pending_order');
      } catch (err) {
        console.error('Failed to cancel order:', err);
        // Continue anyway - reservations will expire via TTL
      }
    }
    
    error = 'Payment cancelled. You can try again when ready.';
  }

  async function handlePaymentMessage(event) {
    // Verify origin for security
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, orderId, status, error: paymentError } = event.data;

    console.log('📨 Received message from payment window:', event.data);

    if (type === 'PAYMENT_SUCCESS') {
      // Payment successful!
      console.log('✅ Payment successful, redirecting to success page');
      
      // Clear the payment in progress state
      paymentInProgress = false;
      
      if (checkPaymentInterval) {
        clearInterval(checkPaymentInterval);
      }
      
      // Navigate to success page in main window
      // Add a small delay to ensure the popup has closed
      setTimeout(() => {
        goto('/payment/success?status=completed&order_id=' + orderId);
      }, 500);
    } else if (type === 'PAYMENT_CANCELLED') {
      // Payment was cancelled
      console.log('🚫 Payment cancelled by user');
      
      // Cancel the order and release reservations
      const pendingOrderStr = sessionStorage.getItem('pending_order');
      if (pendingOrderStr) {
        try {
          const pendingOrder = JSON.parse(pendingOrderStr);
          console.log('🚫 Cancelling order and releasing reservations:', pendingOrder.order_id);
          await orderAPI.cancelOrder(pendingOrder.order_id);
          console.log('✅ Order cancelled and reservations released');
          sessionStorage.removeItem('pending_order');
        } catch (err) {
          console.error('Failed to cancel order:', err);
          // Continue anyway - reservations will expire via TTL
        }
      }
      
      paymentInProgress = false;
      error = 'Payment was cancelled. You can try again when ready.';
      
      if (checkPaymentInterval) {
        clearInterval(checkPaymentInterval);
      }
      
      // Clear pending order
      sessionStorage.removeItem('pending_order');
    } else if (type === 'PAYMENT_ERROR') {
      // Payment failed
      console.error('❌ Payment error received:', paymentError);
      paymentInProgress = false;
      error = paymentError || 'Payment processing failed';
      
      if (checkPaymentInterval) {
        clearInterval(checkPaymentInterval);
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
            goto('/auth/login?redirect=/checkout');
            return;
          }
          // Continue with checkout logic
          loadCheckout();
        }
      });
    } else if (!$auth.isAuthenticated) {
      goto('/auth/login?redirect=/checkout');
      return;
    } else {
      // Continue with checkout logic
      loadCheckout();
    }

    // Listen for messages from payment popup
    window.addEventListener('message', handlePaymentMessage);

    // Cleanup on unmount
    return () => {
      if (checkPaymentInterval) {
        clearInterval(checkPaymentInterval);
      }
      window.removeEventListener('message', handlePaymentMessage);
    };
  });

  async function handleShippingSubmit() {
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipcode) {
      error = 'Please fill in all shipping address fields';
      return;
    }

    // Validate zipcode format
    if (!validateZipcode(shippingAddress.zipcode)) {
      error = 'Please enter a valid 6-digit ZIP code';
      return;
    }

    submitting = true;
    error = null;

    try {
      const response = await cartAPI.addShippingAddress(
        $cart.cartId,
        shippingAddress
      );

      if (response.success) {
        deliveryOptions = response.data.delivery_options || [];
        if (deliveryOptions.length > 0) {
          selectedDelivery = deliveryOptions[0]; // Select first by default
        }
        step = 2;
        successMessage = 'Shipping address saved!';
        setTimeout(() => successMessage = '', 3000);
      }
    } catch (err) {
      error = err.message || 'Failed to save shipping address';
    } finally {
      submitting = false;
    }
  }

  async function handleBillingSubmit() {
    if (!sameAsShipping) {
      if (!billingAddress.street || !billingAddress.city || !billingAddress.state || !billingAddress.zipcode) {
        error = 'Please fill in all billing address fields';
        return;
      }

      // Validate zipcode format
      if (!validateZipcode(billingAddress.zipcode)) {
        error = 'Please enter a valid 6-digit ZIP code';
        return;
      }
    }

    submitting = true;
    error = null;

    try {
      const addressToUse = sameAsShipping ? shippingAddress : billingAddress;
      const response = await cartAPI.addBillingAddress(
        $cart.cartId,
        addressToUse,
        sameAsShipping
      );

      if (response.success) {
        // Get order summary
        const summaryResponse = await cartAPI.getOrderSummary($cart.cartId);
        orderSummary = summaryResponse.data;
        step = 3;
        successMessage = 'Billing address saved!';
        setTimeout(() => successMessage = '', 3000);
      }
    } catch (err) {
      error = err.message || 'Failed to save billing address';
    } finally {
      submitting = false;
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }
</script>

<svelte:head>
  <title>Checkout - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-8">Checkout</h1>

  <!-- Progress Steps -->
  <div class="mb-12">
    <div class="flex items-center justify-center">
      {#each [
        { num: 1, label: 'Shipping' },
        { num: 2, label: 'Billing' },
        { num: 3, label: 'Review' }
      ] as s, i}
        <div class="flex items-center">
          <div class="flex flex-col items-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold {
              step > s.num ? 'bg-green-600 text-white' :
              step === s.num ? 'bg-slate-900 text-white' :
              'bg-slate-200 text-slate-600'
            }">
              {#if step > s.num}
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              {:else}
                {s.num}
              {/if}
            </div>
            <span class="mt-2 text-sm font-medium {step === s.num ? 'text-slate-900' : 'text-slate-600'}">{s.label}</span>
          </div>
          {#if i < 2}
            <div class="w-24 h-1 mx-4 {step > s.num ? 'bg-green-600' : 'bg-slate-200'}"></div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Payment in Progress Overlay -->
  {#if paymentInProgress}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
        <div class="text-center">
          <!-- PayPal Logo Animation -->
          <div class="mb-6 flex justify-center">
            <div class="relative">
              <svg class="animate-pulse" width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.905 9.5c.21-1.335-.02-2.248-.76-3.065C19.345 5.588 17.835 5 15.935 5H9.495c-.46 0-.855.335-.93.79l-2.74 17.395c-.055.34.21.65.555.65h4.04l-.28 1.775c-.045.3.185.57.49.57h3.435c.4 0 .74-.29.805-.685l.035-.18.66-4.185.045-.235c.065-.395.405-.685.805-.685h.505c3.51 0 6.255-1.425 7.055-5.545.335-1.72.16-3.155-.73-4.165-.27-.31-.6-.555-.985-.74z" fill="#003087"/>
                <path d="M9.51 9.5c.065-.395.405-.685.805-.685h5.62c.665 0 1.285.045 1.855.14.17.025.335.055.495.09.16.035.315.075.465.125.075.025.15.05.22.075.285.1.55.22.795.36.21-1.335-.02-2.248-.76-3.065C18.205 5.588 16.695 5 14.795 5H8.355c-.46 0-.855.335-.93.79L4.685 23.185c-.055.34.21.65.555.65h4.04l1.015-6.44 1.215-7.895z" fill="#0070E0"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
          </div>

          <h3 class="text-2xl font-bold text-slate-900 mb-2">Payment in Progress</h3>
          <p class="text-slate-600 mb-6">
            Please complete your payment in the PayPal window.
            <br />
            <span class="text-sm">Don't close this page.</span>
          </p>

          <!-- Status Messages -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="text-sm text-slate-700">
                <p class="font-semibold mb-1">What happens next?</p>
                <ul class="space-y-1 text-slate-600">
                  <li>• Complete payment in PayPal window</li>
                  <li>• You'll be redirected automatically</li>
                  <li>• Your order will be confirmed</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Cancel Button -->
          <div class="flex gap-3">
            <button
              on:click={cancelPayment}
              class="flex-1 px-6 py-3 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Payment
            </button>
            {#if paymentWindow && paymentWindow.closed === false}
              <button
                on:click={() => paymentWindow.focus()}
                class="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to PayPal
              </button>
            {/if}
          </div>

          <p class="text-xs text-slate-500 mt-4">
            If the PayPal window doesn't open, check if your browser blocked the popup.
          </p>
        </div>
      </div>
    </div>
  {/if}

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
    <Loading text="Loading checkout..." />
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 {paymentInProgress ? 'pointer-events-none opacity-50' : ''}">
      <!-- Main Content -->
      <div class="lg:col-span-2">
        <!-- Step 1: Shipping Address -->
        {#if step === 1}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-6">Shipping Address</h2>
            
            <form on:submit|preventDefault={handleShippingSubmit} class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Street Address</label>
                <input
                  type="text"
                  bind:value={shippingAddress.street}
                  required
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    bind:value={shippingAddress.city}
                    required
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Chennai"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    bind:value={shippingAddress.state}
                    required
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Tamil Nadu"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    bind:value={shippingAddress.zipcode}
                    required
                    maxlength="6"
                    inputmode="numeric"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="600002"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <input
                    type="text"
                    bind:value={shippingAddress.country}
                    readonly
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                class="w-full px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {#if submitting}
                  Saving...
                {:else}
                  Continue to Billing
                {/if}
              </button>
            </form>
          </div>
        {/if}

        <!-- Step 2: Billing Address -->
        {#if step === 2}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-6">Billing Address</h2>

            <!-- Same as Shipping Checkbox -->
            <div class="mb-6">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={sameAsShipping}
                  class="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span class="ml-2 text-slate-700">Same as shipping address</span>
              </label>
            </div>

            {#if !sameAsShipping}
              <form on:submit|preventDefault={handleBillingSubmit} class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    bind:value={billingAddress.street}
                    required
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">City</label>
                    <input
                      type="text"
                      bind:value={billingAddress.city}
                      required
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">State</label>
                    <input
                      type="text"
                      bind:value={billingAddress.state}
                      required
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      bind:value={billingAddress.zipcode}
                      required
                      maxlength="6"
                      inputmode="numeric"
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Country</label>
                    <input
                      type="text"
                      bind:value={billingAddress.country}
                      readonly
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                <div class="flex gap-4">
                  <button
                    type="button"
                    on:click={() => step = 1}
                    class="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    class="flex-1 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {#if submitting}
                      Saving...
                    {:else}
                      Review Order
                    {/if}
                  </button>
                </div>
              </form>
            {:else}
              <div class="flex gap-4">
                <button
                  type="button"
                  on:click={() => step = 1}
                  class="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  on:click={handleBillingSubmit}
                  disabled={submitting}
                  class="flex-1 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {#if submitting}
                    Saving...
                  {:else}
                    Review Order
                  {/if}
                </button>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Step 3: Review & Place Order -->
        {#if step === 3 && orderSummary}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-6">Review Your Order</h2>

            <!-- Order Items -->
            <div class="mb-6">
              <h3 class="font-semibold text-lg text-slate-900 mb-4">Order Items</h3>
              <div class="space-y-3">
                {#each orderSummary.items as item}
                  <div class="flex justify-between items-center pb-3 border-b border-slate-200">
                    <div>
                      <p class="font-medium text-slate-900">{item.name}</p>
                      <p class="text-sm text-slate-600">Qty: {item.quantity}</p>
                    </div>
                    <p class="font-semibold text-slate-900">{formatPrice(item.total)}</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Delivery Options -->
            {#if orderSummary.delivery_options && orderSummary.delivery_options.length > 0}
              <div class="mb-6">
                <h3 class="font-semibold text-lg text-slate-900 mb-4">Delivery Option</h3>
                <div class="space-y-2">
                  {#each orderSummary.delivery_options as option}
                    <label class="flex items-center justify-between p-4 border-2 border-slate-300 rounded-lg cursor-pointer hover:border-slate-900 transition-colors {selectedDelivery?.mode === option.mode ? 'border-slate-900 bg-slate-50' : ''}">
                      <div class="flex items-center">
                        <input
                          type="radio"
                          bind:group={selectedDelivery}
                          value={option}
                          class="mr-3"
                        />
                        <div>
                          <p class="font-medium text-slate-900 capitalize">{option.mode}</p>
                          <p class="text-sm text-slate-600">{option.description}</p>
                        </div>
                      </div>
                      <p class="font-bold text-slate-900">
                        {option.cost === 0 ? 'FREE' : formatPrice(option.cost)}
                      </p>
                    </label>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="space-y-4">
              <!-- PayPal Button -->
              <button
                on:click={handlePayPalCheckout}
                disabled={submitting}
                class="paypal-button w-full h-12 rounded-lg font-semibold flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style="background-color: #FFC439; color: #003087; border: none;"
              >
                {#if submitting}
                  <span class="text-[#003087]">Processing...</span>
                {:else}
                  <svg class="mr-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.905 9.5c.21-1.335-.02-2.248-.76-3.065C19.345 5.588 17.835 5 15.935 5H9.495c-.46 0-.855.335-.93.79l-2.74 17.395c-.055.34.21.65.555.65h4.04l-.28 1.775c-.045.3.185.57.49.57h3.435c.4 0 .74-.29.805-.685l.035-.18.66-4.185.045-.235c.065-.395.405-.685.805-.685h.505c3.51 0 6.255-1.425 7.055-5.545.335-1.72.16-3.155-.73-4.165-.27-.31-.6-.555-.985-.74z" fill="#003087"/>
                    <path d="M9.51 9.5c.065-.395.405-.685.805-.685h5.62c.665 0 1.285.045 1.855.14.17.025.335.055.495.09.16.035.315.075.465.125.075.025.15.05.22.075.285.1.55.22.795.36.21-1.335-.02-2.248-.76-3.065C18.205 5.588 16.695 5 14.795 5H8.355c-.46 0-.855.335-.93.79L4.685 23.185c-.055.34.21.65.555.65h4.04l1.015-6.44 1.215-7.895z" fill="#0070E0"/>
                  </svg>
                  <span class="text-[#003087]">Pay with PayPal</span>
                {/if}
              </button>

              <button
                type="button"
                on:click={() => step = 2}
                class="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back to Billing
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Order Summary Sidebar -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-md p-6 sticky top-24">
          <h3 class="text-lg font-bold text-slate-900 mb-4">Order Summary</h3>

          <div class="space-y-3">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span class="font-medium text-slate-900">{formatPrice($cartTotal)}</span>
            </div>

            {#if selectedDelivery}
              <div class="flex justify-between text-slate-600">
                <span>Shipping ({selectedDelivery.mode})</span>
                <span class="font-medium text-slate-900">
                  {selectedDelivery.cost === 0 ? 'FREE' : formatPrice(selectedDelivery.cost)}
                </span>
              </div>
            {/if}

            <div class="border-t border-slate-200 pt-3">
              <div class="flex justify-between items-baseline">
                <span class="text-lg font-bold text-slate-900">Total</span>
                <span class="text-2xl font-bold text-slate-900">
                  {formatPrice($cartTotal + (selectedDelivery?.cost || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .paypal-button:hover:not(:disabled) {
    background-color: #F0B429 !important;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
</style>
