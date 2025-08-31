<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
	import { db, getFamilyId } from '$lib/firebase';
	import { Users, MessageSquare, Image } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import DailyAyah from '$lib/DailyAyah.svelte';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';

	dayjs.extend(relativeTime);

	let recentPosts = $state<any[]>([]);
	let loading = $state(true);
	let familyHighlights = $state<string[]>([]);

	onMount(async () => {
		try {
			const familyId = getFamilyId();

			// Get recent posts with author enrichment
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

			recentPosts = enrichedPosts;

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

	<!-- Family Highlights -->
	<div class="rounded-2xl bg-white shadow-sm p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Family Highlights</h3>
		{#if loading}
			<LoadingSpinner size="medium" message="Loading highlights..." />
		{:else if familyHighlights.length === 0}
			<div class="text-center py-8">
				<p class="text-gray-500">✨ No recent activity to highlight</p>
				<p class="text-sm text-gray-400 mt-1">Start sharing to see family highlights!</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each familyHighlights as highlight}
					<div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
						<div class="flex-1">
							<p class="text-sm text-gray-700">{highlight}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Activity -->
	<div class="rounded-lg bg-white shadow">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>

			{#if loading}
				<LoadingSpinner size="medium" message="Loading recent activity..." />
			{:else if recentPosts.length === 0}
				<div class="py-12 text-center">
					<MessageSquare class="mx-auto h-12 w-12 text-gray-400" />
					<h3 class="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
					<p class="mt-1 text-sm text-gray-500">
						Get started by sharing something with your family!
					</p>
					<div class="mt-6">
						<a
							href="/feed"
							class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
						>
							Go to Feed
						</a>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					{#each recentPosts as post}
						<div class="flex items-start space-x-3">
							<div class="flex-shrink-0">
								{#if post.author?.avatarUrl}
									<img
										class="h-10 w-10 rounded-full"
										src={post.author.avatarUrl}
										alt={post.author.displayName || 'User'}
									/>
								{:else}
									<div class="h-10 w-10 rounded-full bg-gray-300"></div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center space-x-2">
									<p class="text-sm font-medium text-gray-900">
										{post.author?.displayName || 'Unknown'}
									</p>
									{#if post.kind === 'photo' || post.kind === 'video'}
										<Image class="h-4 w-4 text-gray-400" />
									{:else}
										<MessageSquare class="h-4 w-4 text-gray-400" />
									{/if}
									<span class="text-sm text-gray-500">
										{dayjs(post.createdAt?.toDate()).fromNow()}
									</span>
								</div>
								<p class="mt-1 truncate text-sm text-gray-700">
									{#if post.kind === 'poll'}
										Poll: {post.poll?.title}
									{:else if post.kind === 'youtube'}
										Shared a YouTube video
									{:else if post.kind === 'photo'}
										Shared a photo{post.text ? `: ${post.text}` : ''}
									{:else if post.kind === 'video'}
										Shared a video{post.text ? `: ${post.text}` : ''}
									{:else}
										{post.text || post.content}
									{/if}
								</p>
							</div>
						</div>
					{/each}

					<div class="mt-6 text-center">
						<a href="/feed" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
							View all activity →
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="rounded-lg bg-white shadow">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<a
					href="/feed"
					class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					<div class="flex-shrink-0">
						<MessageSquare class="h-10 w-10 text-indigo-600" />
					</div>
					<div class="min-w-0 flex-1">
						<span class="absolute inset-0" aria-hidden="true"></span>
						<p class="text-sm font-medium text-gray-900">Share Update</p>
						<p class="truncate text-sm text-gray-500">Post to family feed</p>
					</div>
				</a>

				<a
					href="/profile"
					class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					<div class="flex-shrink-0">
						<Users class="h-10 w-10 text-indigo-600" />
					</div>
					<div class="min-w-0 flex-1">
						<span class="absolute inset-0" aria-hidden="true"></span>
						<p class="text-sm font-medium text-gray-900">Edit Profile</p>
						<p class="truncate text-sm text-gray-500">Update your info</p>
					</div>
				</a>

				<a
					href="/gallery"
					class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					<div class="flex-shrink-0">
						<Image class="h-10 w-10 text-indigo-600" />
					</div>
					<div class="min-w-0 flex-1">
						<span class="absolute inset-0" aria-hidden="true"></span>
						<p class="text-sm font-medium text-gray-900">Photo Gallery</p>
						<p class="truncate text-sm text-gray-500">View family photos</p>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>
