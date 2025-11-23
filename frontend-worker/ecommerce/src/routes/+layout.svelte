<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth.js';
  import { cart } from '$lib/stores/cart.js';
  import { browser } from '$app/environment';

  // Initialize auth state and load cart on mount
  onMount(async () => {
    // Initialize authentication first
    console.log('🚀 Layout mounted, initializing auth...');
    await auth.initialize();
    console.log('Auth initialized, state:', $auth);
    
    if (browser && $auth.isAuthenticated && $cart && $cart.cartId) {
      // Load user's cart
      await cart.loadCart($cart.cartId);
    }
  });
</script>

<svelte:head>
  <title>Kronos - Luxury Timepieces</title>
  <meta name="description" content="Discover exquisite timepieces from the world's finest watchmakers. Precision engineering meets timeless elegance." />
</svelte:head>

<div class="min-h-screen flex flex-col bg-slate-50">
  <Header />
  
  <main class="flex-1">
    <slot />
  </main>
  
  <Footer />
</div>
