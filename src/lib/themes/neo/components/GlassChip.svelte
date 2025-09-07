<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		onclick,
		href,
		size = 'medium',
		variant = 'default',
		disabled = false
	}: {
		children?: Snippet;
		onclick?: () => void;
		href?: string;
		size?: 'small' | 'medium' | 'large';
		variant?: 'default' | 'accent';
		disabled?: boolean;
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
		${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg cursor-pointer'}
		${sizeClasses[size]} ${variantClasses[variant]}
	`;

	const handleClick = () => {
		if (!disabled && onclick) {
			onclick();
		}
	};
</script>

{#if href && !disabled}
	<a {href} class={baseClasses}>
		{@render children?.()}
	</a>
{:else if onclick}
	<button onclick={handleClick} {disabled} class={baseClasses}>
		{@render children?.()}
	</button>
{:else}
	<div class={baseClasses.replace('cursor-pointer', '')}>
		{@render children?.()}
	</div>
{/if}
