<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.js';
  import { orderAPI } from '$lib/api/order.js';
  import Alert from '$lib/components/Alert.svelte';
  import Loading from '$lib/components/Loading.svelte';

  let successMessage = '';
  let error = null;
  let orders = [];
  let loadingOrders = false;

  onMount(async () => {
    // Wait for auth initialization
    if ($auth.isLoading) {
      // Subscribe to auth changes
      const unsubscribe = auth.subscribe((authState) => {
        if (!authState.isLoading) {
          unsubscribe();
          if (!authState.isAuthenticated) {
            goto('/auth/login?redirect=/profile');
          } else {
            loadOrders();
          }
        }
      });
    } else if (!$auth.isAuthenticated) {
      goto('/auth/login?redirect=/profile');
    } else {
      await loadOrders();
    }
  });

  async function loadOrders() {
    loadingOrders = true;
    error = null;

    try {
      console.log('Fetching orders for authenticated user');
      const response = await orderAPI.getUserOrders();
      // Extract orders array from response.data.orders
      orders = response.data?.orders || [];
      console.log('Orders loaded:', orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      error = err.message;
    } finally {
      loadingOrders = false;
    }
  }

  async function handleLogout() {
    await auth.logout();
    goto('/');
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatPrice(amount) {
    if (!amount || isNaN(amount)) return '₹0';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function getStatusColor(status) {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      payment_pending: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  function getStatusLabel(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<svelte:head>
  <title>My Profile - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-8">My Profile</h1>

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

    <div class="grid grid-cols-1 gap-6">
      <!-- Main Content -->
      <div>
        <!-- Account Information -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-slate-900">Account Information</h2>
            <button
              on:click={handleLogout}
              class="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>

          {#if $auth.user}
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <p class="text-lg text-slate-900">{$auth.user.name || 'Not set'}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <p class="text-lg text-slate-900">{$auth.user.email}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Member Since</label>
                <p class="text-lg text-slate-900">{formatDate($auth.user.created_at)}</p>
              </div>

              {#if $auth.user.phone}
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                  <p class="text-lg text-slate-900">{$auth.user.phone}</p>
                </div>
              {/if}

              {#if $auth.user.address}
                <div class="pt-4 border-t border-slate-200">
                  <label class="block text-sm font-medium text-slate-600 mb-2">Address</label>
                  <div class="text-slate-900 space-y-1">
                    {#if $auth.user.address.line1}
                      <p>{$auth.user.address.line1}</p>
                    {/if}
                    {#if $auth.user.address.line2}
                      <p>{$auth.user.address.line2}</p>
                    {/if}
                    {#if $auth.user.address.street}
                      <p>{$auth.user.address.street}</p>
                    {/if}
                    <p>
                      {$auth.user.address.city}{#if $auth.user.address.state}, {$auth.user.address.state}{/if}
                      {#if $auth.user.address.postal_code} - {$auth.user.address.postal_code}{/if}
                    </p>
                    {#if $auth.user.address.country}
                      <p class="font-medium">{$auth.user.address.country}</p>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <p class="text-slate-600">Loading user information...</p>
          {/if}
        </div>

        <!-- Recent Orders -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Recent Orders</h2>
          
          {#if loadingOrders}
            <Loading text="Loading orders..." />
          {:else if orders.length === 0}
            <div class="text-center py-12">
              <svg class="w-24 h-24 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">No orders yet</h3>
              <p class="text-slate-600 mb-6">Start shopping to see your orders here</p>
              <a
                href="/products"
                class="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Browse Products
              </a>
            </div>
          {:else}
            <div class="space-y-4">
              {#each orders as order (order.id)}
                {@const products = order.order_data?.products || []}
                {@const costs = order.order_data?.costs || {}}
                {@const displayTotal = costs.original_currency === 'INR' && costs.original_subtotal 
                  ? costs.original_subtotal + (costs.delivery_cost * (costs.exchange_rate || 83)) + (costs.tax * (costs.exchange_rate || 83))
                  : (costs.total || order.total_amount) * (costs.exchange_rate || 83)}
                <div class="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <div class="flex items-center gap-3 mb-2">
                        <h3 class="font-semibold text-slate-900">Order #{order.id.split('-').pop()}</h3>
                        <span class="px-3 py-1 text-xs font-medium rounded-full {getStatusColor(order.status)}">
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p class="text-sm text-slate-600">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold text-slate-900">{formatPrice(displayTotal)}</p>
                      <p class="text-sm text-slate-600">{products.length} item(s)</p>
                    </div>
                  </div>
                  
                  {#if products.length > 0}
                    <div class="border-t border-slate-100 pt-4 space-y-2">
                      {#each products.slice(0, 2) as product}
                        <div class="flex items-center gap-3 text-sm">
                          <div class="w-12 h-12 bg-slate-100 rounded flex-shrink-0 overflow-hidden">
                            {#if product.image}
                              <img src={product.image} alt={product.name} class="w-full h-full object-cover" />
                            {/if}
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-slate-900 font-medium truncate">{product.name}</p>
                            <p class="text-slate-500 text-xs truncate">{product.brand}</p>
                            <p class="text-slate-600">Qty: {product.quantity} × {formatPrice(product.price)}</p>
                          </div>
                        </div>
                      {/each}
                      {#if products.length > 2}
                        <p class="text-sm text-slate-600 pt-2">
                          and {products.length - 2} more item(s)
                        </p>
                      {/if}
                    </div>
                  {/if}
                  
                  <!-- Delivery Address -->
                  {#if order.order_data?.shipping_address}
                    {@const addr = order.order_data.shipping_address}
                    <div class="border-t border-slate-100 mt-4 pt-4">
                      <p class="text-xs text-slate-500 mb-1">Delivery Address:</p>
                      <p class="text-sm text-slate-700">
                        {addr.street}, {addr.city}, {addr.state} - {addr.zipcode}
                      </p>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

