<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		orderBy,
		addDoc,
		getDoc,
		doc,
		updateDoc,
		deleteDoc,
		arrayUnion,
		arrayRemove,
		onSnapshot,
		serverTimestamp
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';
	import FeedUpload from '$lib/FeedUpload.svelte';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import { ensureUserProfile } from '$lib/auth';
	import { Heart, MessageCircle, Trash2 } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let posts = $state<any[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;
	// Cache for user display names
	let userCache = $state<Map<string, string>>(new Map());
	// Track which posts have comments section open
	let openComments = $state<Set<string>>(new Set());
	// Track comment input values for each post
	let commentInputs = $state<Map<string, string>>(new Map());

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

	// 🔄 Real-time posts with author enrichment
	function subscribeToPosts() {
		const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

		loading = true;
		unsubscribePosts = onSnapshot(
			postsQuery,
			async (snapshot) => {
				const rawPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<any>;

				const enriched = await Promise.all(
					rawPosts.map(async (post: any) => {
						if (post.authorUid) {
							const uDoc = await getDoc(doc(db, 'users', post.authorUid));
							if (uDoc.exists()) {
								const u = uDoc.data();
								return {
									...post,
									author: {
										displayName: u.displayName || 'Unknown User',
										avatarUrl: u.avatarUrl || null
									}
								};
							}
						}
						return { ...post, author: { displayName: 'Unknown User', avatarUrl: null } };
					})
				);

				posts = enriched;
				loading = false;
			},
			(err) => {
				console.error('Feed subscription error:', err);
				loading = false;
			}
		);
	}

	// ➕ Create post
	async function handlePostCreated(event: CustomEvent) {
		const postData = event.detail;

		try {
			const youtubeId = postData.youtubeUrl ? getYouTubeVideoId(postData.youtubeUrl) : null;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const postDoc: any = {
				authorUid: user?.uid,
				createdAt: serverTimestamp(),
				kind: postData.type,
				text: postData.content || '',
				likes: [],
				comments: [],
				familyId: postData.familyId
			};

			if (youtubeId) postDoc.youtubeId = youtubeId;

			// Handle image paths from uploaded files
			if (postData.imagePaths && postData.imagePaths.length > 0) {
				postDoc.imagePath = postData.imagePaths[0];
				if (postData.imagePaths.length > 1) {
					postDoc.imagePaths = postData.imagePaths;
				}
			}

			// Handle video paths from uploaded files
			if (postData.videoPaths && postData.videoPaths.length > 0) {
				postDoc.videoPath = postData.videoPaths[0];
			}

			if (postData.poll && postData.poll.title) postDoc.poll = postData.poll;

			await addDoc(collection(db, 'posts'), postDoc);
		} catch (err) {
			console.error('Error creating post:', err);
		}
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
				const displayName = userData.displayName || userData.email?.split('@')[0] || 'Unknown';
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

		try {
			const newComment = {
				author: user.displayName || user.email?.split('@')[0] || 'Unknown User',
				text: commentText,
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

	function getYouTubeVideoId(url: string): string | null {
		const regex =
			/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
		const m = url.match(regex);
		return m ? m[1] : null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function isUserLiked(post: any) {
		return post.likes?.includes(user?.uid) || false;
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Family Feed</h1>
		<p class="mt-1 text-sm text-gray-500">Share moments and stay connected</p>
	</div>

	{#if user}
		<FeedUpload {user} on:post-created={handlePostCreated} />

		{#if loading}
			<LoadingSpinner size="large" message="Loading family feed..." />
		{:else if posts.length === 0}
			<div class="rounded bg-white py-8 text-center shadow">
				<p class="text-gray-600">No posts yet — be the first!</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each posts as post (post.id)}
					<article class="rounded-lg bg-white shadow">
						<div class="p-6 pb-4">
							<div class="mb-4 flex items-center space-x-3">
								{#if post.author?.avatarUrl}
									<img src={post.author.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
								{:else}
									<div class="h-10 w-10 rounded-full bg-gray-300"></div>
								{/if}
								<div>
									<p class="text-sm font-medium text-gray-900">{post.author?.displayName}</p>
									<p class="text-xs text-gray-500">
										{#if post.createdAt}
											{dayjs(
												post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt
											).fromNow()}
										{/if}
									</p>
								</div>
							</div>

							{#if post.text}
								<p class="mb-4 text-gray-900">{post.text}</p>
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
													class="max-h-[600px] w-full rounded-xl bg-gray-100 object-contain {index ===
														5 && post.imagePaths.length > 6
														? 'opacity-75'
														: ''}"
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
										class="mb-4 max-h-[600px] w-full rounded-xl bg-gray-100 object-contain"
									/>
								{/if}
							{/if}

							{#if post.videoPath}
								<video controls class="mb-4 max-h-96 w-full rounded-lg bg-black">
									<source src={post.videoPath} type="video/mp4" />
									Your browser does not support the video tag.
								</video>
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
										class="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600"
									>
										<Heart class="h-5 w-5 {isUserLiked(post) ? 'fill-red-500 text-red-500' : ''}" />
										<span
											>{post.likes?.length || 0}
											{(post.likes?.length || 0) === 1 ? 'like' : 'likes'}</span
										>
									</button>
									<button
										onclick={() => toggleComments(post.id)}
										class="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600"
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
										class="flex items-center space-x-1 text-sm text-gray-400 hover:text-red-600"
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
										<div class="space-y-3 mb-4">
											{#each post.comments as comment (comment)}
												<div class="text-sm">
													<span class="font-medium text-gray-900">{comment.author}</span>
													<span class="text-gray-600 ml-2">{comment.text}</span>
													<div class="text-xs text-gray-400 mt-1">
														{dayjs(comment.createdAt?.toDate ? comment.createdAt.toDate() : comment.createdAt).fromNow()}
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
