<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth.js';
  import { API_CONFIG } from '$lib/config.js';

  let diagnostics = {
    cookies: '',
    origin: '',
    authAPI: '',
    corsTest: null,
    refreshTest: null,
    authState: null,
    browserInfo: ''
  };

  onMount(async () => {
    console.log('Debug page mounted');
    
    // Get basic info
    diagnostics.cookies = document.cookie || 'No cookies found';
    diagnostics.origin = window.location.origin;
    diagnostics.authAPI = API_CONFIG.AUTH_API;
    
    // Wait a bit for auth to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    diagnostics.authState = JSON.parse(JSON.stringify($auth));
    diagnostics.browserInfo = navigator.userAgent;

    // Test CORS
    try {
      const corsResponse = await fetch(`${API_CONFIG.AUTH_API}/health`, {
        credentials: 'include'
      });
      diagnostics.corsTest = {
        status: corsResponse.status,
        ok: corsResponse.ok,
        headers: {
          'access-control-allow-credentials': corsResponse.headers.get('access-control-allow-credentials'),
          'access-control-allow-origin': corsResponse.headers.get('access-control-allow-origin'),
        }
      };
    } catch (error) {
      diagnostics.corsTest = { error: error.message };
    }

    // Test refresh endpoint
    try {
      console.log('Testing refresh endpoint...');
      console.log('Cookies before request:', document.cookie);
      
      const refreshResponse = await fetch(`${API_CONFIG.AUTH_API}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Refresh response status:', refreshResponse.status);
      const refreshData = await refreshResponse.json();
      console.log('Refresh response data:', refreshData);
      
      diagnostics.refreshTest = {
        status: refreshResponse.status,
        ok: refreshResponse.ok,
        data: refreshData,
        hasAccessToken: !!refreshData.access_token,
        accessTokenPreview: refreshData.access_token ? refreshData.access_token.substring(0, 20) + '...' : null
      };
    } catch (error) {
      console.error('Refresh test error:', error);
      diagnostics.refreshTest = { error: error.message };
    }

    // Force update
    diagnostics = { ...diagnostics };
  });

  async function testLogin() {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    
    if (email && password) {
      try {
        const result = await auth.login(email, password);
        alert('Login successful! Check diagnostics below.');
        window.location.reload();
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    }
  }

  async function testRefresh() {
    console.log('Manual refresh test...');
    console.log('Current cookies:', document.cookie);
    
    try {
      const result = await auth.refreshAuth();
      alert('Refresh result: ' + JSON.stringify(result));
      window.location.reload();
    } catch (error) {
      alert('Refresh failed: ' + error.message);
    }
  }
</script>

<svelte:head>
  <title>Auth Debug - Kronos</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">🔍 Auth Diagnostics</h1>

  <div class="space-y-6">
    <!-- Current Environment -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">📍 Environment</h2>
      <dl class="space-y-2">
        <div>
          <dt class="font-semibold">Frontend Origin:</dt>
          <dd class="font-mono text-sm bg-slate-50 p-2 rounded">{diagnostics.origin}</dd>
        </div>
        <div>
          <dt class="font-semibold">Auth API:</dt>
          <dd class="font-mono text-sm bg-slate-50 p-2 rounded">{diagnostics.authAPI}</dd>
        </div>
        <div>
          <dt class="font-semibold">Browser:</dt>
          <dd class="text-sm bg-slate-50 p-2 rounded">{diagnostics.browserInfo}</dd>
        </div>
      </dl>
    </div>

    <!-- Cookies -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">🍪 Cookies</h2>
      <div class="font-mono text-sm bg-slate-50 p-4 rounded break-all">
        {#if diagnostics.cookies === 'No cookies found'}
          <span class="text-red-600">❌ No cookies found!</span>
        {:else}
          {diagnostics.cookies}
        {/if}
      </div>
      <div class="mt-4 text-sm text-slate-600">
        <strong>Expected cookies:</strong> refresh_token, session_id
        <br>
        <strong>Note:</strong> These are HTTP-only cookies, so they won't appear in document.cookie
      </div>
    </div>

    <!-- Auth State -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">🔐 Auth State</h2>
      <pre class="font-mono text-sm bg-slate-50 p-4 rounded overflow-auto">{JSON.stringify(diagnostics.authState, null, 2)}</pre>
    </div>

    <!-- CORS Test -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">🌐 CORS Test</h2>
      {#if diagnostics.corsTest}
        <pre class="font-mono text-sm bg-slate-50 p-4 rounded overflow-auto">{JSON.stringify(diagnostics.corsTest, null, 2)}</pre>
        {#if diagnostics.corsTest.ok}
          <div class="mt-2 text-green-600">✅ CORS is working</div>
        {:else}
          <div class="mt-2 text-red-600">❌ CORS test failed</div>
        {/if}
      {:else}
        <div>Loading...</div>
      {/if}
    </div>

    <!-- Refresh Test -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">🔄 Refresh Token Test</h2>
      {#if diagnostics.refreshTest}
        <pre class="font-mono text-sm bg-slate-50 p-4 rounded overflow-auto">{JSON.stringify(diagnostics.refreshTest, null, 2)}</pre>
        
        {#if diagnostics.refreshTest.hasAccessToken}
          <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <div class="text-green-800 font-bold">✅ SUCCESS! Auth is working!</div>
            <div class="mt-2 text-sm text-green-700">
              The refresh endpoint returned an access token successfully.
              <br>
              <strong>This means:</strong>
              <ul class="list-disc ml-6 mt-1">
                <li>Cookies are being sent correctly</li>
                <li>CORS is configured properly</li>
                <li>Session persistence is working</li>
              </ul>
            </div>
            {#if !$auth.isAuthenticated}
              <div class="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                <div class="text-yellow-800 text-sm">
                  <strong>Note:</strong> You're not currently authenticated in the app, but the auth system is working.
                  Try logging in to activate your session.
                </div>
              </div>
            {/if}
          </div>
        {:else if diagnostics.refreshTest.ok}
          <div class="mt-2 text-green-600">✅ Refresh endpoint working</div>
        {:else if diagnostics.refreshTest.data?.error}
          <div class="mt-2 text-red-600">❌ Error: {diagnostics.refreshTest.data.error}</div>
          <div class="mt-2 text-sm text-slate-600">
            {#if diagnostics.refreshTest.data.error === 'MissingRefreshToken'}
              <strong>Problem:</strong> No refresh token cookie is being sent!
              <br><br>
              <strong>Possible causes:</strong>
              <ul class="list-disc ml-6">
                <li>You haven't logged in yet</li>
                <li>Browser is blocking third-party cookies</li>
                <li>Cookies expired</li>
              </ul>
            {/if}
          </div>
        {:else if diagnostics.refreshTest.error}
          <div class="mt-2 text-red-600">❌ Network error: {diagnostics.refreshTest.error}</div>
        {:else}
          <div class="mt-2 text-yellow-600">⚠️ Unexpected response</div>
        {/if}
      {:else}
        <div>Loading...</div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">🎯 Actions</h2>
      <div class="flex gap-4">
        <button
          on:click={testLogin}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Login
        </button>
        <button
          on:click={testRefresh}
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Refresh
        </button>
        <button
          on:click={() => window.location.reload()}
          class="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
        >
          Reload Page
        </button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h2 class="text-xl font-bold mb-4">📋 How to Debug</h2>
      <ol class="list-decimal ml-6 space-y-2">
        <li>Check if CORS test is working (should show credentials: true)</li>
        <li>Try "Test Login" to set fresh cookies</li>
        <li>After login, reload the page</li>
        <li>Check if refresh test now works</li>
        <li>Open browser DevTools → Network → Look for /auth/refresh request</li>
        <li>Check if cookies are sent in the request headers</li>
      </ol>
      
      <div class="mt-4 p-4 bg-white rounded">
        <strong>Browser Cookie Settings:</strong>
        <ul class="list-disc ml-6 mt-2">
          <li><strong>Chrome:</strong> Settings → Privacy → Cookies → Allow third-party cookies</li>
          <li><strong>Firefox:</strong> Settings → Privacy → Standard (not Strict)</li>
          <li><strong>Safari:</strong> Preferences → Privacy → Uncheck "Prevent cross-site tracking"</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  dl div {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
  }
</style>

