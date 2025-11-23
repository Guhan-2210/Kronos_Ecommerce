<script>
  import { createEventDispatcher } from 'svelte';
  
  export let item;
  export let updating = false;
  
  const dispatch = createEventDispatcher();

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  function handleQuantityChange(newQuantity) {
    if (newQuantity > 0) {
      dispatch('updateQuantity', { productId: item.product_id, quantity: newQuantity });
    }
  }

  function handleRemove() {
    dispatch('remove', { productId: item.product_id });
  }
</script>

<div class="flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
  <!-- Product Image -->
  <div class="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden">
    <img
      src={item.image || '/placeholder.jpg'}
      alt={item.name}
      class="w-full h-full object-cover"
    />
  </div>

  <!-- Product Details -->
  <div class="flex-1 min-w-0">
    <div class="flex justify-between gap-4">
      <div class="flex-1">
        <h3 class="font-semibold text-slate-900 truncate">{item.name}</h3>
        {#if item.brand}
          <p class="text-sm text-slate-500 mt-1">{item.brand}</p>
        {/if}
        {#if item.sku}
          <p class="text-xs text-slate-400 mt-1">SKU: {item.sku}</p>
        {/if}
      </div>

      <!-- Remove Button -->
      <button
        on:click={handleRemove}
        disabled={updating}
        class="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
        title="Remove item"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Quantity and Price -->
    <div class="flex items-center justify-between mt-4">
      <!-- Quantity Controls -->
      <div class="flex items-center gap-2">
        <button
          on:click={() => handleQuantityChange(item.quantity - 1)}
          disabled={updating || item.quantity <= 1}
          class="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        
        <span class="w-12 text-center font-medium">{item.quantity}</span>
        
        <button
          on:click={() => handleQuantityChange(item.quantity + 1)}
          disabled={updating}
          class="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Price -->
      <div class="text-right">
        <p class="text-lg font-bold text-slate-900">
          {formatPrice(item.price * item.quantity)}
        </p>
        {#if item.quantity > 1}
          <p class="text-xs text-slate-500">
            {formatPrice(item.price)} each
          </p>
        {/if}
      </div>
    </div>

    <!-- Stock Warning -->
    {#if item.stock_available === false}
      <div class="mt-2 text-sm text-red-600 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        Out of stock
      </div>
    {:else if item.stock_quantity < item.quantity}
      <div class="mt-2 text-sm text-orange-600 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        Only {item.stock_quantity} available
        {#if item.warehouse_count}
          <span class="text-slate-500">across {item.warehouse_count} warehouse{item.warehouse_count > 1 ? 's' : ''}</span>
        {/if}
      </div>
    {:else if item.stock_available && item.warehouse_count && !item.location_verified}
      <div class="mt-2 text-sm text-green-600 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        In stock ({item.stock_quantity} available across {item.warehouse_count} warehouse{item.warehouse_count > 1 ? 's' : ''})
      </div>
    {/if}

    <!-- Price Changed Warning -->
    {#if item.price_changed}
      <div class="mt-2 text-sm text-blue-600 flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        Price updated: {formatPrice(item.old_price)} → {formatPrice(item.current_price || item.price)}
      </div>
    {/if}
  </div>
</div>
