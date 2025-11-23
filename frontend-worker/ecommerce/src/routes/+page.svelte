<script>
  // Home page - Kronos Watch E-Commerce
</script>

<svelte:head>
  <title>Kronos - Luxury Timepieces</title>
</svelte:head>

<!-- Hero Section -->
<section class="relative bg-gradient-to-r from-slate-900 to-slate-700 text-white">
  <div class="container mx-auto px-4 py-24 md:py-32">
    <div class="max-w-3xl">
      <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">
        Time, Redefined.
      </h1>
      <p class="text-xl md:text-2xl text-slate-300 mb-8">
        Discover exquisite timepieces from the world's finest watchmakers. From automatic movements to luxury complications, find your perfect watch.
      </p>
      <div class="flex flex-wrap gap-4">
        <a
          href="/products"
          class="px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
        >
          Explore Watches
        </a>
        <a
          href="/products"
          class="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-slate-900 transition-colors"
        >
          New Arrivals
        </a>
      </div>
    </div>
  </div>
  
  <!-- Decorative Element -->
  <div class="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-l from-transparent to-slate-900 opacity-50"></div>
</section>

<!-- Why Choose Kronos -->
<section class="container mx-auto px-4 py-20">
  <div class="text-center mb-16">
    <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
      Why Choose Kronos
    </h2>
    <p class="text-lg text-slate-600 max-w-2xl mx-auto">
      Your premier destination for authentic luxury timepieces
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
    <!-- Authenticity -->
    <div class="text-center">
      <div class="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-3">100% Authentic</h3>
      <p class="text-slate-600">
        Every timepiece is guaranteed authentic, sourced directly from authorized dealers and verified by our experts.
      </p>
    </div>

    <!-- Warranty -->
    <div class="text-center">
      <div class="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-3">Secure Delivery</h3>
      <p class="text-slate-600">
        Free standard shipping on all orders. Express delivery available with insurance coverage for your valuable timepiece.
      </p>
    </div>

    <!-- Support -->
    <div class="text-center">
      <div class="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-3">Expert Service</h3>
      <p class="text-slate-600">
        Dedicated customer support and professional after-sales service to keep your watch in perfect condition.
      </p>
    </div>
  </div>

  <div class="text-center mt-16">
    <a
      href="/products"
      class="inline-block px-10 py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-lg"
    >
      Browse Collection
    </a>
  </div>
</section>

<!-- Newsletter -->
<section class="bg-slate-900 text-white py-16">
  <div class="container mx-auto px-4 text-center">
    <h2 class="text-3xl font-bold mb-4">Stay Updated</h2>
    <p class="text-slate-300 mb-8 max-w-2xl mx-auto">
      Subscribe to our newsletter for exclusive offers, new arrivals, and style tips.
    </p>
    <form class="max-w-md mx-auto flex gap-4">
      <input
        type="email"
        placeholder="Enter your email"
        class="flex-1 px-4 py-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-white focus:outline-none"
      />
      <button
        type="submit"
        class="px-8 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
      >
        Subscribe
      </button>
    </form>
  </div>
</section>
