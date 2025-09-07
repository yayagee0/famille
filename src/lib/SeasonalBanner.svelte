<script lang="ts">
	import { onMount } from 'svelte';
	import { SmartEngine } from '$lib/smartEngine';
	import { getCurrentSeasonalBanners, type SeasonalBanner } from '$lib/data/seasonal';
	import { themeStore } from '$lib/themes/neo';
	import { Sparkles, Calendar, Heart } from 'lucide-svelte';

	// State
	let banners = $state<SeasonalBanner[]>([]);
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Load seasonal banners
	onMount(() => {
		banners = getCurrentSeasonalBanners();
		console.log('[SeasonalBanner] Loaded banners:', banners);
	});

	// Get banner icon
	function getBannerIcon(category: string) {
		switch (category) {
			case 'islamic':
				return '🕌';
			case 'weather':
				return '🌤️';
			case 'birthday':
				return '🎂';
			case 'holiday':
				return '🎉';
			default:
				return '✨';
		}
	}

	// Get priority styling
	function getPriorityStyle(priority: number) {
		if (currentTheme === 'neo') {
			if (priority >= 10) {
				return 'border-yellow-400/40 bg-gradient-to-r from-yellow-500/20 to-orange-500/20';
			} else if (priority >= 7) {
				return 'border-cyan-400/30 bg-gradient-to-r from-cyan-500/15 to-blue-500/15';
			} else {
				return 'border-slate-400/20 bg-gradient-to-r from-slate-500/10 to-slate-600/10';
			}
		} else {
			if (priority >= 10) {
				return 'border-yellow-300 bg-gradient-to-r from-yellow-100 to-orange-100';
			} else if (priority >= 7) {
				return 'border-blue-300 bg-gradient-to-r from-blue-100 to-cyan-100';
			} else {
				return 'border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200';
			}
		}
	}
</script>

{#if banners.length > 0}
	<div class="space-y-3">
		{#each banners as banner (banner.id)}
			{#if currentTheme === 'neo'}
				<div
					class="relative overflow-hidden rounded-xl border p-4 {getPriorityStyle(banner.priority)}"
				>
					<!-- Background pattern -->
					<div class="absolute inset-0 opacity-5">
						<div
							class="h-full w-full"
							style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 20px 20px;"
						></div>
					</div>

					<div class="relative">
						<div class="flex items-start gap-3">
							<!-- Banner Icon -->
							<div class="flex-shrink-0">
								<div class="rounded-lg bg-slate-800/50 p-2 text-2xl">
									{banner.emoji}
								</div>
							</div>

							<!-- Banner Content -->
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2">
									<h3 class="text-lg font-bold text-slate-200">{banner.title}</h3>
									<span class="text-xs text-slate-400">
										{getBannerIcon(banner.category)}
									</span>
								</div>

								<p class="leading-relaxed text-slate-300">
									{banner.message}
								</p>

								<!-- Priority indicator for high priority banners -->
								{#if banner.priority >= 10}
									<div class="mt-3 flex items-center gap-1">
										<Sparkles class="h-4 w-4 text-yellow-400" />
										<span class="text-xs font-medium text-yellow-400">Special Event</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="relative overflow-hidden rounded-xl border p-4 {getPriorityStyle(banner.priority)}"
				>
					<div class="flex items-start gap-3">
						<!-- Banner Icon -->
						<div class="flex-shrink-0">
							<div class="rounded-lg bg-white/70 p-2 text-2xl shadow-sm">
								{banner.emoji}
							</div>
						</div>

						<!-- Banner Content -->
						<div class="min-w-0 flex-1">
							<div class="mb-2 flex items-center gap-2">
								<h3 class="text-lg font-bold text-gray-800">{banner.title}</h3>
								<span class="text-xs text-gray-500">
									{getBannerIcon(banner.category)}
								</span>
							</div>

							<p class="leading-relaxed text-gray-700">
								{banner.message}
							</p>

							<!-- Priority indicator for high priority banners -->
							{#if banner.priority >= 10}
								<div class="mt-3 flex items-center gap-1">
									<Sparkles class="h-4 w-4 text-yellow-600" />
									<span class="text-xs font-medium text-yellow-600">Special Event</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
