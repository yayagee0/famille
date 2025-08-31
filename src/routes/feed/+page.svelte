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
	import { ensureUserProfile } from '$lib/auth';
	import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let posts = $state<any[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;

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
			
			if (postData.poll && postData.poll.question) postDoc.poll = postData.poll;

			await addDoc(collection(db, 'posts'), postDoc);
		} catch (err) {
			console.error('Error creating post:', err);
		}
	}

	// ❤️ Likes
	async function toggleLike(postId: string, isLiked: boolean) {
		if (!user) return;
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

	// 🗳️ Vote in poll
	async function voteInPoll(post: any, optionIndex: number) {
		if (!user?.uid) return;
		const userId = user.uid; // Store uid to avoid null check issues
		try {
			// prevent double voting: remove user from all options first
			const postRef = doc(db, 'posts', post.id);
			const updates: any = {};
			post.poll.options.forEach((_: any, i: number) => {
				updates[`poll.options.${i}.votes`] = arrayRemove(userId);
			});
			await updateDoc(postRef, updates);

			// then add user to the chosen option
			await updateDoc(postRef, {
				[`poll.options.${optionIndex}.votes`]: arrayUnion(userId)
			});
		} catch (err) {
			console.error('Poll vote failed:', err);
		}
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
			<!-- Loading skeletons -->
			<div class="space-y-6">
				{#each Array(3) as skeleton, index (index)}
					<div class="animate-pulse rounded-lg bg-white shadow">
						<div class="p-6">
							<div class="mb-4 flex items-center space-x-3">
								<div class="h-10 w-10 rounded-full bg-gray-300"></div>
								<div class="flex-1">
									<div class="mb-1 h-4 w-24 rounded bg-gray-300"></div>
									<div class="h-3 w-16 rounded bg-gray-200"></div>
								</div>
							</div>
							<div class="mb-4 space-y-2">
								<div class="h-4 w-full rounded bg-gray-300"></div>
								<div class="h-4 w-3/4 rounded bg-gray-300"></div>
							</div>
							<div class="border-t border-gray-200 pt-3">
								<div class="flex space-x-6">
									<div class="h-4 w-16 rounded bg-gray-200"></div>
									<div class="h-4 w-20 rounded bg-gray-200"></div>
									<div class="h-4 w-12 rounded bg-gray-200"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
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
													alt="User posted content"
													class="h-32 w-full rounded-lg object-cover {index === 5 &&
													post.imagePaths.length > 6
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
										alt="User posted content"
										class="mb-4 max-h-96 w-full rounded-lg object-cover"
									/>
								{/if}
							{/if}

							{#if post.videoPath}
								<video controls class="mb-4 max-h-96 w-full rounded-lg bg-black">
									<source src={post.videoPath} type="video/mp4" />
									<track kind="captions" src="" label="Captions" default />
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
									<h4 class="mb-3 font-medium text-gray-900">{post.poll.question}</h4>
									{#each post.poll.options as opt, index (index)}
										<div class="mb-2 flex items-center justify-between rounded border p-2">
											<span>{opt.text}</span>
											<div class="flex items-center space-x-2">
												<span class="text-xs text-gray-500">{opt.votes?.length || 0} votes</span>
												{#if user}
													<button
														onclick={() => voteInPoll(post, index)}
														class="rounded bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600"
													>
														Vote
													</button>
												{/if}
											</div>
										</div>
									{/each}
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
										class="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600"
									>
										<MessageCircle class="h-5 w-5" />
										<span
											>{post.comments?.length || 0}
											{(post.comments?.length || 0) === 1 ? 'comment' : 'comments'}</span
										>
									</button>
									<button
										class="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600"
									>
										<Share2 class="h-5 w-5" />
										<span>Share</span>
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
