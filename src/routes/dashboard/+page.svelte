<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
	import { db, getFamilyId } from '$lib/firebase';
	import { Users, MessageSquare, Image, Calendar } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	let stats = $state({
		totalPosts: 0,
		totalPhotos: 0,
		totalMembers: 4, // Based on allowlist
		lastActivity: null as Date | null
	});

	let recentPosts = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const familyId = getFamilyId();

			// Get recent posts
			const postsQuery = query(
				collection(db, 'posts'),
				where('familyId', '==', familyId),
				orderBy('createdAt', 'desc'),
				limit(5)
			);

			const postsSnapshot = await getDocs(postsQuery);
			recentPosts = postsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			// Calculate stats
			stats.totalPosts = postsSnapshot.size;
			stats.totalPhotos = recentPosts.filter((post) => post.type === 'photo').length;
			stats.lastActivity = recentPosts.length > 0 ? recentPosts[0].createdAt?.toDate() : null;
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

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Total Posts -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<MessageSquare class="h-6 w-6 text-gray-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Total Posts</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.totalPosts}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<!-- Total Photos -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<Image class="h-6 w-6 text-gray-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Photos Shared</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.totalPhotos}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<!-- Family Members -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<Users class="h-6 w-6 text-gray-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Family Members</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.totalMembers}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<!-- Last Activity -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<Calendar class="h-6 w-6 text-gray-400" />
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Last Activity</dt>
							<dd class="text-lg font-medium text-gray-900">
								{stats.lastActivity ? dayjs(stats.lastActivity).fromNow() : 'No activity'}
							</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Activity -->
	<div class="rounded-lg bg-white shadow">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>

			{#if loading}
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="flex animate-pulse items-center space-x-4">
							<div class="h-10 w-10 rounded-full bg-gray-200"></div>
							<div class="flex-1 space-y-2">
								<div class="h-4 w-3/4 rounded bg-gray-200"></div>
								<div class="h-3 w-1/2 rounded bg-gray-200"></div>
							</div>
						</div>
					{/each}
				</div>
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
								{#if post.author?.photoURL}
									<img
										class="h-10 w-10 rounded-full"
										src={post.author.photoURL}
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
									{#if post.type === 'photo' || post.type === 'video'}
										<Image class="h-4 w-4 text-gray-400" />
									{:else}
										<MessageSquare class="h-4 w-4 text-gray-400" />
									{/if}
									<span class="text-sm text-gray-500">
										{dayjs(post.createdAt?.toDate()).fromNow()}
									</span>
								</div>
								<p class="mt-1 truncate text-sm text-gray-700">
									{#if post.type === 'poll'}
										Poll: {post.poll?.question}
									{:else if post.type === 'youtube'}
										Shared a YouTube video
									{:else if post.type === 'photo'}
										Shared a photo{post.content ? `: ${post.content}` : ''}
									{:else if post.type === 'video'}
										Shared a video{post.content ? `: ${post.content}` : ''}
									{:else}
										{post.content}
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

				<div
					class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm"
				>
					<div class="flex-shrink-0">
						<Image class="h-10 w-10 text-indigo-600" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-gray-900">Photo Gallery</p>
						<p class="truncate text-sm text-gray-500">Coming soon</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
