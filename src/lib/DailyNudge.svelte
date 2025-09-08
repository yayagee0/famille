<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { generateMemoryNudge } from '$lib/smartEngine';
	import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { Heart, CheckCircle, Star } from 'lucide-svelte';

	// State
	let loading = $state(true);
	let todaysNudge = $state<string | null>(null);
	let error = $state<string | null>(null);
	let currentTheme = $state('default');
	let user = $state(auth.currentUser);
	let acknowledged = $state(false);

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
			// Check if user already acknowledged today's nudge
			const today = new Date().toISOString().split('T')[0];
			const nudgeDoc = await getDoc(doc(db, 'users', user.uid, 'nudges', today));
			
			if (nudgeDoc.exists() && nudgeDoc.data()?.acknowledged) {
				// User already acknowledged today's nudge
				acknowledged = true;
				loading = false;
				return;
			}
			
			// Generate memory-based nudge for today
			const nudge = await generateMemoryNudge(user.uid);
			todaysNudge = nudge;
		} catch (err) {
			console.error('[DailyNudge] Failed to load nudge:', err);
			error = 'Failed to load your daily nudge. Please try again later.';
		} finally {
			loading = false;
		}
	});

	// Mark nudge as acknowledged  
	async function acknowledgNudge() {
		if (!user?.uid || !todaysNudge) return;

		try {
			const today = new Date().toISOString().split('T')[0];
			const nudgeRef = doc(db, 'users', user.uid, 'nudges', today);
			
			await setDoc(nudgeRef, {
				acknowledged: true,
				acknowledgedAt: serverTimestamp(),
				nudgeText: todaysNudge
			});
			
			acknowledged = true;
			console.log('[DailyNudge] Nudge acknowledged');
		} catch (err) {
			console.error('[DailyNudge] Failed to acknowledge nudge:', err);
		}
	}

	// Get type-specific styling
	function getTypeStyles() {
		if (currentTheme === 'neo') {
			return 'border-lime-400/30 bg-lime-500/10';
		} else {
			return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200';
		}
	}
</script>

{#if currentTheme === 'neo'}
	<GlassCard header="🌟 Daily Memory Nudge">
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<div class="text-2xl">🌟</div>
				<h2 class="text-xl font-bold text-slate-200">Daily Memory Nudge</h2>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if error}
				<div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-center">
					<p class="text-red-400">{error}</p>
				</div>
			{:else if acknowledged}
				<div class="rounded-lg border border-lime-400/30 bg-lime-500/10 p-4 text-center">
					<p class="text-lime-300">✅ Thanks for checking in today! See you tomorrow.</p>
				</div>
			{:else if todaysNudge}
				<div class="space-y-4 rounded-xl border p-4 {getTypeStyles()}">
					<!-- Generated Text -->
					<div class="space-y-3">
						<p class="text-lg leading-relaxed text-slate-200">
							{todaysNudge}
						</p>
					</div>

					<!-- Action Button -->
					<div class="flex justify-center pt-2">
						<button
							onclick={acknowledgNudge}
							class="rounded-lg border border-lime-400/50 bg-lime-500/20 px-4 py-2 text-sm font-medium text-lime-400 transition-colors hover:bg-lime-500/30"
						>
							Thanks! ✨
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
	<PlayCard header="🌟 Daily Memory Nudge">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner />
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
				<p class="text-red-700">{error}</p>
			</div>
		{:else if acknowledged}
			<div class="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
				<p class="text-green-700">✅ Thanks for checking in today! See you tomorrow.</p>
			</div>
		{:else if todaysNudge}
			<div class="space-y-4 rounded-xl border p-4 {getTypeStyles()}">
				<!-- Generated Text -->
				<div class="space-y-3">
					<p class="text-lg leading-relaxed text-gray-800">
						{todaysNudge}
					</p>
				</div>

				<!-- Action Button -->
				<div class="flex justify-center pt-2">
					<button
						onclick={acknowledgNudge}
						class="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-shadow hover:shadow-md"
					>
						Thanks! ✨
					</button>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
				<p class="text-gray-600">No nudge available today. Check back tomorrow 🌟</p>
			</div>
		{/if}
	</PlayCard>
{/if}
