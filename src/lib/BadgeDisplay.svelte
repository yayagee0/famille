<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { collection, query, orderBy, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { badgeTemplates } from '$lib/data/smartEngine';
	import { type UserBadge } from '$lib/smartEngine';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { Award, Star, Crown, Sparkles } from 'lucide-svelte';

	// Props
	let { showRecent = true, maxDisplay = 6 } = $props<{
		showRecent?: boolean;
		maxDisplay?: number;
	}>();

	// State
	let loading = $state(true);
	let userBadges = $state<(UserBadge & { template: any })[]>([]);
	let currentTheme = $state('default');
	let user = $state(auth.currentUser);
	let showLottieAnimation = $state<string | null>(null);

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Load user badges
	onMount(async () => {
		if (!user?.uid) {
			loading = false;
			return;
		}

		try {
			const badgesQuery = query(
				collection(db, 'users', user.uid, 'badges'),
				orderBy('earnedAt', 'desc')
			);

			const badgesSnapshot = await getDocs(badgesQuery);
			const badges = badgesSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			})) as UserBadge[];

			// Enrich with template data
			userBadges = badges
				.map((badge) => {
					const template = badgeTemplates.find((t) => t.id === badge.badgeId);
					return template ? { ...badge, template } : null;
				})
				.filter(Boolean)
				.slice(0, maxDisplay);
		} catch (error) {
			console.error('[BadgeDisplay] Failed to load badges:', error);
		} finally {
			loading = false;
		}
	});

	// Get rarity styling
	function getRarityStyles(rarity: string) {
		if (currentTheme === 'neo') {
			switch (rarity) {
				case 'common':
					return 'border-slate-400/30 bg-slate-500/10';
				case 'rare':
					return 'border-blue-400/30 bg-blue-500/10';
				case 'epic':
					return 'border-purple-400/30 bg-purple-500/10';
				case 'legendary':
					return 'border-yellow-400/30 bg-yellow-500/10';
				default:
					return 'border-slate-400/30 bg-slate-500/10';
			}
		} else {
			switch (rarity) {
				case 'common':
					return 'border-gray-200 bg-gray-50';
				case 'rare':
					return 'border-blue-200 bg-blue-50';
				case 'epic':
					return 'border-purple-200 bg-purple-50';
				case 'legendary':
					return 'border-yellow-200 bg-yellow-50';
				default:
					return 'border-gray-200 bg-gray-50';
			}
		}
	}

	// Get rarity icon
	function getRarityIcon(rarity: string) {
		switch (rarity) {
			case 'common':
				return Award;
			case 'rare':
				return Star;
			case 'epic':
				return Crown;
			case 'legendary':
				return Sparkles;
			default:
				return Award;
		}
	}

	// Get rarity color
	function getRarityColor(rarity: string) {
		if (currentTheme === 'neo') {
			switch (rarity) {
				case 'common':
					return 'text-slate-400';
				case 'rare':
					return 'text-blue-400';
				case 'epic':
					return 'text-purple-400';
				case 'legendary':
					return 'text-yellow-400';
				default:
					return 'text-slate-400';
			}
		} else {
			switch (rarity) {
				case 'common':
					return 'text-gray-600';
				case 'rare':
					return 'text-blue-600';
				case 'epic':
					return 'text-purple-600';
				case 'legendary':
					return 'text-yellow-600';
				default:
					return 'text-gray-600';
			}
		}
	}

	// Show Lottie animation (placeholder for future implementation)
	async function showBadgeAnimation(lottieUrl: string) {
		console.log('[BadgeDisplay] Playing badge animation:', lottieUrl);
		showLottieAnimation = lottieUrl;

		// Hide animation after 3 seconds
		setTimeout(() => {
			showLottieAnimation = null;
		}, 3000);
	}

	// Format date
	function formatDate(timestamp: any) {
		if (!timestamp?.toDate) return '';
		return timestamp.toDate().toLocaleDateString();
	}
</script>

{#if currentTheme === 'neo'}
	<GlassCard header="🏆 Recent Badges">
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<Award class="h-5 w-5 text-lime-400" />
				<h2 class="text-xl font-bold text-slate-200">
					{showRecent ? 'Recent Badges' : 'Your Badges'}
				</h2>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if userBadges.length === 0}
				<div class="rounded-lg border border-slate-400/30 bg-slate-500/10 p-4 text-center">
					<Award class="mx-auto mb-2 h-8 w-8 text-slate-500" />
					<p class="text-slate-400">No badges earned yet!</p>
					<p class="text-xs text-slate-500">Complete activities to earn your first badge 🌟</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each userBadges as badge (badge.id)}
						{@const RarityIcon = getRarityIcon(badge.template.rarity)}

						<button
							onclick={() => showBadgeAnimation(badge.template.lottieUrl)}
							class="group rounded-xl border p-3 transition-all hover:scale-105 {getRarityStyles(
								badge.template.rarity
							)}"
						>
							<div class="space-y-2">
								<!-- Badge Icon/Animation Placeholder -->
								<div
									class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/20"
								>
									<RarityIcon class="h-6 w-6 {getRarityColor(badge.template.rarity)}" />
								</div>

								<!-- Badge Name -->
								<div class="text-center">
									<h3 class="text-sm font-medium text-slate-200 group-hover:text-lime-400">
										{badge.template.name}
									</h3>
									<p class="text-xs text-slate-400 capitalize">
										{badge.template.rarity}
									</p>
									{#if showRecent}
										<p class="text-xs text-slate-500">
											{formatDate(badge.earnedAt)}
										</p>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</GlassCard>
{:else}
	<PlayCard header="🏆 {showRecent ? 'Recent Badges' : 'Your Badges'}">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner />
			</div>
		{:else if userBadges.length === 0}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
				<Award class="mx-auto mb-2 h-8 w-8 text-gray-400" />
				<p class="text-gray-600">No badges earned yet!</p>
				<p class="text-xs text-gray-500">Complete activities to earn your first badge 🌟</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each userBadges as badge (badge.id)}
					{@const RarityIcon = getRarityIcon(badge.template.rarity)}

					<button
						onclick={() => showBadgeAnimation(badge.template.lottieUrl)}
						class="group rounded-xl border p-3 transition-all hover:scale-105 hover:shadow-md {getRarityStyles(
							badge.template.rarity
						)}"
					>
						<div class="space-y-2">
							<!-- Badge Icon/Animation Placeholder -->
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/50"
							>
								<RarityIcon class="h-6 w-6 {getRarityColor(badge.template.rarity)}" />
							</div>

							<!-- Badge Name -->
							<div class="text-center">
								<h3 class="text-sm font-medium text-gray-800 group-hover:text-indigo-600">
									{badge.template.name}
								</h3>
								<p class="text-xs text-gray-500 capitalize">
									{badge.template.rarity}
								</p>
								{#if showRecent}
									<p class="text-xs text-gray-400">
										{formatDate(badge.earnedAt)}
									</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</PlayCard>
{/if}

<!-- Lottie Animation Overlay (Placeholder) -->
{#if showLottieAnimation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="rounded-xl bg-white p-8 text-center shadow-2xl">
			<div class="mb-4 text-6xl">🎉</div>
			<h2 class="text-xl font-bold text-gray-800">Badge Earned!</h2>
			<p class="text-gray-600">Playing animation: {showLottieAnimation}</p>
			<button
				onclick={() => (showLottieAnimation = null)}
				class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
			>
				Close
			</button>
		</div>
	</div>
{/if}
