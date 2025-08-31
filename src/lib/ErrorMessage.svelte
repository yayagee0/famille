<script lang="ts">
	import { AlertCircle, X } from 'lucide-svelte';

	let {
		message,
		dismissible = true,
		onDismiss
	}: {
		message: string;
		dismissible?: boolean;
		onDismiss?: () => void;
	} = $props();
</script>

<div class="rounded-md bg-red-50 p-4">
	<div class="flex">
		<div class="flex-shrink-0">
			<AlertCircle class="h-5 w-5 text-red-400" />
		</div>
		<div class="ml-3">
			<p class="text-sm font-medium text-red-800">{message}</p>
		</div>
		{#if dismissible && onDismiss}
			<div class="ml-auto pl-3">
				<div class="-mx-1.5 -my-1.5">
					<button
						type="button"
						onclick={onDismiss}
						class="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 focus:outline-none"
					>
						<span class="sr-only">Dismiss</span>
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
