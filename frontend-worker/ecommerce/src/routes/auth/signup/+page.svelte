<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth.js';
  import Alert from '$lib/components/Alert.svelte';
  
  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let phone = '';
  let address = {
    line1: '',
    line2: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA'
  };
  let acceptTerms = false;
  let loading = false;
  let error = null;

  $: redirectUrl = $page.url.searchParams.get('redirect') || '/';
  $: passwordMatch = password === confirmPassword || confirmPassword === '';
  $: passwordStrength = getPasswordStrength(password);

  function getPasswordStrength(pwd) {
    if (pwd.length === 0) return { level: 0, text: '', color: '' };
    if (pwd.length < 6) return { level: 1, text: 'Weak', color: 'bg-red-500' };
    if (pwd.length < 10) return { level: 2, text: 'Medium', color: 'bg-orange-500' };
    return { level: 3, text: 'Strong', color: 'bg-green-500' };
  }

  async function handleSubmit() {
    // Validation
    if (!name || !email || !password || !confirmPassword || !phone) {
      error = 'Please fill in all required fields';
      return;
    }

    if (!address.line1 || !address.street || !address.city || !address.state || !address.postal_code || !address.country) {
      error = 'Please complete your address information';
      return;
    }

    if (!passwordMatch) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters long';
      return;
    }

    if (!acceptTerms) {
      error = 'Please accept the terms and conditions';
      return;
    }

    loading = true;
    error = null;

    const result = await auth.signup(email, password, name, phone, address);

    if (result.success) {
      goto(redirectUrl);
    } else {
      error = result.error || 'Signup failed. Please try again.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign Up - Kronos</title>
</svelte:head>

<div class="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <!-- Logo/Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
      <p class="text-slate-600">Join Kronos and explore luxury timepieces</p>
    </div>

    <!-- Signup Form -->
    <div class="bg-white rounded-lg shadow-lg p-8">
      {#if error}
        <div class="mb-6">
          <Alert type="error" message={error} on:dismiss={() => error = null} />
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-5">
        <!-- Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-slate-700 mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            bind:value={name}
            required
            disabled={loading}
            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="John Doe"
          />
        </div>

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

        <!-- Phone -->
        <div>
          <label for="phone" class="block text-sm font-medium text-slate-700 mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            bind:value={phone}
            required
            disabled={loading}
            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            placeholder="+91 98765 43210"
          />
        </div>

        <!-- Address Section -->
        <div class="space-y-4 pt-2">
          <h3 class="text-sm font-semibold text-slate-900">Address Information</h3>
          
          <!-- Address Line 1 -->
          <div>
            <label for="line1" class="block text-sm font-medium text-slate-700 mb-2">
              Address Line 1
            </label>
            <input
              id="line1"
              type="text"
              bind:value={address.line1}
              required
              disabled={loading}
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder="123 Main Street"
            />
          </div>

          <!-- Address Line 2 -->
          <div>
            <label for="line2" class="block text-sm font-medium text-slate-700 mb-2">
              Address Line 2 <span class="text-slate-400">(Optional)</span>
            </label>
            <input
              id="line2"
              type="text"
              bind:value={address.line2}
              disabled={loading}
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <!-- Street -->
          <div>
            <label for="street" class="block text-sm font-medium text-slate-700 mb-2">
              Street
            </label>
            <input
              id="street"
              type="text"
              bind:value={address.street}
              required
              disabled={loading}
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder="Main Street"
            />
          </div>

          <!-- City, State, Postal Code in a grid -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="city" class="block text-sm font-medium text-slate-700 mb-2">
                City
              </label>
              <input
                id="city"
                type="text"
                bind:value={address.city}
                required
                disabled={loading}
                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="Chennai"
              />
            </div>

            <div>
              <label for="state" class="block text-sm font-medium text-slate-700 mb-2">
                State
              </label>
              <input
                id="state"
                type="text"
                bind:value={address.state}
                required
                disabled={loading}
                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="Tamil Nadu"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="postal_code" class="block text-sm font-medium text-slate-700 mb-2">
                Postal Code
              </label>
              <input
                id="postal_code"
                type="text"
                bind:value={address.postal_code}
                required
                disabled={loading}
                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="600002"
              />
            </div>

            <div>
              <label for="country" class="block text-sm font-medium text-slate-700 mb-2">
                Country
              </label>
              <input
                id="country"
                type="text"
                bind:value={address.country}
                required
                disabled={loading}
                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="India"
              />
            </div>
          </div>
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
          
          <!-- Password Strength Indicator -->
          {#if password}
            <div class="mt-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300 {passwordStrength.color}"
                    style="width: {(passwordStrength.level / 3) * 100}%"
                  ></div>
                </div>
                <span class="text-xs font-medium text-slate-600">{passwordStrength.text}</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            required
            disabled={loading}
            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed {!passwordMatch && confirmPassword ? 'border-red-500' : ''}"
            placeholder="••••••••"
          />
          {#if !passwordMatch && confirmPassword}
            <p class="mt-1 text-sm text-red-600">Passwords do not match</p>
          {/if}
        </div>

        <!-- Terms & Conditions -->
        <div class="flex items-start">
          <input
            id="terms"
            type="checkbox"
            bind:checked={acceptTerms}
            disabled={loading}
            class="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <label for="terms" class="ml-2 text-sm text-slate-600">
            I agree to the <a href="#" class="text-slate-900 hover:underline font-medium">Terms of Service</a> and <a href="#" class="text-slate-900 hover:underline font-medium">Privacy Policy</a>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={loading || !passwordMatch}
          class="w-full px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {#if loading}
            Creating Account...
          {:else}
            Create Account
          {/if}
        </button>
      </form>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-200"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-white text-slate-500">Already have an account?</span>
        </div>
      </div>

      <!-- Login Link -->
      <a
        href="/auth/login{redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}"
        class="block w-full px-6 py-3 text-center bg-white text-slate-900 font-semibold border-2 border-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Sign In
      </a>
    </div>
  </div>
</div>

