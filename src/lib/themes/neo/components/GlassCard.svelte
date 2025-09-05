<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    header,
    children,
    glow = false,
    shimmer = false
  }: {
    header: string;
    children?: Snippet;
    glow?: boolean;
    shimmer?: boolean;
  } = $props();

  const glowClass = glow ? 'neo-card-hover' : '';
  const shimmerClass = shimmer ? 'neo-shimmer' : '';
</script>

<!-- Neo Glass Card - Cyberpunk themed card with glassmorphism -->
<div
  class="neo-glass rounded-xl {glowClass} {shimmerClass}"
>
  <!-- Header with gradient text -->
  <div
    class="neo-glass rounded-t-xl border-b border-white/10 p-4"
  >
    <div class="neo-gradient-text text-lg">
      {header}
    </div>
  </div>

  <!-- Body with glass background -->
  <div class="p-6">
    {@render children?.()}
  </div>
</div>