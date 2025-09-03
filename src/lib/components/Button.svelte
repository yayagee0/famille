<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let {
		variant = 'primary',
		size = 'medium',
		disabled = false,
		loading = false,
		children,
		onclick,
		...restProps
	}: {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'small' | 'medium' | 'large';
		disabled?: boolean;
		loading?: boolean;
		children?: any;
		onclick?: () => void;
		[key: string]: any;
	} = $props();

	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transform active:scale-95';
	
	const variantClasses = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
		secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
		outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500',
		ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
	};

	const sizeClasses = {
		small: 'px-3 py-1.5 text-sm',
		medium: 'px-4 py-2 text-sm',
		large: 'px-6 py-3 text-base'
	};

	function handleClick() {
		if (!disabled && !loading && onclick) {
			onclick();
		}
		dispatch('click');
	}
</script>

<button
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]}"
	{disabled}
	onclick={handleClick}
	{...restProps}
>
	{#if loading}
		<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
	{/if}
	{@render children?.()}
</button>