<script lang="ts">
	import { onMount } from 'svelte';
	import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from './firebase';
	import { auth } from './firebase';
	import { birthdays } from './birthdays';
	import dayjs from 'dayjs';

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

<div class="rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-orange-800">🌟 Daily Mood Check-in</h3>

	{#if loading}
		<div class="animate-pulse">
			<div class="h-4 w-24 rounded bg-gray-200"></div>
		</div>
	{:else}
		<!-- Family members mood display -->
		<div class="mb-4 space-y-3">
			{#each birthdays as member}
				{@const memberMood = familyMoods[member.email]}
				<div class="flex items-center space-x-3 rounded-xl bg-white/50 p-3">
					<div class="text-2xl">
						{#if memberMood}
							{memberMood.emoji}
						{:else}
							<div class="h-8 w-8 rounded-full bg-gray-200"></div>
						{/if}
					</div>
					<div class="flex-1">
						<p class="font-medium text-gray-900">{member.name}</p>
						<p class="text-xs text-gray-600">
							{#if memberMood}
								Feeling {memberMood.label.toLowerCase()}
							{:else}
								Hasn't checked in today
							{/if}
						</p>
					</div>
					{#if auth.currentUser?.email === member.email}
						<span class="text-xs text-orange-600">You</span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Mood selection for current user -->
		{#if auth.currentUser}
			<div class="border-t border-orange-200 pt-4">
				<p class="mb-3 text-sm font-medium text-orange-800">How are you feeling today?</p>
				<div class="grid grid-cols-4 gap-2">
					{#each moods as mood}
						<button
							class="flex flex-col items-center space-y-1 rounded-lg bg-white p-3 shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95"
							onclick={() => selectMood(mood)}
						>
							<span class="text-xl">{mood.emoji}</span>
							<span class="text-xs font-medium text-gray-700">{mood.label}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>