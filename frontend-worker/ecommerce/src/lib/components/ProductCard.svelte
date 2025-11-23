<script>
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.js';
  import { cart } from '$lib/stores/cart.js';

  export let product;
  export let showAddToCart = true;

  const dispatch = createEventDispatcher();
  
  let adding = false;
  let stockStatus = product.stock_status || 'available';

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  async function handleAddToCart() {
    if (!$auth || !$auth.isAuthenticated) {
      goto(`/auth/login?redirect=/products/${product.id}`);
      return;
    }

    // Safety check for user data
    if (!$auth.user || !$auth.user.email) {
      alert('User information not found. Please try logging in again.');
      goto('/auth/login');
      return;
    }

    adding = true;
    const result = await cart.addToCart(product, {
      email: $auth.user.email,
      name: $auth.user.name
    });

    adding = false;

    if (result.success) {
      dispatch('added', { product });
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  }

  function handleClick() {
    goto(`/products/${product.id}`);
  }
</script>

<div class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full">
  <!-- Product Image -->
  <button
    on:click={handleClick}
    class="relative aspect-square overflow-hidden bg-slate-100"
  >
    <img
      src={product.image_url || product.images?.[0] || '/placeholder.jpg'}
      alt={product.name}
      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
    />
    
    <!-- Stock Badge -->
    {#if stockStatus === 'low_stock'}
      <div class="absolute top-3 right-3 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
        Low Stock
      </div>
    {:else if stockStatus === 'out_of_stock'}
      <div class="absolute top-3 right-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
        Out of Stock
      </div>
    {/if}
  </button>

  <!-- Product Info -->
  <div class="p-4 flex-1 flex flex-col">
    <!-- Brand -->
    {#if product.brand}
      <p class="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
        {product.brand}
      </p>
    {/if}

    <!-- Product Name -->
    <button
      on:click={handleClick}
      class="text-left"
    >
      <h3 class="font-semibold text-slate-900 line-clamp-2 group-hover:text-slate-700 transition-colors">
        {product.name}
      </h3>
    </button>

    <!-- Category -->
    {#if product.category}
      <p class="text-xs text-slate-500 mt-1">
        {product.category}
      </p>
    {/if}

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Price and Add to Cart -->
    <div class="mt-4 flex items-center justify-between gap-3">
      <!-- Price -->
      <div>
        {#if product.price}
          <p class="text-xl font-bold text-slate-900">
            {formatPrice(product.price)}
          </p>
        {:else}
          <p class="text-sm text-slate-500">Price not available</p>
        {/if}
      </div>

      <!-- Add to Cart Button -->
      {#if showAddToCart && stockStatus !== 'out_of_stock'}
        <button
          on:click|stopPropagation={handleAddToCart}
          disabled={adding}
          class="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {#if adding}
            Adding...
          {:else}
            Add to Cart
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
