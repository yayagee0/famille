<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
		doc,
		updateDoc
	} from 'firebase/firestore';
	import { db, getFamilyId } from '$lib/firebase';
	import { SmartEngine, type DailyPoll } from '$lib/smartEngine';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { Vote, Clock, TrendingUp } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	// State
	let loading = $state(true);
	let currentPoll = $state<DailyPoll | null>(null);
	let hasVoted = $state(false);
	let selectedOption = $state<string | null>(null);
	let voting = $state(false);
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

	// Load current poll
	onMount(async () => {
		if (!user?.uid) {
			loading = false;
			return;
		}

		try {
			const familyId = await getFamilyId();

			// Get today's poll
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const pollQuery = query(
				collection(db, 'daily_polls'),
				where('familyId', '==', familyId),
				where('createdAt', '>=', today),
				where('createdAt', '<', tomorrow),
				where('isClosed', '==', false),
				orderBy('createdAt', 'desc'),
				limit(1)
			);

			const pollSnapshot = await getDocs(pollQuery);

			if (!pollSnapshot.empty) {
				const pollDoc = pollSnapshot.docs[0];
				currentPoll = { id: pollDoc.id, ...pollDoc.data() } as DailyPoll;

				// Check if user has already voted
				hasVoted = currentPoll.votes && user.uid in currentPoll.votes;
				if (hasVoted) {
					selectedOption = currentPoll.votes[user.uid];
				}
			} else {
				// Try to generate today's poll if it doesn't exist
				const generatedPoll = await SmartEngine.generateDailyPoll(familyId);
				if (generatedPoll) {
					currentPoll = generatedPoll;
				}
			}
		} catch (err) {
			console.error('[DailyPoll] Failed to load poll:', err);
			error = "Failed to load today's poll. Please try again later.";
		} finally {
			loading = false;
		}
	});

	// Vote on poll
	async function vote(optionIndex: number) {
		if (!currentPoll?.id || !user?.uid || hasVoted || voting) return;

		try {
			voting = true;

			// Update poll with vote
			const updatedVotes = { ...currentPoll.votes };
			updatedVotes[user.uid] = optionIndex.toString();

			await updateDoc(doc(db, 'daily_polls', currentPoll.id), {
				votes: updatedVotes
			});

			// Update local state
			currentPoll.votes = updatedVotes;
			hasVoted = true;
			selectedOption = optionIndex.toString();

			// Track analytics
			await SmartEngine.trackUserAnalytics(user.uid, 'poll_voted');

			console.log('[DailyPoll] Vote submitted:', optionIndex);
		} catch (err) {
			console.error('[DailyPoll] Failed to vote:', err);
			alert('Failed to submit vote. Please try again.');
		} finally {
			voting = false;
		}
	}

	// Calculate poll results for display
	function calculateResults() {
		if (!currentPoll) return [];

		const optionCounts = currentPoll.options.map(() => 0);
		Object.values(currentPoll.votes || {}).forEach((optionIndex) => {
			const index = parseInt(optionIndex);
			if (index >= 0 && index < optionCounts.length) {
				optionCounts[index]++;
			}
		});

		const totalVotes = optionCounts.reduce((sum, count) => sum + count, 0);

		return currentPoll.options.map((option, index) => ({
			option,
			count: optionCounts[index],
			percentage: totalVotes > 0 ? Math.round((optionCounts[index] / totalVotes) * 100) : 0
		}));
	}

	// Get time remaining
	function getTimeRemaining() {
		if (!currentPoll?.closesAt) return '';

		const closesAt = currentPoll.closesAt.toDate
			? currentPoll.closesAt.toDate()
			: new Date(currentPoll.closesAt);
		return dayjs(closesAt).fromNow();
	}

	// Check if poll is closed
	function isPollClosed() {
		if (!currentPoll?.closesAt) return false;

		const closesAt = currentPoll.closesAt.toDate
			? currentPoll.closesAt.toDate()
			: new Date(currentPoll.closesAt);
		return new Date() > closesAt;
	}

	let results = $derived(calculateResults());
	let timeRemaining = $derived(getTimeRemaining());
	let isClosed = $derived(isPollClosed());
</script>

{#if currentPoll}
	{#if currentTheme === 'neo'}
		<GlassCard header="📊 Daily Poll">
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<Vote class="h-5 w-5 text-lime-400" />
					<h2 class="text-xl font-bold text-slate-200">Daily Poll</h2>
					{#if !isClosed}
						<div class="flex items-center gap-1 text-xs text-slate-400">
							<Clock class="h-3 w-3" />
							<span>Closes {timeRemaining}</span>
						</div>
					{/if}
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-8">
						<LoadingSpinner />
					</div>
				{:else if error}
					<div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-center">
						<p class="text-red-400">{error}</p>
					</div>
				{:else}
					<!-- Question -->
					<div class="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
						<h3 class="mb-4 text-lg font-medium text-slate-200">
							{currentPoll.question}
						</h3>

						<!-- Options -->
						<div class="space-y-3">
							{#each currentPoll.options as option, index}
								{@const result = results[index]}
								{@const isSelected = selectedOption === index.toString()}
								{@const canVote = !hasVoted && !isClosed && !voting}

								<button
									onclick={() => canVote && vote(index)}
									disabled={!canVote}
									class="relative w-full overflow-hidden rounded-lg border border-slate-600 p-3 text-left transition-colors hover:border-lime-400/50 disabled:cursor-not-allowed {isSelected
										? 'border-lime-400'
										: ''} {isSelected && currentTheme === 'neo' ? 'bg-lime-500/10' : ''} {canVote &&
									currentTheme === 'neo'
										? 'hover:bg-slate-700/50'
										: ''}"
								>
									<!-- Progress bar (if voted or closed) -->
									{#if hasVoted || isClosed}
										<div
											class="absolute inset-0 bg-gradient-to-r from-lime-500/20 to-transparent transition-all duration-500"
											style="width: {result.percentage}%"
										></div>
									{/if}

									<div class="relative flex items-center justify-between">
										<span class="text-slate-200">{option}</span>

										{#if hasVoted || isClosed}
											<div class="flex items-center gap-2 text-sm">
												<span class="text-slate-400"
													>{result.count} vote{result.count !== 1 ? 's' : ''}</span
												>
												<span class="font-medium text-lime-400">{result.percentage}%</span>
											</div>
										{/if}

										{#if isSelected}
											<div class="absolute -top-2 -right-2 rounded-full bg-lime-500 p-1">
												<Vote class="h-3 w-3 text-white" />
											</div>
										{/if}
									</div>
								</button>
							{/each}
						</div>

						<!-- Status -->
						<div class="mt-4 text-center">
							{#if voting}
								<div class="flex items-center justify-center gap-2 text-lime-400">
									<LoadingSpinner size="small" />
									<span>Submitting vote...</span>
								</div>
							{:else if hasVoted}
								<p class="text-lime-400">
									✨ Thanks for voting! Results will be shared when the poll closes.
								</p>
							{:else if isClosed}
								<p class="text-slate-400">📊 This poll has closed</p>
							{:else}
								<p class="text-slate-400">Cast your vote above! 🗳️</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</GlassCard>
	{:else}
		<PlayCard header="📊 Daily Poll">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<LoadingSpinner />
				</div>
			{:else if error}
				<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
					<p class="text-red-700">{error}</p>
				</div>
			{:else}
				<!-- Question -->
				<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-800">
							{currentPoll.question}
						</h3>
						{#if !isClosed}
							<div class="flex items-center gap-1 text-xs text-gray-500">
								<Clock class="h-3 w-3" />
								<span>Closes {timeRemaining}</span>
							</div>
						{/if}
					</div>

					<!-- Options -->
					<div class="space-y-3">
						{#each currentPoll.options as option, index}
							{@const result = results[index]}
							{@const isSelected = selectedOption === index.toString()}
							{@const canVote = !hasVoted && !isClosed && !voting}

							<button
								onclick={() => canVote && vote(index)}
								disabled={!canVote}
								class="relative w-full overflow-hidden rounded-lg border border-gray-300 p-3 text-left transition-colors hover:border-indigo-400 disabled:cursor-not-allowed"
								class:border-indigo-500={isSelected}
								class:bg-indigo-50={isSelected}
								class:hover:bg-gray-100={canVote}
							>
								<!-- Progress bar (if voted or closed) -->
								{#if hasVoted || isClosed}
									<div
										class="absolute inset-0 bg-gradient-to-r from-indigo-200 to-transparent transition-all duration-500"
										style="width: {result.percentage}%"
									></div>
								{/if}

								<div class="relative flex items-center justify-between">
									<span class="text-gray-800">{option}</span>

									{#if hasVoted || isClosed}
										<div class="flex items-center gap-2 text-sm">
											<span class="text-gray-600"
												>{result.count} vote{result.count !== 1 ? 's' : ''}</span
											>
											<span class="font-medium text-indigo-600">{result.percentage}%</span>
										</div>
									{/if}

									{#if isSelected}
										<div class="absolute -top-2 -right-2 rounded-full bg-indigo-500 p-1">
											<Vote class="h-3 w-3 text-white" />
										</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>

					<!-- Status -->
					<div class="mt-4 text-center">
						{#if voting}
							<div class="flex items-center justify-center gap-2 text-indigo-600">
								<LoadingSpinner size="small" />
								<span>Submitting vote...</span>
							</div>
						{:else if hasVoted}
							<p class="text-indigo-600">
								✨ Thanks for voting! Results will be shared when the poll closes.
							</p>
						{:else if isClosed}
							<p class="text-gray-600">📊 This poll has closed</p>
						{:else}
							<p class="text-gray-600">Cast your vote above! 🗳️</p>
						{/if}
					</div>
				</div>
			{/if}
		</PlayCard>
	{/if}
{/if}
