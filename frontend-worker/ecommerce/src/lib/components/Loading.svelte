<script>
  export let size = 'md'; // sm, md, lg
  export let text = 'Loading...';
  export let fullScreen = false;

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
</script>

{#if fullScreen}
  <div class="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
    <div class="text-center">
      <div class="{sizes[size]} border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
      {#if text}
        <p class="mt-4 text-slate-600 font-medium">{text}</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="flex flex-col items-center justify-center p-8">
    <div class="{sizes[size]} border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
    {#if text}
      <p class="mt-4 text-slate-600 font-medium">{text}</p>
    {/if}
  </div>
{/if}
