<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { SmartEngine, type UserNudge, type WeeklyFeedback, type UserBadge } from '$lib/smartEngine';
	import { characters } from '$lib/data/smartEngine';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { Heart, CheckCircle, Star } from 'lucide-svelte';

	// State
	let loading = $state(true);
	let todaysNudge = $state<UserNudge | null>(null);
	let error = $state<string | null>(null);
	let currentTheme = $state('default');
	let user = $state(auth.currentUser);

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Load today's nudge
	onMount(async () => {
		if (!user?.uid) {
			loading = false;
			return;
		}

		try {
			// Try to generate today's nudge (will return null if already exists)
			const nudge = await SmartEngine.generateDailyNudge(user.uid);
			
			if (nudge) {
				todaysNudge = nudge;
			} else {
				// Load existing nudge for today
				// TODO: Add method to get today's nudge from Firestore
				console.log('[DailyNudge] No new nudge generated (already exists for today)');
			}
		} catch (err) {
			console.error('[DailyNudge] Failed to load nudge:', err);
			error = 'Failed to load your daily nudge. Please try again later.';
		} finally {
			loading = false;
		}
	});

	// Mark nudge as read
	async function markAsRead() {
		if (!todaysNudge?.id || !user?.uid) return;

		try {
			// TODO: Update nudge as read in Firestore
			console.log('[DailyNudge] Marked as read:', todaysNudge.id);
		} catch (err) {
			console.error('[DailyNudge] Failed to mark as read:', err);
		}
	}

	// Get character data
	function getCharacterData(characterId: string) {
		return characters.find(c => c.id === characterId) || characters[0];
	}

	// Get type-specific styling
	function getTypeStyles(type: string) {
		if (currentTheme === 'neo') {
			switch (type) {
				case 'positive':
				case 'bonding':
					return 'border-lime-400/30 bg-lime-500/10';
				case 'islamic':
					return 'border-cyan-400/30 bg-cyan-500/10';
				case 'constructive':
					return 'border-amber-400/30 bg-amber-500/10';
				case 'reflection':
					return 'border-purple-400/30 bg-purple-500/10';
				default:
					return 'border-slate-400/30 bg-slate-500/10';
			}
		} else {
			switch (type) {
				case 'positive':
				case 'bonding':
					return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200';
				case 'islamic':
					return 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200';
				case 'constructive':
					return 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200';
				case 'reflection':
					return 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200';
				default:
					return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200';
			}
		}
	}

	// Get type icon
	function getTypeIcon(type: string) {
		switch (type) {
			case 'positive':
			case 'bonding':
				return Heart;
			case 'islamic':
				return Star;
			case 'constructive':
			case 'reflection':
				return CheckCircle;
			default:
				return Heart;
		}
	}
</script>

{#if currentTheme === 'neo'}
	<GlassCard header="🌟 Your Daily Nudge">
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<div class="text-2xl">🌟</div>
				<h2 class="text-xl font-bold text-slate-200">Your Daily Nudge</h2>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if error}
				<div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-center">
					<p class="text-red-400">{error}</p>
				</div>
			{:else if todaysNudge}
				{@const character = getCharacterData(todaysNudge.character)}
				{@const TypeIcon = getTypeIcon(todaysNudge.type)}
				
				<div class="space-y-4 rounded-xl border p-4 {getTypeStyles(todaysNudge.type)}">
					<!-- Character and Type -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-2xl">{character.emoji}</span>
							<span class="font-medium text-slate-300">{character.name}</span>
						</div>
						<div class="flex items-center gap-1">
							<TypeIcon class="h-4 w-4 text-slate-400" />
							<span class="text-xs capitalize text-slate-400">{todaysNudge.type}</span>
						</div>
					</div>

					<!-- Generated Text -->
					<div class="space-y-3">
						<p class="text-lg leading-relaxed text-slate-200">
							{todaysNudge.generatedText}
						</p>

						<!-- Islamic Context -->
						{#if todaysNudge.islamicContext}
							<div class="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
								<p class="text-sm italic text-cyan-300">
									"{todaysNudge.islamicContext.ayah}"
								</p>
								<p class="mt-1 text-xs text-cyan-400">
									— {todaysNudge.islamicContext.reference}
								</p>
							</div>
						{/if}

						<!-- Traits Used -->
						{#if todaysNudge.traits.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each todaysNudge.traits as trait}
									<span class="rounded-full bg-lime-500/20 px-2 py-1 text-xs text-lime-300">
										{trait}
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Action Button -->
					<div class="flex justify-center pt-2">
						<button
							onclick={markAsRead}
							class="rounded-lg border border-lime-400/50 bg-lime-500/20 px-4 py-2 text-sm font-medium text-lime-400 transition-colors hover:bg-lime-500/30"
						>
							Thanks, {character.name}! ✨
						</button>
					</div>
				</div>
			{:else}
				<div class="rounded-lg border border-slate-400/30 bg-slate-500/10 p-4 text-center">
					<p class="text-slate-400">No nudge available today. Check back tomorrow! 🌟</p>
				</div>
			{/if}
		</div>
	</GlassCard>
{:else}
	<PlayCard header="🌟 Your Daily Nudge">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner />
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
				<p class="text-red-700">{error}</p>
			</div>
		{:else if todaysNudge}
			{@const character = getCharacterData(todaysNudge.character)}
			{@const TypeIcon = getTypeIcon(todaysNudge.type)}
			
			<div class="space-y-4 rounded-xl border p-4 {getTypeStyles(todaysNudge.type)}">
				<!-- Character and Type -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-2xl">{character.emoji}</span>
						<span class="font-medium text-gray-700">{character.name}</span>
					</div>
					<div class="flex items-center gap-1">
						<TypeIcon class="h-4 w-4 text-gray-500" />
						<span class="text-xs capitalize text-gray-500">{todaysNudge.type}</span>
					</div>
				</div>

				<!-- Generated Text -->
				<div class="space-y-3">
					<p class="text-lg leading-relaxed text-gray-800">
						{todaysNudge.generatedText}
					</p>

					<!-- Islamic Context -->
					{#if todaysNudge.islamicContext}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
							<p class="text-sm italic text-blue-700">
								"{todaysNudge.islamicContext.ayah}"
							</p>
							<p class="mt-1 text-xs text-blue-600">
								— {todaysNudge.islamicContext.reference}
							</p>
						</div>
					{/if}

					<!-- Traits Used -->
					{#if todaysNudge.traits.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each todaysNudge.traits as trait}
								<span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
									{trait}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Action Button -->
				<div class="flex justify-center pt-2">
					<button
						onclick={markAsRead}
						class="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-shadow hover:shadow-md"
					>
						Thanks, {character.name}! ✨
					</button>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
				<p class="text-gray-600">No nudge available today. Check back tomorrow! 🌟</p>
			</div>
		{/if}
	</PlayCard>
{/if}