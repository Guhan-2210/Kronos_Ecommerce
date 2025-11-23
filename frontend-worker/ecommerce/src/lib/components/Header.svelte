<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.js';
  import { cartItemCount } from '$lib/stores/cart.js';
  
  let mobileMenuOpen = false;
  let searchQuery = '';

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      goto(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      searchQuery = '';
    }
  }

  async function handleLogout() {
    await auth.logout();
    goto('/');
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<header class="bg-white shadow-md sticky top-0 z-50">
  <div class="container mx-auto px-4">
    <!-- Top Bar -->
    <div class="flex items-center justify-between h-16 md:h-20">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <svg class="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.494-.44-1.037-.368-1.626.077-.617.376-1.209.896-1.772.566-.611 1.286-1.142 2.161-1.591.752-.386 1.568-.706 2.448-.96l3.592-.99v-.691c0-.898-.2-1.601-.6-2.11-.4-.508-.993-.762-1.78-.762-.735 0-1.402.213-1.998.637-.597.425-1.022.97-1.277 1.636l-2.528-.925c.372-.887.925-1.664 1.66-2.33.735-.667 1.595-1.184 2.58-1.553.986-.368 2.031-.552 3.136-.552 1.373 0 2.556.253 3.552.76.995.506 1.752 1.231 2.271 2.175.519.944.778 2.074.778 3.392v6.067c0 .666.066 1.176.2 1.529.133.353.344.529.632.529.217 0 .45-.066.7-.2v2.11c-.4.2-.8.346-1.2.438-.4.092-.8.138-1.2.138-.967 0-1.718-.292-2.256-.877-.537-.585-.806-1.384-.806-2.398v-.23c-.6.8-1.4 1.43-2.4 1.89-1 .46-2.11.69-3.33.69-1.06 0-2.01-.21-2.85-.63-.84-.42-1.5-1.01-1.98-1.77-.48-.76-.72-1.64-.72-2.64 0-1.12.28-2.09.84-2.91.56-.82 1.34-1.46 2.34-1.92 1-.46 2.15-.8 3.45-1.02l3.68-.63v-.69c0-.72-.21-1.27-.63-1.65-.42-.38-1-.57-1.74-.57-.63 0-1.18.15-1.65.45-.47.3-.82.69-1.05 1.17l-2.4-.83c.33-.77.81-1.43 1.44-1.98.63-.55 1.37-.97 2.22-1.26.85-.29 1.76-.44 2.73-.44 1.4 0 2.6.26 3.6.78 1 .52 1.76 1.26 2.28 2.22.52.96.78 2.1.78 3.42v6.55c0 .55.12.96.36 1.23.24.27.56.41.96.41.28 0 .58-.07.9-.21v1.97c-.37.17-.74.3-1.11.39-.37.09-.74.14-1.11.14-.83 0-1.49-.24-1.98-.72-.49-.48-.74-1.14-.74-1.98v-.21c-.53.73-1.24 1.31-2.13 1.74-.89.43-1.89.65-3 .65-.92 0-1.75-.18-2.49-.54-.74-.36-1.32-.87-1.74-1.53-.42-.66-.63-1.43-.63-2.31 0-.98.24-1.83.72-2.55.48-.72 1.15-1.28 2.01-1.68.86-.4 1.86-.7 3-1.02z" />
        </svg>
        <span class="text-xl md:text-2xl font-bold text-slate-900">Kronos</span>
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-8">
        <a
          href="/"
          class="text-slate-700 hover:text-slate-900 font-medium transition-colors {$page.url.pathname === '/' ? 'text-slate-900' : ''}"
        >
          Home
        </a>
        <a
          href="/products"
          class="text-slate-700 hover:text-slate-900 font-medium transition-colors {$page.url.pathname.startsWith('/products') ? 'text-slate-900' : ''}"
        >
          Products
        </a>
      </nav>

      <!-- Search Bar (Desktop) -->
      <form on:submit={handleSearch} class="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div class="relative w-full">
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="Search products..."
            class="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>

      <!-- Right Side Actions -->
      <div class="flex items-center gap-4">
        <!-- Cart Icon -->
        <a
          href="/cart"
          class="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {#if $cartItemCount > 0}
            <span class="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {$cartItemCount}
            </span>
          {/if}
        </a>

        <!-- Auth Buttons / Profile -->
        {#if $auth.isLoading}
          <!-- Loading state - show nothing or a loading indicator -->
          <div class="hidden md:flex items-center">
            <div class="w-20 h-8 bg-slate-200 animate-pulse rounded"></div>
          </div>
        {:else if $auth.isAuthenticated}
          <div class="hidden md:flex items-center gap-4">
            <a
              href="/profile"
              class="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="text-sm font-medium text-slate-700">{$auth && $auth.user && $auth.user.name ? $auth.user.name : 'Profile'}</span>
            </a>
            <button
              on:click={handleLogout}
              class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        {:else}
          <div class="hidden md:flex items-center gap-3">
            <a
              href="/auth/login"
              class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Login
            </a>
            <a
              href="/auth/signup"
              class="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Sign Up
            </a>
          </div>
        {/if}

        <!-- Mobile Menu Button -->
        <button
          on:click={toggleMobileMenu}
          class="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {#if mobileMenuOpen}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            {/if}
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="md:hidden border-t border-slate-200 py-4 space-y-4">
        <!-- Mobile Search -->
        <form on:submit={handleSearch} class="px-2">
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="Search products..."
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </form>

        <!-- Mobile Navigation -->
        <nav class="flex flex-col space-y-2">
          <a href="/" class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            Home
          </a>
          <a href="/products" class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            Products
          </a>
          {#if $auth.isLoading}
            <!-- Loading state -->
            <div class="px-4 py-2">
              <div class="w-16 h-4 bg-slate-200 animate-pulse rounded"></div>
            </div>
          {:else if $auth.isAuthenticated}
            <a href="/profile" class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Profile
            </a>
            <button
              on:click={handleLogout}
              class="text-left px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          {:else}
            <a href="/auth/login" class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Login
            </a>
            <a href="/auth/signup" class="px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-center">
              Sign Up
            </a>
          {/if}
        </nav>
      </div>
    {/if}
  </div>
</header>
