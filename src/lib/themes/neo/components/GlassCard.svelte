<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		header,
		children,
		glow = false,
		shimmer = false,
		compact = false
	}: {
		header: string;
		children?: Snippet;
		glow?: boolean;
		shimmer?: boolean;
		compact?: boolean;
	} = $props();

	const glowClass = glow ? 'neo-card-hover' : '';
	const shimmerClass = shimmer ? 'neo-shimmer' : '';
	const paddingClass = compact ? 'p-4' : 'p-6';
</script>

<!-- Neo Glass Card - Cyberpunk themed card with glassmorphism -->
<div class="neo-glass rounded-xl {glowClass} {shimmerClass} overflow-hidden">
	<!-- Header with gradient text -->
	<div class="border-b border-white/10 p-4">
		<div class="neo-gradient-text text-lg">
			{header}
		</div>
	</div>

	<!-- Body with glass background -->
	<div class={paddingClass}>
		{@render children?.()}
	</div>
</div>
