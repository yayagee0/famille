<script lang="ts">
	import { onMount } from 'svelte';
	import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from './firebase';
	import { auth } from './firebase';
	import { useWidgetContext } from './widget-context';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import dayjs from 'dayjs';

	// Get widget context for family members
	const { members, current } = useWidgetContext();

	// Available mood emojis
	const moods = [
		{ emoji: '😊', label: 'Happy' },
		{ emoji: '😔', label: 'Sad' },
		{ emoji: '😴', label: 'Tired' },
		{ emoji: '😎', label: 'Cool' },
		{ emoji: '😰', label: 'Stressed' },
		{ emoji: '🤗', label: 'Excited' },
		{ emoji: '😡', label: 'Angry' },
		{ emoji: '🤔', label: 'Thoughtful' }
	];

	// State for family mood check-ins
	let familyMoods = $state<Record<string, { emoji: string; label: string; timestamp: Date }>>({});
	let loading = $state(true);

	// Get today's date string for document ID
	const today = dayjs().format('YYYY-MM-DD');

	async function loadTodaysMoods() {
		try {
			const moodDoc = await getDoc(doc(db, 'daily-moods', today));
			if (moodDoc.exists()) {
				const data = moodDoc.data();
				familyMoods = data.moods || {};
			}
		} catch (error) {
			console.error('Error loading daily moods:', error);
		} finally {
			loading = false;
		}
	}

	async function selectMood(selectedMood: { emoji: string; label: string }) {
		if (!auth.currentUser) return;

		const userEmail = auth.currentUser.email;
		if (!userEmail) return;

		try {
			// Update family moods state
			familyMoods = {
				...familyMoods,
				[userEmail]: {
					...selectedMood,
					timestamp: new Date()
				}
			};

			// Save to Firestore
			await setDoc(
				doc(db, 'daily-moods', today),
				{
					date: today,
					moods: familyMoods,
					updatedAt: serverTimestamp()
				},
				{ merge: true }
			);
		} catch (error) {
			console.error('Error saving mood:', error);
		}
	}

	onMount(() => {
		loadTodaysMoods();
	});
</script>

<!-- Responsive: full width on mobile (sm and below), compact card on larger screens -->
<div class="mx-auto w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:max-w-sm">
	<div class="mb-4 flex items-center justify-center">
		<h3 class="text-lg font-semibold text-gray-900">🌟 Daily Mood</h3>
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<LoadingSpinner size="small" message="Loading moods..." />
		</div>
	{:else}
		<!-- Family members mood display with overflow handling -->
		<div class="mb-6 max-h-48 overflow-y-auto">
			<div class="space-y-3">
				{#each Object.values(members) as member}
					{@const memberMood = familyMoods[member.email]}
					<div class="flex items-center space-x-3 rounded-xl bg-gray-50 p-3">
						<div class="flex-shrink-0">
							{#if memberMood}
								<span class="text-2xl">{memberMood.emoji}</span>
							{:else}
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
									<span class="text-xs text-gray-400">?</span>
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between">
								<p class="truncate text-sm font-medium text-gray-900">{member.displayName}</p>
								{#if auth.currentUser?.email === member.email}
									<span class="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700"
										>You</span
									>
								{/if}
							</div>
							<p class="mt-1 text-sm text-gray-600">
								{#if memberMood}
									{memberMood.label}
								{:else}
									<span class="text-gray-400">Not set today</span>
								{/if}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Mood selection for current user -->
		{#if auth.currentUser}
			<div class="border-t border-gray-200 pt-4">
				<p class="mb-3 text-center text-sm font-medium text-gray-700">How are you feeling today?</p>
				<div class="grid grid-cols-4 gap-2">
					{#each moods as mood}
						<button
							class="flex flex-col items-center justify-center space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all hover:scale-105 hover:bg-gray-100 active:scale-95"
							onclick={() => selectMood(mood)}
						>
							<span class="text-lg">{mood.emoji}</span>
							<span class="text-center text-xs leading-tight font-medium text-gray-700"
								>{mood.label}</span
							>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
