<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		onclick,
		href,
		size = 'medium',
		variant = 'default'
	}: {
		children?: Snippet;
		onclick?: () => void;
		href?: string;
		size?: 'small' | 'medium' | 'large';
		variant?: 'default' | 'accent';
	} = $props();

	const sizeClasses = {
		small: 'px-2 py-1 text-xs',
		medium: 'px-3 py-2 text-sm',
		large: 'px-4 py-3 text-base'
	};

	const variantClasses = {
		default: 'neo-glass hover:bg-white/15',
		accent: 'neo-glass border-cyan-400/30 hover:border-cyan-400/50 hover:shadow-cyan-400/20'
	};

	const baseClasses = `
		inline-flex items-center gap-2 rounded-full border border-white/10 
		backdrop-filter backdrop-blur-md transition-all duration-300 
		hover:scale-105 hover:shadow-lg cursor-pointer
		${sizeClasses[size]} ${variantClasses[variant]}
	`;
</script>

{#if href}
	<a {href} class={baseClasses}>
		{@render children?.()}
	</a>
{:else if onclick}
	<button {onclick} class={baseClasses}>
		{@render children?.()}
	</button>
{:else}
	<div class={baseClasses.replace('cursor-pointer', '')}>
		{@render children?.()}
	</div>
{/if}