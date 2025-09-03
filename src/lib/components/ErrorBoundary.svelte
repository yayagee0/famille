<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, RefreshCw } from 'lucide-svelte';

	let { children } = $props<{ children: any }>();

	let error = $state<Error | null>(null);
	let hasError = $state(false);

	function handleError(event: ErrorEvent | PromiseRejectionEvent) {
		console.error('ErrorBoundary caught an error:', event);
		
		if (event instanceof ErrorEvent) {
			error = new Error(event.message);
		} else {
			error = new Error(event.reason?.message || 'Promise rejection');
		}
		
		hasError = true;
	}

	function resetError() {
		error = null;
		hasError = false;
	}

	function reload() {
		window.location.reload();
	}

	onMount(() => {
		// Listen for JavaScript errors
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleError);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleError);
		};
	});
</script>

{#if hasError}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
		<div class="max-w-md w-full text-center">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
				<AlertCircle class="h-8 w-8 text-red-600" />
			</div>
			
			<h2 class="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
			
			<p class="text-gray-600 mb-6">
				We're sorry, but something unexpected happened. The error has been logged and our team will look into it.
			</p>
			
			{#if error}
				<details class="mb-6 text-left bg-gray-100 rounded-lg p-4">
					<summary class="cursor-pointer text-sm font-medium text-gray-700 mb-2">
						Technical Details
					</summary>
					<pre class="text-xs text-gray-600 whitespace-pre-wrap break-words">
						{error.message}
						{#if error.stack}
							{error.stack}
						{/if}
					</pre>
				</details>
			{/if}
			
			<div class="space-y-3">
				<button
					onclick={resetError}
					class="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					Try Again
				</button>
				
				<button
					onclick={reload}
					class="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					<RefreshCw class="mr-2 h-4 w-4" />
					Reload Page
				</button>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}