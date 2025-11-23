<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth.js';
  import Alert from '$lib/components/Alert.svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = null;

  $: redirectUrl = $page.url.searchParams.get('redirect') || '/';

  async function handleSubmit() {
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }

    loading = true;
    error = null;

    const result = await auth.login(email, password);

    if (result.success) {
      goto(redirectUrl);
    } else {
      error = result.error || 'Login failed. Please check your credentials.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Kronos</title>
</svelte:head>

<div class="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <!-- Logo/Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
      <p class="text-slate-600">Sign in to your Kronos account</p>
    </div>

    <!-- Login Form -->
    <div class="bg-white rounded-lg shadow-lg p-8">
      {#if error}
        <div class="mb-6">
          <Alert type="error" message={error} on:dismiss={() => error = null} />
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            disabled={loading}
            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="you@example.com"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            disabled={loading}
            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="••••••••"
          />
        </div>

        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center">
            <input type="checkbox" class="rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
            <span class="ml-2 text-slate-600">Remember me</span>
          </label>
          <a href="#" class="text-slate-900 hover:text-slate-700 font-medium">
            Forgot password?
          </a>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={loading}
          class="w-full px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {#if loading}
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>
      </form>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-200"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-white text-slate-500">Don't have an account?</span>
        </div>
      </div>

      <!-- Sign Up Link -->
      <a
        href="/auth/signup{redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}"
        class="block w-full px-6 py-3 text-center bg-white text-slate-900 font-semibold border-2 border-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Create Account
      </a>
    </div>
  </div>
</div>

