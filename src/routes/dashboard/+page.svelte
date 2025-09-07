<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
		doc,
		getDoc
	} from 'firebase/firestore';
	import { db, getFamilyId } from '$lib/firebase';
	import { Volume2, VolumeX } from 'lucide-svelte';
	// MessageSquare removed - unused import
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import DailyAyah from '$lib/DailyAyah.svelte';
	import DailyNudge from '$lib/DailyNudge.svelte';
	import WeeklyFeedback from '$lib/WeeklyFeedback.svelte';
	import BadgeDisplay from '$lib/BadgeDisplay.svelte';
	import SimilarityHighlights from '$lib/components/SimilarityHighlights.svelte';
	import BirthdayPreview from '$lib/BirthdayPreview.svelte';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import { soundEnabled, toggleSound } from '$lib/sound';
	import { themeStore, isNeoTheme } from '$lib/themes/neo';
	import {
		triggerParticleBurst,
		triggerAchievementParticles
	} from '$lib/themes/neo/utils/particles';

	dayjs.extend(relativeTime);

	let loading = $state(true);
	let currentTheme = $state('default');
	let unsubscribe: (() => void) | null = null;
	let familyHighlights = $state<
		Array<{
			id: string;
			text: string;
			emoji: string;
			author: {
				displayName: string;
				avatarUrl: string | null;
			};
			timeAgo: string;
		}>
	>([]);

	// Use $effect for theme-related side effects
	$effect(() => {
		// Subscribe to theme changes
		unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
			// Note: Particles are now only triggered by events, not theme changes
		});

		return () => {
			unsubscribe?.();
		};
	});

	onMount(async () => {
		try {
			const familyId = getFamilyId();

			// Get recent posts with author enrichment for family highlights
			const postsQuery = query(
				collection(db, 'posts'),
				where('familyId', '==', familyId),
				orderBy('createdAt', 'desc'),
				limit(5)
			);

			const postsSnapshot = await getDocs(postsQuery);
			const rawPosts = postsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			// Enrich posts with author data from users/{uid}
			const enrichedPosts = await Promise.all(
				rawPosts.map(async (post: any) => {
					if (post.authorUid) {
						const userDoc = await getDoc(doc(db, 'users', post.authorUid));
						if (userDoc.exists()) {
							const userData = userDoc.data();
							return {
								...post,
								author: {
									displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
									avatarUrl: userData.avatarUrl || null
								}
							};
						}
					}
					return { ...post, author: { displayName: getDisplayName(null), avatarUrl: null } };
				})
			);

			// Generate family highlights from recent activity with enhanced data
			familyHighlights = enrichedPosts.slice(0, 3).map((post: any) => {
				const authorName = post.author?.displayName || 'Someone';
				const timeAgo = dayjs(post.createdAt?.toDate()).fromNow();

				let emoji = '📝';
				if (post.kind === 'photo') emoji = '📷';
				else if (post.kind === 'video') emoji = '🎥';
				else if (post.kind === 'youtube') emoji = '🎬';
				else if (post.kind === 'poll') emoji = '📊';

				return {
					id: post.id,
					text: `${authorName} shared ${post.kind === 'text' ? 'an update' : `a ${post.kind}`} ${timeAgo}`,
					emoji,
					author: post.author,
					timeAgo
				};
			});
		} catch (error) {
			console.error('Error loading dashboard data:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-8">
	<!-- Header with Global Sound Toggle -->
	<div class="flex items-center justify-between">
		<div>
			<h1
				class="{currentTheme === 'neo'
					? 'neo-gradient-text'
					: ''} text-2xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-900'}"
			>
				Dashboard
			</h1>
			<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}">
				Welcome to your family hub
			</p>
		</div>
		<button
			onclick={toggleSound}
			class="rounded-lg p-2 transition-all duration-200 {currentTheme === 'neo'
				? $soundEnabled
					? 'neo-button border border-cyan-400/50 bg-cyan-500/20 text-cyan-400'
					: 'neo-glass text-slate-400 hover:bg-white/10'
				: $soundEnabled
					? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
					: 'bg-gray-100 text-gray-400 hover:bg-gray-200'}"
			aria-label={$soundEnabled ? 'Disable sounds' : 'Enable sounds'}
			title={$soundEnabled ? 'Sound ON - Click to mute' : 'Sound OFF - Click to enable'}
		>
			{#if $soundEnabled}
				<Volume2 class="h-5 w-5" />
			{:else}
				<VolumeX class="h-5 w-5" />
			{/if}
		</button>
	</div>

	<!-- Daily Nudge Section -->
	<section>
		<WeeklyFeedback />
	</section>

	<!-- AI-Powered Section -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<span class="text-2xl">🤖</span>
			<h2
				class="{currentTheme === 'neo'
					? 'neo-gradient-text'
					: ''} text-xl font-semibold {currentTheme === 'neo' ? '' : 'text-gray-800'}"
			>
				AI-Powered
			</h2>
		</div>
		<DailyNudge />
	</section>

	<!-- Spiritual Section -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<span class="text-2xl">🌙</span>
			<h2
				class="{currentTheme === 'neo'
					? 'neo-gradient-text'
					: ''} text-xl font-semibold {currentTheme === 'neo' ? '' : 'text-gray-800'}"
			>
				Spiritual
			</h2>
		</div>
		<DailyAyah />
	</section>

	<!-- Achievements Section -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<span class="text-2xl">🏆</span>
			<h2
				class="{currentTheme === 'neo'
					? 'neo-gradient-text'
					: ''} text-xl font-semibold {currentTheme === 'neo' ? '' : 'text-gray-800'}"
			>
				Achievements
			</h2>
		</div>
		<BadgeDisplay showRecent={true} maxDisplay={6} />
	</section>

	<!-- Family Section -->
	<section>
		<div class="mb-6 flex items-center gap-2">
			<span class="text-2xl">👨‍👩‍👧</span>
			<h2
				class="{currentTheme === 'neo'
					? 'neo-gradient-text'
					: ''} text-xl font-semibold {currentTheme === 'neo' ? '' : 'text-gray-800'}"
			>
				Family
			</h2>
		</div>

		<div class="space-y-6">
			<!-- Family Similarities -->
			<SimilarityHighlights />

			<!-- Birthday Preview -->
			<BirthdayPreview />

			<!-- Family Highlights -->
			{#if currentTheme === 'neo'}
				<GlassCard header="🌟 Family Highlights" glow={true} shimmer={true}>
					{#if loading}
						<LoadingSpinner size="medium" message="Loading highlights..." />
					{:else if familyHighlights.length === 0}
						<div class="py-8 text-center">
							<p class={currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}>
								✨ No recent activity to highlight
							</p>
							<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-400' : 'text-gray-400'}">
								Start sharing to see family highlights!
							</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each familyHighlights as highlight, i (highlight.id)}
								<div
									class="flex items-center space-x-3 rounded-xl p-3 transition-all duration-300 hover:scale-105 hover:shadow-sm {currentTheme ===
									'neo'
										? 'neo-glass hover:bg-white/10'
										: 'bg-gray-50 hover:bg-gray-100'}"
									style="animation: slideIn 0.5s ease-out {i * 150}ms both"
								>
									<div class="flex-shrink-0">
										{#if highlight.author.avatarUrl}
											<img
												src={highlight.author.avatarUrl}
												alt={highlight.author.displayName}
												class="h-8 w-8 rounded-full"
											/>
										{:else}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600"
											>
												{highlight.author.displayName.charAt(0).toUpperCase()}
											</div>
										{/if}
									</div>
									<div class="flex-1">
										<p
											class="text-sm {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-700'}"
										>
											<span class="font-medium">{highlight.author.displayName}</span>
											shared {highlight.emoji} • {highlight.timeAgo}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="mt-6 text-center">
						<a
							href="/feed"
							class="inline-flex items-center gap-1 text-sm font-medium {currentTheme === 'neo'
								? 'text-cyan-400 hover:text-cyan-300'
								: 'text-indigo-600 hover:text-indigo-500'} transition-colors"
						>
							View all activity →
						</a>
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="🌟 Family Highlights">
					{#if loading}
						<LoadingSpinner size="medium" message="Loading highlights..." />
					{:else if familyHighlights.length === 0}
						<div class="py-8 text-center">
							<p class={currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}>
								✨ No recent activity to highlight
							</p>
							<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-400' : 'text-gray-400'}">
								Start sharing to see family highlights!
							</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each familyHighlights as highlight, i (highlight.id)}
								<div
									class="flex items-center space-x-3 rounded-xl p-3 transition-all duration-300 hover:scale-105 hover:shadow-sm {currentTheme ===
									'neo'
										? 'neo-glass hover:bg-white/10'
										: 'bg-gray-50 hover:bg-gray-100'}"
									style="animation: slideIn 0.5s ease-out {i * 150}ms both"
								>
									<div class="flex-shrink-0">
										{#if highlight.author.avatarUrl}
											<img
												src={highlight.author.avatarUrl}
												alt={highlight.author.displayName}
												class="h-8 w-8 rounded-full"
											/>
										{:else}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600"
											>
												{highlight.author.displayName.charAt(0).toUpperCase()}
											</div>
										{/if}
									</div>
									<div class="flex-1">
										<p
											class="text-sm {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-700'}"
										>
											<span class="font-medium">{highlight.author.displayName}</span>
											shared {highlight.emoji} • {highlight.timeAgo}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="mt-6 text-center">
						<a
							href="/feed"
							class="inline-flex items-center gap-1 text-sm font-medium {currentTheme === 'neo'
								? 'text-cyan-400 hover:text-cyan-300'
								: 'text-indigo-600 hover:text-indigo-500'} transition-colors"
						>
							View all activity →
						</a>
					</div>
				</PlayCard>
			{/if}
		</div>
	</section>
</div>

<style>
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
