<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, RefreshCw } from 'lucide-svelte';

	let { children } = $props<{ children: import('svelte').Snippet }>();

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
		<div class="w-full max-w-md text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
				<AlertCircle class="h-8 w-8 text-red-600" />
			</div>

			<h2 class="mb-2 text-2xl font-bold text-gray-900">Oops! Something went wrong</h2>

			<p class="mb-6 text-gray-600">
				We're sorry, but something unexpected happened. The error has been logged and our team will
				look into it.
			</p>

			{#if error}
				<details class="mb-6 rounded-lg bg-gray-100 p-4 text-left">
					<summary class="mb-2 cursor-pointer text-sm font-medium text-gray-700">
						Technical Details
					</summary>
					<pre class="text-xs break-words whitespace-pre-wrap text-gray-600">
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
					class="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					Try Again
				</button>

				<button
					onclick={reload}
					class="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
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
