<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Loading from '$lib/components/Loading.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import { catalogAPI } from '$lib/api/catalog.js';
  import { priceAPI } from '$lib/api/price.js';
  import { fulfilmentAPI } from '$lib/api/fulfilment.js';
  import { auth } from '$lib/stores/auth.js';
  import { cart } from '$lib/stores/cart.js';
  import { APP_CONFIG } from '$lib/config.js';

  let productId = '';
  let product = null;
  let price = null;
  let stockInfo = null;
  let loading = true;
  let adding = false;
  let quantity = 1;
  let error = null;
  let successMessage = '';
  let zipcode = APP_CONFIG.DEFAULT_ZIPCODE;
  let buyingNow = false;

  $: productId = $page.params.id;

  onMount(() => {
    loadProduct();
  });

  async function loadProduct() {
    loading = true;
    error = null;

    try {
      // Fetch product details
      const productResponse = await catalogAPI.getProduct(productId);
      const rawProduct = productResponse.data;
      
      // Extract and flatten product data
      product = {
        ...rawProduct,
        name: rawProduct.product_data?.name || rawProduct.name,
        brand: rawProduct.product_data?.brand || '',
        description: rawProduct.product_data?.meta?.description || rawProduct.description,
        image_url: rawProduct.product_data?.media?.image || rawProduct.image_url,
        sku: rawProduct.product_data?.sku || rawProduct.sku,
        // Watch-specific details
        model: rawProduct.product_data?.model,
        reference_number: rawProduct.product_data?.reference_number,
        collection: rawProduct.product_data?.collection,
        gender: rawProduct.product_data?.gender,
        case: rawProduct.product_data?.case,
        movement: rawProduct.product_data?.movement,
        dial: rawProduct.product_data?.dial,
        strap: rawProduct.product_data?.strap,
        features: rawProduct.product_data?.features,
        authenticity: rawProduct.product_data?.authenticity,
        product_data: rawProduct.product_data
      };

      // Fetch price
      try {
        const priceResponse = await priceAPI.getPrice(productId);
        price = priceResponse.data;
      } catch (err) {
        console.error('Price fetch failed:', err);
      }

      // Check stock availability
      try {
        const stockResponse = await fulfilmentAPI.checkStock(productId, zipcode, quantity);
        stockInfo = stockResponse.data;
      } catch (err) {
        console.error('Stock check failed:', err);
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleAddToCart() {
    if (!$auth || !$auth.isAuthenticated) {
      goto(`/auth/login?redirect=/products/${productId}`);
      return;
    }

    // Safety check for user data
    if (!$auth.user || !$auth.user.email) {
      error = 'User information not found. Please try logging in again.';
      setTimeout(() => goto('/auth/login'), 2000);
      return;
    }

    if (!stockInfo?.available) {
      error = 'Product is currently out of stock';
      return;
    }

    adding = true;
    successMessage = '';
    error = null;

    try {
      const result = await cart.addToCart(
        {
          id: productId,
          name: product.name,
          brand: product.brand,
          sku: product.sku,
          image_url: product.image_url || product.images?.[0],
          quantity
        },
        {
          email: $auth.user.email,
          name: $auth.user.name
        },
        zipcode
      );

      if (result.success) {
        successMessage = 'Product added to cart successfully!';
        setTimeout(() => {
          successMessage = '';
        }, 3000);
      } else {
        error = result.error || 'Failed to add to cart';
      }
    } catch (err) {
      error = err.message;
    } finally {
      adding = false;
    }
  }

  async function handleBuyNow() {
    if (!$auth || !$auth.isAuthenticated) {
      goto(`/auth/login?redirect=/products/${productId}`);
      return;
    }

    // Safety check for user data
    if (!$auth.user || !$auth.user.email) {
      error = 'User information not found. Please try logging in again.';
      setTimeout(() => goto('/auth/login'), 2000);
      return;
    }

    if (!stockInfo?.available) {
      error = 'Product is currently out of stock';
      return;
    }

    buyingNow = true;
    error = null;

    try {
      // Add product to cart
      const result = await cart.addToCart(
        {
          id: productId,
          name: product.name,
          brand: product.brand,
          sku: product.sku,
          image_url: product.image_url || product.images?.[0],
          quantity
        },
        {
          email: $auth.user.email,
          name: $auth.user.name
        },
        zipcode
      );

      if (result.success) {
        // Redirect to checkout immediately
        goto('/checkout');
      } else {
        error = result.error || 'Failed to proceed to checkout';
        buyingNow = false;
      }
    } catch (err) {
      error = err.message;
      buyingNow = false;
    }
  }

  function formatPrice(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }
</script>

<svelte:head>
  <title>{product?.name || 'Watch'} - Kronos</title>
</svelte:head>

{#if loading}
  <Loading fullScreen text="Loading product details..." />
{:else if error && !product}
  <div class="container mx-auto px-4 py-16">
    <div class="max-w-2xl mx-auto text-center">
      <svg class="w-24 h-24 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h1 class="text-3xl font-bold text-slate-900 mb-4">Product Not Found</h1>
      <p class="text-slate-600 mb-8">{error}</p>
      <a
        href="/products"
        class="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        Browse Products
      </a>
    </div>
  </div>
{:else if product}
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-8 text-sm">
      <ol class="flex items-center gap-2 text-slate-600">
        <li><a href="/" class="hover:text-slate-900">Home</a></li>
        <li>/</li>
        <li><a href="/products" class="hover:text-slate-900">Products</a></li>
        <li>/</li>
        <li class="text-slate-900 font-medium">{product.name}</li>
      </ol>
    </nav>

    <!-- Success/Error Messages -->
    {#if successMessage}
      <div class="mb-6">
        <Alert type="success" message={successMessage} on:dismiss={() => successMessage = ''} />
      </div>
    {/if}
    {#if error}
      <div class="mb-6">
        <Alert type="error" message={error} on:dismiss={() => error = null} />
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <!-- Product Images -->
      <div>
        <div class="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
          <img
            src={product.image_url || product.images?.[0] || '/placeholder.jpg'}
            alt={product.name}
            class="w-full h-full object-cover"
          />
        </div>
        
        <!-- Thumbnail Gallery -->
        {#if product.images && product.images.length > 1}
          <div class="grid grid-cols-4 gap-4">
            {#each product.images.slice(0, 4) as image}
              <button class="aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-slate-900 transition-colors">
                <img src={image} alt={product.name} class="w-full h-full object-cover" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Product Info -->
      <div>
        <!-- Brand -->
        {#if product.brand}
          <p class="text-sm text-slate-500 uppercase tracking-wide font-medium mb-2">
            {product.brand}
          </p>
        {/if}

        <!-- Product Name -->
        <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          {product.name}
        </h1>

        <!-- Price -->
        <div class="mb-6">
          {#if price}
            <p class="text-3xl font-bold text-slate-900">
              {formatPrice(price.price)}
            </p>
            <p class="text-sm text-slate-500 mt-1">Inclusive of all taxes</p>
          {:else}
            <p class="text-lg text-slate-600">Price not available</p>
          {/if}
        </div>

        <!-- Stock Status -->
        {#if stockInfo}
          <div class="mb-6 p-4 rounded-lg {stockInfo.available ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
            <div class="flex items-center gap-2">
              {#if stockInfo.available}
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium">In Stock</span>
              {:else}
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium">Out of Stock</span>
              {/if}
            </div>
            {#if stockInfo.available && stockInfo.estimatedDays}
              <p class="text-sm mt-1">
                Delivery in {stockInfo.estimatedDays.min}-{stockInfo.estimatedDays.max} days
              </p>
            {/if}
          </div>
        {/if}

        <!-- Quick Info -->
        {#if product.model || product.reference_number || product.sku}
          <div class="mb-6 p-4 bg-slate-50 rounded-lg space-y-2">
            {#if product.model}
              <p class="text-sm"><span class="text-slate-600">Model:</span> <span class="font-medium text-slate-900">{product.model}</span></p>
            {/if}
            {#if product.reference_number}
              <p class="text-sm"><span class="text-slate-600">Reference:</span> <span class="font-medium text-slate-900">{product.reference_number}</span></p>
            {/if}
            {#if product.sku}
              <p class="text-sm"><span class="text-slate-600">SKU:</span> <span class="font-medium text-slate-900">{product.sku}</span></p>
            {/if}
          </div>
        {/if}

        <!-- Quantity Selector -->
        <div class="mb-6">
          <label class="block font-semibold text-slate-900 mb-2">Quantity</label>
          <div class="flex items-center gap-3">
            <button
              on:click={() => quantity = Math.max(1, quantity - 1)}
              class="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-slate-300 hover:bg-slate-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              bind:value={quantity}
              min="1"
              max={stockInfo?.quantity || 10}
              class="w-20 text-center px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <button
              on:click={() => quantity = Math.min(stockInfo?.quantity || 10, quantity + 1)}
              class="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-slate-300 hover:bg-slate-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <!-- Buy Now Button (Primary) -->
          <button
            on:click={handleBuyNow}
            disabled={buyingNow || adding || !stockInfo?.available || !price}
            class="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all text-lg shadow-lg shadow-blue-500/30"
          >
            {#if buyingNow}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Proceeding to Checkout...
              </span>
            {:else if !stockInfo?.available}
              Out of Stock
            {:else}
              <span class="flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Buy Now
              </span>
            {/if}
          </button>

          <!-- Add to Cart Button (Secondary) -->
          <button
            on:click={handleAddToCart}
            disabled={adding || buyingNow || !stockInfo?.available || !price}
            class="w-full px-8 py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {#if adding}
              Adding to Cart...
            {:else if !stockInfo?.available}
              Out of Stock
            {:else}
              Add to Cart
            {/if}
          </button>
        </div>

        <!-- Authenticity Features -->
        {#if product.authenticity}
          <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 class="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Authenticity Guaranteed
            </h3>
            <ul class="text-sm text-green-900 space-y-1">
              {#if product.authenticity.box_included}
                <li>✓ Original Box Included</li>
              {/if}
              {#if product.authenticity.papers_included}
                <li>✓ Original Papers Included</li>
              {/if}
              {#if product.authenticity.warranty_card}
                <li>✓ Warranty Card</li>
              {/if}
            </ul>
          </div>
        {/if}
      </div>
    </div>

    <!-- Watch Specifications Tabs -->
    <div class="mt-12 border-t border-slate-200 pt-8">
      <h2 class="text-2xl font-bold text-slate-900 mb-6">Specifications</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Case Specifications -->
        {#if product.case}
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="font-bold text-lg text-slate-900 mb-4">Case</h3>
            <dl class="space-y-3">
              {#if product.case.material}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Material:</dt>
                  <dd class="font-medium text-slate-900">{product.case.material}</dd>
                </div>
              {/if}
              {#if product.case.diameter_mm}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Diameter:</dt>
                  <dd class="font-medium text-slate-900">{product.case.diameter_mm}mm</dd>
                </div>
              {/if}
              {#if product.case.thickness_mm}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Thickness:</dt>
                  <dd class="font-medium text-slate-900">{product.case.thickness_mm}mm</dd>
                </div>
              {/if}
              {#if product.case.water_resistance_m}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Water Resistance:</dt>
                  <dd class="font-medium text-slate-900">{product.case.water_resistance_m}m</dd>
                </div>
              {/if}
              {#if product.case.crystal}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Crystal:</dt>
                  <dd class="font-medium text-slate-900">{product.case.crystal}</dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Movement Specifications -->
        {#if product.movement}
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="font-bold text-lg text-slate-900 mb-4">Movement</h3>
            <dl class="space-y-3">
              {#if product.movement.type}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Type:</dt>
                  <dd class="font-medium text-slate-900 capitalize">{product.movement.type}</dd>
                </div>
              {/if}
              {#if product.movement.caliber}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Caliber:</dt>
                  <dd class="font-medium text-slate-900">{product.movement.caliber}</dd>
                </div>
              {/if}
              {#if product.movement.power_reserve_hours}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Power Reserve:</dt>
                  <dd class="font-medium text-slate-900">{product.movement.power_reserve_hours} hours</dd>
                </div>
              {/if}
              {#if product.movement.jewels}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Jewels:</dt>
                  <dd class="font-medium text-slate-900">{product.movement.jewels}</dd>
                </div>
              {/if}
              {#if product.movement.complications && product.movement.complications.length > 0}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Complications:</dt>
                  <dd class="font-medium text-slate-900">{product.movement.complications.join(', ')}</dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Dial Specifications -->
        {#if product.dial}
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="font-bold text-lg text-slate-900 mb-4">Dial</h3>
            <dl class="space-y-3">
              {#if product.dial.color}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Color:</dt>
                  <dd class="font-medium text-slate-900 capitalize">{product.dial.color}</dd>
                </div>
              {/if}
              {#if product.dial.finish}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Finish:</dt>
                  <dd class="font-medium text-slate-900">{product.dial.finish}</dd>
                </div>
              {/if}
              {#if product.dial.index_type}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Index Type:</dt>
                  <dd class="font-medium text-slate-900">{product.dial.index_type}</dd>
                </div>
              {/if}
              {#if product.dial.lume}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Luminosity:</dt>
                  <dd class="font-medium text-slate-900">{product.dial.lume}</dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Strap Specifications -->
        {#if product.strap}
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="font-bold text-lg text-slate-900 mb-4">Strap/Bracelet</h3>
            <dl class="space-y-3">
              {#if product.strap.material}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Material:</dt>
                  <dd class="font-medium text-slate-900">{product.strap.material}</dd>
                </div>
              {/if}
              {#if product.strap.color}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Color:</dt>
                  <dd class="font-medium text-slate-900 capitalize">{product.strap.color}</dd>
                </div>
              {/if}
              {#if product.strap.width_mm}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Width:</dt>
                  <dd class="font-medium text-slate-900">{product.strap.width_mm}mm</dd>
                </div>
              {/if}
              {#if product.strap.clasp_type}
                <div class="flex justify-between">
                  <dt class="text-slate-600">Clasp:</dt>
                  <dd class="font-medium text-slate-900">{product.strap.clasp_type}</dd>
                </div>
              {/if}
            </dl>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

