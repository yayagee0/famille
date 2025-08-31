<script lang="ts">
	let {
		size = 'medium',
		message
	}: {
		size?: 'small' | 'medium' | 'large';
		message?: string;
	} = $props();

	const sizeClasses = {
		small: 'h-4 w-4',
		medium: 'h-8 w-8',
		large: 'h-12 w-12'
	};
</script>

<div class="flex flex-col items-center justify-center py-8">
	<div class="{sizeClasses[size]} animate-spin rounded-full border-b-2 border-indigo-600"></div>
	{#if message}
		<p class="mt-2 text-sm text-gray-600">{message}</p>
	{/if}
</div>
