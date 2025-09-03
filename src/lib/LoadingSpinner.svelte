<script lang="ts">
	let {
		size = 'medium',
		message,
		type = 'spinner'
	}: {
		size?: 'small' | 'medium' | 'large';
		message?: string;
		type?: 'spinner' | 'dots' | 'pulse';
	} = $props();

	const sizeClasses = {
		small: 'h-4 w-4',
		medium: 'h-8 w-8',
		large: 'h-12 w-12'
	};

	const dotSizeClasses = {
		small: 'h-1 w-1',
		medium: 'h-2 w-2',
		large: 'h-3 w-3'
	};
</script>

<div class="flex flex-col items-center justify-center py-8">
	{#if type === 'dots'}
		<div class="flex space-x-1">
			{#each Array(3) as _, i}
				<div
					class="{dotSizeClasses[size]} animate-bounce rounded-full bg-indigo-600"
					style="animation-delay: {i * 0.2}s"
				></div>
			{/each}
		</div>
	{:else if type === 'pulse'}
		<div class="{sizeClasses[size]} animate-pulse rounded-full bg-indigo-600"></div>
	{:else}
		<div class="{sizeClasses[size]} animate-spin rounded-full border-b-2 border-indigo-600"></div>
	{/if}

	{#if message}
		<p class="mt-2 text-sm text-gray-600">{message}</p>
	{/if}
</div>
