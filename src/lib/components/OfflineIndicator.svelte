<script lang="ts">
	import { WifiOff, Wifi, CheckCircle, AlertCircle } from 'lucide-svelte';
	import { isOnline, syncStatus } from '$lib/offline';
	import { themeStore } from '$lib/themes/neo';

	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});
</script>

{#if !$isOnline}
	<!-- Offline Mode Badge -->
	<div
		class="fixed top-4 right-4 z-50 {currentTheme === 'neo'
			? 'neo-glass border border-orange-400/30'
			: 'border border-orange-200 bg-orange-50'} rounded-lg p-3 shadow-lg"
	>
		<div class="flex items-center">
			<WifiOff class="h-5 w-5 {currentTheme === 'neo' ? 'text-orange-400' : 'text-orange-600'}" />
			<div class="ml-3">
				<h3
					class="text-sm font-medium {currentTheme === 'neo'
						? 'text-orange-300'
						: 'text-orange-800'}"
				>
					⚡ Offline Mode
				</h3>
				<p class="text-xs {currentTheme === 'neo' ? 'text-orange-400' : 'text-orange-700'}">
					Showing cached content
				</p>
			</div>
		</div>
	</div>
{:else if $syncStatus === 'syncing'}
	<!-- Syncing Indicator -->
	<div
		class="fixed top-4 right-4 z-50 {currentTheme === 'neo'
			? 'neo-glass border border-blue-400/30'
			: 'border border-blue-200 bg-blue-50'} rounded-lg p-3 shadow-lg"
	>
		<div class="flex items-center">
			<div
				class="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
			></div>
			<div class="ml-3">
				<h3
					class="text-sm font-medium {currentTheme === 'neo' ? 'text-blue-300' : 'text-blue-800'}"
				>
					Syncing...
				</h3>
				<p class="text-xs {currentTheme === 'neo' ? 'text-blue-400' : 'text-blue-700'}">
					Uploading offline changes
				</p>
			</div>
		</div>
	</div>
{:else if $syncStatus === 'synced'}
	<!-- Synced Indicator -->
	<div
		class="fixed top-4 right-4 z-50 {currentTheme === 'neo'
			? 'neo-glass border border-green-400/30'
			: 'border border-green-200 bg-green-50'} rounded-lg p-3 shadow-lg"
	>
		<div class="flex items-center">
			<CheckCircle class="h-5 w-5 {currentTheme === 'neo' ? 'text-green-400' : 'text-green-600'}" />
			<div class="ml-3">
				<h3
					class="text-sm font-medium {currentTheme === 'neo' ? 'text-green-300' : 'text-green-800'}"
				>
					✅ Synced
				</h3>
				<p class="text-xs {currentTheme === 'neo' ? 'text-green-400' : 'text-green-700'}">
					All changes uploaded
				</p>
			</div>
		</div>
	</div>
{:else if $syncStatus === 'error'}
	<!-- Sync Error Indicator -->
	<div
		class="fixed top-4 right-4 z-50 {currentTheme === 'neo'
			? 'neo-glass border border-red-400/30'
			: 'border border-red-200 bg-red-50'} rounded-lg p-3 shadow-lg"
	>
		<div class="flex items-center">
			<AlertCircle class="h-5 w-5 {currentTheme === 'neo' ? 'text-red-400' : 'text-red-600'}" />
			<div class="ml-3">
				<h3 class="text-sm font-medium {currentTheme === 'neo' ? 'text-red-300' : 'text-red-800'}">
					Sync Failed
				</h3>
				<p class="text-xs {currentTheme === 'neo' ? 'text-red-400' : 'text-red-700'}">
					Will retry automatically
				</p>
			</div>
		</div>
	</div>
{/if}
