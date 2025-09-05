<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		orderBy,
		getDoc,
		doc,
		updateDoc,
		deleteDoc,
		arrayUnion,
		arrayRemove,
		onSnapshot
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';
	import FeedUpload from '$lib/FeedUpload.svelte';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { themeStore } from '$lib/themes/neo';
	import { ensureUserProfile } from '$lib/auth';
	import { getDisplayName } from '$lib/getDisplayName';
	import { Heart, MessageCircle, Trash2, WifiOff } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import { isOnline, cachePosts, getCachedPosts } from '$lib/offline';
	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let posts = $state<any[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Dynamic import for VideoPlayer component
	let VideoPlayerComponent = $state<any>(null);

	async function loadVideoPlayer() {
		if (!VideoPlayerComponent) {
			const { default: VideoPlayer } = await import('$lib/components/VideoPlayer.svelte');
			VideoPlayerComponent = VideoPlayer;
		}
	}
	// Cache for user display names
	let userCache = $state<Map<string, string>>(new Map());
	// Track which posts have comments section open
	let openComments = $state<Set<string>>(new Set());
	// Track comment input values for each post
	let commentInputs = $state<Map<string, string>>(new Map());

	// Simple text sanitization function
	function sanitizeText(text: string): string {
		if (!text) return '';

		return (
			text
				// Remove HTML tags
				.replace(/<[^>]*>/g, '')
				// Remove script content
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
				// Convert HTML entities
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&')
				.replace(/&quot;/g, '"')
				.replace(/&#x27;/g, "'")
				// Trim whitespace
				.trim()
				// Limit length to prevent spam
				.substring(0, 500)
		);
	}

	onMount(() => {
		const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				await ensureUserProfile(firebaseUser);
				subscribeToPosts();
			} else {
				if (unsubscribePosts) unsubscribePosts();
				posts = [];
			}
		});
		return () => {
			unsubAuth();
			if (unsubscribePosts) unsubscribePosts();
		};
	});

	// 🔄 Real-time posts with author enrichment and offline support
	function subscribeToPosts() {
		// First, try to load from cache
		const cachedPosts = getCachedPosts();
		if (cachedPosts && !$isOnline) {
			console.log('[Feed] Loading from cache (offline)');
			posts = cachedPosts;
			loading = false;
		} else if (cachedPosts) {
			console.log('[Feed] Loading from cache while fetching fresh data');
			posts = cachedPosts;
			loading = false;
		}

		// If online, subscribe to real-time updates
		if ($isOnline) {
			const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

			if (!cachedPosts) loading = true;

			unsubscribePosts = onSnapshot(
				postsQuery,
				async (snapshot) => {
					const rawPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<any>;

					// Preload VideoPlayer if there are video posts
					const hasVideoPosts = rawPosts.some((post: any) => post.videoPath);
					if (hasVideoPosts) {
						loadVideoPlayer();
					}

					const enriched = await Promise.all(
						rawPosts.map(async (post: any) => {
							if (post.authorUid) {
								const uDoc = await getDoc(doc(db, 'users', post.authorUid));
								if (uDoc.exists()) {
									const u = uDoc.data();
									return {
										...post,
										author: {
											displayName: getDisplayName(u.email, { nickname: u.nickname }),
											avatarUrl: u.avatarUrl || null
										}
									};
								}
							}
							return { ...post, author: { displayName: getDisplayName(null), avatarUrl: null } };
						})
					);

					posts = enriched;
					loading = false;

					// Cache the enriched posts for offline access
					cachePosts(enriched);
					console.log('[Feed] Fresh data loaded and cached');
				},
				(err) => {
					console.error('Feed subscription error:', err);
					loading = false;

					// If we have cached data, use it as fallback
					const cachedPosts = getCachedPosts();
					if (cachedPosts && posts.length === 0) {
						posts = cachedPosts;
						console.log('[Feed] Using cached data as fallback after error');
					}
				}
			);
		} else {
			console.log('[Feed] Offline mode - using cached data only');
		}
	}

	// ➕ Handle post creation completion
	function handlePostCreated() {
		// Post was already created by FeedUpload, real-time subscription will update the feed automatically
	}

	// ❤️ Likes
	async function toggleLike(postId: string, isLiked: boolean) {
		if (!user?.uid) return;
		try {
			const postRef = doc(db, 'posts', postId);
			if (isLiked) {
				await updateDoc(postRef, { likes: arrayRemove(user.uid) });
			} else {
				await updateDoc(postRef, { likes: arrayUnion(user.uid) });
			}
		} catch (err) {
			console.error('Like toggle failed:', err);
		}
	}

	// 👤 Get user display name from UID
	async function getUserDisplayName(uid: string): Promise<string> {
		if (userCache.has(uid)) {
			return userCache.get(uid)!;
		}

		try {
			const userDoc = await getDoc(doc(db, 'users', uid));
			if (userDoc.exists()) {
				const userData = userDoc.data();
				const displayName = getDisplayName(userData.email, { nickname: userData.nickname });
				userCache.set(uid, displayName);
				return displayName;
			}
		} catch (err) {
			console.error('Error fetching user:', err);
		}

		const fallbackName = 'Unknown';
		userCache.set(uid, fallbackName);
		return fallbackName;
	}

	// 🗳️ Get voter names for a poll option
	async function getVoterNames(votes: string[]): Promise<string> {
		if (!votes || votes.length === 0) return '';

		const names = await Promise.all(votes.map((uid) => getUserDisplayName(uid)));
		return names.join(', ');
	}

	// 🗳️ Vote in poll
	async function voteInPoll(post: any, optionIndex: number) {
		if (!user?.uid) return;
		const userId = user.uid;

		try {
			// Create updated options array with the user's vote
			const updatedOptions = post.poll.options.map((option: any, index: number) => ({
				...option,
				votes:
					index === optionIndex
						? [...(option.votes || []).filter((id: string) => id !== userId), userId]
						: (option.votes || []).filter((id: string) => id !== userId)
			}));

			// Update Firestore with the new options array
			const postRef = doc(db, 'posts', post.id);
			await updateDoc(postRef, { 'poll.options': updatedOptions });
		} catch (err) {
			console.error('Poll vote failed:', err);
		}
	}

	// 🗳️ Get user's current vote in a poll
	function getUserVote(poll: any): number | null {
		if (!user?.uid || !poll?.options) return null;

		for (let i = 0; i < poll.options.length; i++) {
			if (poll.options[i].votes?.includes(user.uid)) {
				return i;
			}
		}
		return null;
	}

	// 🗑️ Delete post
	async function deletePost(postId: string) {
		if (!user) return;
		if (!confirm('Are you sure you want to delete this post?')) return;

		try {
			const postRef = doc(db, 'posts', postId);
			await deleteDoc(postRef);
		} catch (err) {
			console.error('Delete post failed:', err);
		}
	}

	// 💬 Toggle comments section visibility
	function toggleComments(postId: string) {
		if (openComments.has(postId)) {
			openComments.delete(postId);
		} else {
			openComments.add(postId);
		}
		openComments = new Set(openComments); // Trigger reactivity
	}

	// 💬 Add comment to post
	async function addComment(postId: string) {
		if (!user?.uid) return;

		const commentText = commentInputs.get(postId)?.trim();
		if (!commentText) return;

		// Sanitize comment text before saving
		const sanitizedText = sanitizeText(commentText);
		if (!sanitizedText) {
			console.warn('Comment was empty after sanitization');
			return;
		}

		try {
			const newComment = {
				author: getDisplayName(user?.email, { nickname: undefined }),
				text: sanitizedText, // Use sanitized text
				createdAt: new Date()
			};

			const postRef = doc(db, 'posts', postId);
			await updateDoc(postRef, {
				comments: arrayUnion(newComment)
			});

			// Clear the input
			commentInputs.set(postId, '');
			commentInputs = new Map(commentInputs); // Trigger reactivity
		} catch (err) {
			console.error('Add comment failed:', err);
		}
	}

	// getYouTubeVideoId function removed - unused
	// TODO: Add YouTube URL parsing if needed

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function isUserLiked(post: any) {
		return post.likes?.includes(user?.uid) || false;
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="{currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-2xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-900'}">Family Feed</h1>
		<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}">Share moments and stay connected</p>
	</div>

	<!-- Offline Indicator -->
	{#if !$isOnline}
		<div class="{currentTheme === 'neo' ? 'neo-glass border border-orange-400/30' : 'border border-orange-200 bg-orange-50'} rounded-lg p-4">
			<div class="flex items-center">
				<WifiOff class="h-5 w-5 {currentTheme === 'neo' ? 'text-orange-400' : 'text-orange-600'}" />
				<div class="ml-3">
					<h3 class="text-sm font-medium {currentTheme === 'neo' ? 'text-orange-300' : 'text-orange-800'}">You're offline</h3>
					<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-orange-400' : 'text-orange-700'}">
						Showing cached content. New posts will sync when you're back online.
					</p>
				</div>
			</div>
		</div>
	{/if}

	{#if user}
		<FeedUpload {user} on:post-created={handlePostCreated} />

		{#if loading}
			<LoadingSpinner size="large" message="Loading family feed..." />
		{:else if posts.length === 0}
			<div class="{currentTheme === 'neo' ? 'neo-glass border border-white/10' : 'bg-white shadow'} rounded py-8 text-center">
				<p class="{currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-600'}">No posts yet — be the first!</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each posts as post (post.id)}
					<article class="rounded-lg overflow-hidden {currentTheme === 'neo' 
						? 'neo-glass neo-row-hover border border-white/10' 
						: 'bg-white shadow'}">
						<div class="p-6 pb-4">
							<div class="mb-4 flex items-center space-x-3">
								{#if post.author?.avatarUrl}
									<img src={post.author.avatarUrl} alt="" class="h-10 w-10 rounded-full {currentTheme === 'neo' ? 'border border-white/20' : ''}" />
								{:else}
									<div class="h-10 w-10 rounded-full {currentTheme === 'neo' ? 'neo-glass border border-white/20' : 'bg-gray-300'}"></div>
								{/if}
								<div>
									<p class="text-sm font-medium {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-900'}">{post.author?.displayName}</p>
									<p class="text-xs {currentTheme === 'neo' ? 'text-slate-400' : 'text-gray-500'}">
										{#if post.createdAt}
											{dayjs(
												post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt
											).fromNow()}
										{/if}
									</p>
								</div>
							</div>

							{#if post.text}
								<p class="mb-4 {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-900'}">{post.text}</p>
							{/if}

							{#if post.imagePath}
								{#if post.imagePaths && post.imagePaths.length > 1}
									<div
										class="mb-4 grid grid-cols-2 gap-2 {post.imagePaths.length === 3
											? 'grid-cols-3'
											: ''} {post.imagePaths.length > 4 ? 'grid-cols-3' : ''}"
									>
										{#each post.imagePaths.slice(0, 6) as imagePath, index (imagePath)}
											<div class="relative">
												<img
													src={imagePath}
													alt=""
													class="max-h-[600px] w-full rounded-xl object-contain transition-all duration-300 hover:scale-105 {currentTheme === 'neo' 
														? 'bg-slate-800 border border-white/20 hover:border-cyan-400/50 hover:shadow-cyan-400/20 hover:shadow-lg' 
														: 'bg-gray-100'} {index === 5 && post.imagePaths.length > 6 ? 'opacity-75' : ''}"
												/>
												{#if index === 5 && post.imagePaths.length > 6}
													<div
														class="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-lg bg-black"
													>
														<span class="text-lg font-bold text-white"
															>+{post.imagePaths.length - 6}</span
														>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{:else}
									<img
										src={post.imagePath}
										alt=""
										class="mb-4 max-h-[600px] w-full rounded-xl object-contain transition-all duration-300 hover:scale-105 {currentTheme === 'neo' 
											? 'bg-slate-800 border border-white/20 hover:border-cyan-400/50 hover:shadow-cyan-400/20 hover:shadow-lg' 
											: 'bg-gray-100'}"
									/>
								{/if}
							{/if}

							{#if post.videoPath}
								{#if VideoPlayerComponent}
									{@const DynamicVideoPlayer = VideoPlayerComponent}
									<DynamicVideoPlayer src={post.videoPath} className="mb-4" />
								{:else}
									<video controls class="mb-4 max-h-96 w-full rounded-lg bg-black">
										<source src={post.videoPath} type="video/mp4" />
										<track kind="captions" srclang="en" label="English" />
										Your browser does not support the video tag.
									</video>
								{/if}
							{/if}

							{#if post.youtubeId}
								<div class="relative mb-4 aspect-video">
									<iframe
										src="https://www.youtube.com/embed/{post.youtubeId}"
										class="absolute inset-0 h-full w-full rounded-lg"
										title="YouTube video"
										allowfullscreen
									></iframe>
								</div>
							{/if}

							<!-- Poll -->
							{#if post.poll?.options}
								<div class="mb-4 rounded-lg border border-gray-200 p-4">
									<h3 class="mb-4 text-lg font-medium text-gray-900">{post.poll.title}</h3>
									{#each post.poll.options as opt, index (index)}
										{@const isUserVoted = opt.votes?.includes(user?.uid)}
										{@const voterNamesPromise = getVoterNames(opt.votes || [])}
										<button
											onclick={() => voteInPoll(post, index)}
											disabled={!user}
											class="mb-3 w-full rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 {isUserVoted
												? 'border-blue-200 bg-blue-50'
												: 'border-gray-200'}"
										>
											<div class="flex items-center justify-between">
												<span class="font-medium text-gray-900">{opt.text}</span>
												<div class="text-sm text-gray-600">
													{#await voterNamesPromise}
														<span class="text-gray-400">Loading...</span>
													{:then voterNames}
														{#if voterNames}
															<span>{voterNames}</span>
														{:else}
															<span class="text-gray-400">No votes yet</span>
														{/if}
													{:catch}
														<span class="text-gray-400">Error loading</span>
													{/await}
												</div>
											</div>
										</button>
									{/each}

									{#if user && getUserVote(post.poll) !== null}
										{@const userVoteIndex = getUserVote(post.poll)}
										{#if userVoteIndex !== null}
											<div class="mt-3 border-t border-gray-200 pt-3">
												<p class="text-sm font-medium text-blue-600">
													You voted: {post.poll.options[userVoteIndex].text}
												</p>
											</div>
										{/if}
									{/if}
								</div>
							{/if}
						</div>

						<div class="border-t border-gray-200 px-6 py-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-6">
									<button
										onclick={() => toggleLike(post.id, isUserLiked(post))}
										class="flex items-center space-x-2 text-sm transition-all duration-200 hover:scale-105 {currentTheme === 'neo' 
											? 'text-slate-400 hover:text-magenta-400' 
											: 'text-gray-500 hover:text-red-600'}"
									>
										<Heart class="h-5 w-5 {isUserLiked(post) ? (currentTheme === 'neo' ? 'fill-magenta-500 text-magenta-500' : 'fill-red-500 text-red-500') : ''}" />
										<span
											>{post.likes?.length || 0}
											{(post.likes?.length || 0) === 1 ? 'like' : 'likes'}</span
										>
									</button>
									<button
										onclick={() => toggleComments(post.id)}
										class="flex items-center space-x-2 text-sm transition-all duration-200 hover:scale-105 {currentTheme === 'neo' 
											? 'text-slate-400 hover:text-cyan-400' 
											: 'text-gray-500 hover:text-blue-600'}"
									>
										<MessageCircle class="h-5 w-5" />
										<span
											>{post.comments?.length || 0}
											{(post.comments?.length || 0) === 1 ? 'comment' : 'comments'}</span
										>
									</button>
								</div>
								{#if user}
									<button
										onclick={() => deletePost(post.id)}
										class="flex items-center space-x-1 text-sm transition-all duration-200 hover:scale-105 {currentTheme === 'neo' 
											? 'text-slate-500 hover:text-red-400' 
											: 'text-gray-400 hover:text-red-600'}"
										title="Delete post"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								{/if}
							</div>

							<!-- Comments Section -->
							{#if openComments.has(post.id)}
								<div class="border-t border-gray-200 px-6 py-4">
									<!-- Existing Comments -->
									{#if post.comments && post.comments.length > 0}
										<div class="mb-4 space-y-3">
											{#each post.comments as comment (comment)}
												<div class="text-sm">
													<span class="font-medium text-gray-900">{comment.author}</span>
													<span class="ml-2 text-gray-600">{comment.text}</span>
													<div class="mt-1 text-xs text-gray-400">
														{dayjs(
															comment.createdAt?.toDate
																? comment.createdAt.toDate()
																: comment.createdAt
														).fromNow()}
													</div>
												</div>
											{/each}
										</div>
									{/if}

									<!-- Add Comment Input -->
									{#if user}
										<div class="flex space-x-3">
											<input
												type="text"
												placeholder="Write a comment..."
												value={commentInputs.get(post.id) || ''}
												oninput={(e) => {
													const target = e.target as HTMLInputElement;
													commentInputs.set(post.id, target.value);
													commentInputs = new Map(commentInputs);
												}}
												onkeydown={(e) => {
													if (e.key === 'Enter' && !e.shiftKey) {
														e.preventDefault();
														addComment(post.id);
													}
												}}
												class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
											/>
											<button
												onclick={() => addComment(post.id)}
												disabled={!commentInputs.get(post.id)?.trim()}
												class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Post
											</button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="py-12 text-center">
			<p class="text-gray-600">Please sign in to view the family feed.</p>
		</div>
	{/if}
</div>
