<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { NetworkMonitor } from '$lib/offline';
	import { Wifi, WifiOff } from 'lucide-svelte';

	let isOnline = $state(true);
	let showStatus = $state(false);
	let timeoutId: number;

	const networkMonitor = NetworkMonitor.getInstance();

	function handleNetworkChange(online: boolean) {
		isOnline = online;
		showStatus = true;

		// Hide status after 3 seconds
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			showStatus = false;
		}, 3000);
	}

	onMount(() => {
		isOnline = networkMonitor.getStatus();
		networkMonitor.addListener(handleNetworkChange);
	});

	onDestroy(() => {
		networkMonitor.removeListener(handleNetworkChange);
		clearTimeout(timeoutId);
	});
</script>

{#if showStatus}
	<div
		class="fixed bottom-4 right-4 z-50 flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300 {isOnline
			? 'bg-green-100 text-green-800'
			: 'bg-red-100 text-red-800'}"
	>
		{#if isOnline}
			<Wifi class="h-4 w-4" />
			<span>Back online</span>
		{:else}
			<WifiOff class="h-4 w-4" />
			<span>You're offline</span>
		{/if}
	</div>
{/if}