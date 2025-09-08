<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import FunFeedCard from '$lib/components/FunFeedCard.svelte';
	import type { FunFeedEntry } from '$lib/schema';
	
	let feedEntries: FunFeedEntry[] = $state([]);
	let isLoading = $state(true);
	
	onMount(async () => {
		try {
			// Load Fun Feed entries for demonstration
			const feedQuery = query(
				collection(db, 'fun_feed'),
				orderBy('createdAt', 'desc'),
				limit(10)
			);
			
			const feedSnapshot = await getDocs(feedQuery);
			feedEntries = feedSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			})) as FunFeedEntry[];
			
		} catch (error) {
			console.error('Failed to load Fun Feed entries:', error);
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Fun Feed</h1>
	
	{#if isLoading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
		</div>
	{:else if feedEntries.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500 text-lg">No feed entries yet!</p>
			<p class="text-gray-400 text-sm mt-2">Create polls and share feedback with FamilyBot to see them here.</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each feedEntries as entry (entry.id)}
				<FunFeedCard {entry} />
			{/each}
		</div>
	{/if}
</div>