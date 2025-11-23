<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { catalogAPI } from '$lib/api/catalog.js';
  import { priceAPI } from '$lib/api/price.js';

  let products = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let selectedBrand = '';
  let selectedMovementType = '';
  let selectedCaseMaterial = '';
  let selectedGender = '';
  let priceRange = { min: '', max: '' };
  
  // Pagination - now using server-side pagination
  let currentPage = 1;
  let pageSize = 12;
  let totalProducts = 0;
  let totalPages = 1;
  let pageNumbers = [];

  // Track if initial load is done to prevent infinite loops
  let initialLoadDone = false;
  
  // Generate page numbers for pagination UI
  $: {
    pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      // Show first page, last page, current page, and pages around current
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pageNumbers.push({ number: i, isEllipsis: false });
      } else if (i === 2 || i === totalPages - 1) {
        // Add ellipsis
        if (pageNumbers.length > 0 && !pageNumbers[pageNumbers.length - 1].isEllipsis) {
          pageNumbers.push({ number: i, isEllipsis: true });
        }
      }
    }
  }
  
  function goToPage(page) {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      currentPage = page;
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onMount(async () => {
    // Check for search query in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearchQuery = urlParams.get('q');
    if (urlSearchQuery) {
      searchQuery = urlSearchQuery;
    }
    
    // Load initial products
    await loadProducts();
    initialLoadDone = true;
  });

  async function loadProducts() {
    loading = true;
    error = null;

    try {
      // Build server-side pagination and filter parameters
      const params = {
        page: currentPage,
        limit: pageSize
      };

      // Add filters that backend supports
      if (searchQuery) params.q = searchQuery;
      if (selectedBrand) params.brand = selectedBrand;
      if (selectedGender) params.gender = selectedGender;
      if (selectedCaseMaterial) params.material = selectedCaseMaterial;
      if (priceRange.min) params.minPrice = priceRange.min;
      if (priceRange.max) params.maxPrice = priceRange.max;

      console.log('Loading products with params:', params);

      const response = await catalogAPI.getProducts(params);
      let fetchedProducts = response.data || [];

      console.log('Backend response:', {
        dataCount: fetchedProducts.length,
        pagination: response.pagination,
        fullResponse: response
      });

      // Update pagination from server response
      if (response.pagination) {
        totalProducts = response.pagination.total || 0;
        // Calculate totalPages from total and limit
        const limit = response.pagination.limit || pageSize;
        totalPages = Math.ceil(totalProducts / limit) || 1;
        console.log('Server pagination:', {
          total: totalProducts,
          totalPages: totalPages,
          currentPage: currentPage,
          limit: limit,
          offset: response.pagination.offset
        });
      } else {
        // Fallback if backend doesn't return pagination
        totalProducts = fetchedProducts.length;
        totalPages = 1;
        console.warn('No pagination metadata from backend, using fallback');
      }

      // Apply client-side filter for movement type (not supported by backend)
      if (selectedMovementType) {
        fetchedProducts = fetchedProducts.filter(p => 
          p.product_data?.movement?.type?.toLowerCase() === selectedMovementType.toLowerCase()
        );
        console.log(`Filtered by movement type "${selectedMovementType}": ${fetchedProducts.length} products`);
      }

      // Fetch prices for all products
      if (fetchedProducts.length > 0) {
        const productIds = fetchedProducts.map(p => p.id);
        try {
          const pricesResponse = await priceAPI.getPrices(productIds);
          const pricesMap = {};
          
          if (pricesResponse.data) {
            pricesResponse.data.forEach(p => {
              pricesMap[p.product_id] = p.price;
            });
          }

          // Attach prices to products and extract necessary fields
          fetchedProducts = fetchedProducts.map(p => ({
            ...p,
            name: p.product_data?.name || p.name,
            brand: p.product_data?.brand || '',
            sku: p.product_data?.sku || p.sku || '',
            image_url: p.product_data?.media?.image || p.product_data?.image_url,
            price: pricesMap[p.id] || null
          }));
        } catch (err) {
          console.error('Failed to fetch prices:', err);
        }
      }

      products = fetchedProducts;
    } catch (err) {
      error = err.message;
      console.error('Load products error:', err);
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    currentPage = 1; // Reset to first page when filtering
    loadProducts();
  }

  function clearFilters() {
    selectedBrand = '';
    selectedMovementType = '';
    selectedCaseMaterial = '';
    selectedGender = '';
    priceRange = { min: '', max: '' };
    searchQuery = '';
    currentPage = 1; // Reset to first page
    loadProducts();
  }
</script>

<svelte:head>
  <title>Watches - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
      {#if searchQuery}
        Search Results for "{searchQuery}"
      {:else}
        Luxury Watches
      {/if}
    </h1>
    <p class="text-slate-600">
      {loading ? 'Loading...' : `${totalProducts} watch${totalProducts !== 1 ? 'es' : ''} found`}
    </p>
  </div>

  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Sidebar Filters -->
    <aside class="lg:w-64 flex-shrink-0">
      <div class="bg-white rounded-lg shadow-md p-6 sticky top-24">
        <h2 class="font-bold text-lg text-slate-900 mb-4">Filters</h2>

        <!-- Brand Filter -->
        <div class="mb-6">
          <h3 class="font-semibold text-slate-700 mb-3">Brand</h3>
          <select
            bind:value={selectedBrand}
            on:change={applyFilters}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">All Brands</option>
            <option value="Maurice Lacroix">Maurice Lacroix</option>
            <option value="Rolex">Rolex</option>
            <option value="Omega">Omega</option>
            <option value="Tag Heuer">Tag Heuer</option>
            <option value="Seiko">Seiko</option>
            <option value="Citizen">Citizen</option>
          </select>
        </div>

        <!-- Movement Type Filter -->
        <div class="mb-6">
          <h3 class="font-semibold text-slate-700 mb-3">Movement</h3>
          <select
            bind:value={selectedMovementType}
            on:change={applyFilters}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="automatic">Automatic</option>
            <option value="quartz">Quartz</option>
            <option value="manual">Manual</option>
            <option value="solar">Solar</option>
          </select>
        </div>

        <!-- Case Material Filter -->
        <div class="mb-6">
          <h3 class="font-semibold text-slate-700 mb-3">Case Material</h3>
          <select
            bind:value={selectedCaseMaterial}
            on:change={applyFilters}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">All Materials</option>
            <option value="Stainless Steel">Stainless Steel</option>
            <option value="Gold">Gold</option>
            <option value="Titanium">Titanium</option>
            <option value="Ceramic">Ceramic</option>
            <option value="Bronze">Bronze</option>
          </select>
        </div>

        <!-- Gender Filter -->
        <div class="mb-6">
          <h3 class="font-semibold text-slate-700 mb-3">Gender</h3>
          <div class="space-y-2">
            <button
              on:click={() => { selectedGender = ''; applyFilters(); }}
              class="block w-full text-left px-3 py-2 rounded-lg transition-colors {selectedGender === '' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}"
            >
              All
            </button>
            <button
              on:click={() => { selectedGender = 'men'; applyFilters(); }}
              class="block w-full text-left px-3 py-2 rounded-lg transition-colors {selectedGender === 'men' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}"
            >
              Men's
            </button>
            <button
              on:click={() => { selectedGender = 'women'; applyFilters(); }}
              class="block w-full text-left px-3 py-2 rounded-lg transition-colors {selectedGender === 'women' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}"
            >
              Women's
            </button>
            <button
              on:click={() => { selectedGender = 'unisex'; applyFilters(); }}
              class="block w-full text-left px-3 py-2 rounded-lg transition-colors {selectedGender === 'unisex' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}"
            >
              Unisex
            </button>
          </div>
        </div>

        <!-- Clear Filters -->
        {#if selectedBrand || selectedMovementType || selectedCaseMaterial || selectedGender || searchQuery}
          <button
            on:click={clearFilters}
            class="w-full px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear All Filters
          </button>
        {/if}
      </div>
    </aside>

    <!-- Product Grid -->
    <div class="flex-1">
      {#if loading}
        <Loading text="Loading products..." />
      {:else if error}
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-red-600 mb-4 text-lg">{error}</p>
          <button
            on:click={loadProducts}
            class="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      {:else if products.length === 0}
        <div class="text-center py-16">
          <svg class="w-24 h-24 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">No watches found</h3>
          <p class="text-slate-600 mb-6">
            {#if searchQuery || selectedBrand || selectedMovementType || selectedCaseMaterial || selectedGender}
              Try adjusting your filters or browse all watches
            {:else}
              Check back later for new arrivals
            {/if}
          </p>
          {#if searchQuery || selectedBrand || selectedMovementType || selectedCaseMaterial || selectedGender}
            <button
              on:click={clearFilters}
              class="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              View All Watches
            </button>
          {/if}
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {#each products as product (product.id)}
            <ProductCard {product} />
          {/each}
        </div>
        
        <!-- Debug Info (temporary) -->
        <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>Debug:</strong> Total: {totalProducts}, Pages: {totalPages}, Current: {currentPage}, Products shown: {products.length}
        </div>
        
        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="mt-12">
            <div class="flex justify-center items-center gap-2">
              <!-- Previous Button -->
              <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Previous page"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span class="hidden sm:inline">Previous</span>
              </button>
              
              <!-- Page Numbers -->
              <div class="flex gap-2">
                {#each pageNumbers as page}
                  {#if page.isEllipsis}
                    <span class="w-10 h-10 flex items-center justify-center text-slate-400">...</span>
                  {:else}
                    <button
                      on:click={() => goToPage(page.number)}
                      class="w-10 h-10 rounded-lg font-medium {currentPage === page.number ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'} transition-colors"
                      aria-label="Go to page {page.number}"
                      aria-current={currentPage === page.number ? 'page' : undefined}
                    >
                      {page.number}
                    </button>
                  {/if}
                {/each}
              </div>
              
              <!-- Next Button -->
              <button
                on:click={nextPage}
                disabled={currentPage === totalPages}
                class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Next page"
              >
                <span class="hidden sm:inline">Next</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <!-- Page Info -->
            <div class="mt-6 text-center text-sm text-slate-600">
              {#if totalProducts > 0}
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} watches
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

