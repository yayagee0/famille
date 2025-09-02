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
	import { MessageSquare } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import DailyAyah from '$lib/DailyAyah.svelte';
	import DailyMoodCheckin from '$lib/DailyMoodCheckin.svelte';
	import SimilarityHighlights from '$lib/components/SimilarityHighlights.svelte';
	import BirthdayPreview from '$lib/BirthdayPreview.svelte';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';

	dayjs.extend(relativeTime);

	let loading = $state(true);
	let familyHighlights = $state<string[]>([]);

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
									displayName: userData.displayName || 'Unknown User',
									avatarUrl: userData.avatarUrl || null
								}
							};
						}
					}
					return { ...post, author: { displayName: 'Unknown User', avatarUrl: null } };
				})
			);

			// Generate family highlights from recent activity
			familyHighlights = enrichedPosts.slice(0, 3).map((post: any) => {
				const authorName = post.author?.displayName || 'Someone';
				const timeAgo = dayjs(post.createdAt?.toDate()).fromNow();

				if (post.kind === 'photo') return `${authorName} shared a photo ${timeAgo} 📷`;
				if (post.kind === 'video') return `${authorName} shared a video ${timeAgo} 🎥`;
				if (post.kind === 'youtube') return `${authorName} shared a YouTube video ${timeAgo} 🎬`;
				if (post.kind === 'poll') return `${authorName} created a poll ${timeAgo} 📊`;
				return `${authorName} shared an update ${timeAgo} 💬`;
			});
		} catch (error) {
			console.error('Error loading dashboard data:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">Welcome to your family hub</p>
	</div>

	<!-- Daily Ayah -->
	<DailyAyah />

	<!-- Daily Mood Check-in -->
	<DailyMoodCheckin />

	<!-- Family Similarities -->
	<SimilarityHighlights />

	<!-- Birthday Preview (moved from playground) -->
	<BirthdayPreview />

	<!-- Family Highlights -->
	<div class="rounded-2xl bg-white p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Family Highlights</h3>
		{#if loading}
			<LoadingSpinner size="medium" message="Loading highlights..." />
		{:else if familyHighlights.length === 0}
			<div class="py-8 text-center">
				<p class="text-gray-500">✨ No recent activity to highlight</p>
				<p class="mt-1 text-sm text-gray-400">Start sharing to see family highlights!</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each familyHighlights as highlight}
					<div class="flex items-center space-x-3 rounded-xl bg-gray-50 p-3">
						<div class="flex-1">
							<p class="text-sm text-gray-700">{highlight}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="mt-4 text-center">
			<a href="/feed" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
				View all activity →
			</a>
		</div>
	</div>
</div>
