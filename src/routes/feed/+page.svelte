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
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { auth, db, storage } from '$lib/firebase';
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
				// Ensure user profile exists
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
				const rawPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

				const enriched = await Promise.all(
					rawPosts.map(async (post) => {
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
			let imagePaths: string[] = [];
			let videoPaths: string[] = [];

			// Handle multiple photo uploads
			if (postData.type === 'photo' && postData.files?.length > 0) {
				for (const file of postData.files) {
					const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
					const snap = await uploadBytes(fRef, file);
					const downloadURL = await getDownloadURL(snap.ref);
					imagePaths.push(downloadURL);
				}
			}

			// Handle video upload (typically single file)
			if (postData.type === 'video' && postData.files?.length > 0) {
				const file = postData.files[0]; // Take first video file
				const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
				const snap = await uploadBytes(fRef, file);
				const downloadURL = await getDownloadURL(snap.ref);
				videoPaths.push(downloadURL);
			}

			const youtubeId = postData.youtubeUrl ? getYouTubeVideoId(postData.youtubeUrl) : null;

			// Build doc without undefined values
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

			// Only add fields if they have values
			if (youtubeId) postDoc.youtubeId = youtubeId;
			if (imagePaths.length > 0) {
				// For backward compatibility, store first image as imagePath
				// and all images as imagePaths array
				postDoc.imagePath = imagePaths[0];
				if (imagePaths.length > 1) {
					postDoc.imagePaths = imagePaths;
				}
			}
			if (videoPaths.length > 0) {
				postDoc.videoPath = videoPaths[0];
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

	// 🗑️ Delete post
	async function deletePost(postId: string) {
		if (!user) return;

		if (!confirm('Are you sure you want to delete this post?')) {
			return;
		}

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
							<!-- Header skeleton -->
							<div class="mb-4 flex items-center space-x-3">
								<div class="h-10 w-10 rounded-full bg-gray-300"></div>
								<div class="flex-1">
									<div class="mb-1 h-4 w-24 rounded bg-gray-300"></div>
									<div class="h-3 w-16 rounded bg-gray-200"></div>
								</div>
							</div>
							<!-- Content skeleton -->
							<div class="mb-4 space-y-2">
								<div class="h-4 w-full rounded bg-gray-300"></div>
								<div class="h-4 w-3/4 rounded bg-gray-300"></div>
							</div>
							<!-- Actions skeleton -->
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
							<!-- Header -->
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

							<!-- Text -->
							{#if post.text}
								<p class="mb-4 text-gray-900">{post.text}</p>
							{/if}

							<!-- Images -->
							{#if post.imagePath}
								{#if post.imagePaths && post.imagePaths.length > 1}
									<!-- Multiple images grid -->
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
									<!-- Single image -->
									<img
										src={post.imagePath}
										alt="User posted content"
										class="mb-4 max-h-96 w-full rounded-lg object-cover"
									/>
								{/if}
							{/if}

							<!-- Video -->
							{#if post.videoPath}
								<video controls class="mb-4 max-h-96 w-full rounded-lg bg-black">
									<source src={post.videoPath} type="video/mp4" />
									<track kind="captions" src="" label="No captions available" />
								</video>
							{/if}

							<!-- YouTube -->
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
										<div class="mb-2 flex justify-between rounded border p-2">
											<span>{opt.text}</span>
											<span class="text-xs text-gray-500">{opt.votes?.length || 0} votes</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Actions -->
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
								<!-- Delete button (visible for all allowed users) -->
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
