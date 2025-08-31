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

	type Post = {
		id: string;
		authorUid: string;
		author?: { displayName: string; avatarUrl: string | null };
		createdAt: any;
		kind: string;
		text?: string;
		imagePath?: string;
		imagePaths?: string[];
		videoPath?: string;
		youtubeId?: string;
		likes: string[];
		comments: any[];
		familyId: string;
		poll?: { question: string; options: Array<{ text: string; votes: string[] }> };
	};

	let user = $state(auth.currentUser);
	let posts = $state<Post[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;

	// cache for resolving voter names
	let userProfiles: Record<string, string> = {};

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

	// 🔄 Real-time posts
	function subscribeToPosts() {
		const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
		loading = true;

		unsubscribePosts = onSnapshot(
			postsQuery,
			async (snapshot) => {
				const rawPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Post>;

				// enrich posts with author info + resolve voter names
				const enriched = await Promise.all(
					rawPosts.map(async (post: Post) => {
						let enrichedAuthor = { displayName: 'Unknown User', avatarUrl: null };

						if (post.authorUid) {
							const uDoc = await getDoc(doc(db, 'users', post.authorUid));
							if (uDoc.exists()) {
								const u = uDoc.data();
								enrichedAuthor = {
									displayName: (u.displayName as string) || 'Unknown User',
									avatarUrl: (u.avatarUrl as string) || null
								};
							}
						}

						// resolve voter names for polls
						if (post.poll?.options) {
							for (const opt of post.poll.options) {
								if (opt.votes) {
									const names: string[] = [];
									for (const email of opt.votes) {
										if (!userProfiles[email]) {
											// fetch once
											const uSnap = await getDoc(doc(db, 'users', email));
											if (uSnap.exists()) {
												const d = uSnap.data();
												userProfiles[email] = (d.displayName as string) || email;
											} else {
												userProfiles[email] = email;
											}
										}
										names.push(userProfiles[email]);
									}
									// @ts-ignore add a helper for UI
									opt._voterNames = names;
								}
							}
						}

						return { ...post, author: enrichedAuthor };
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

			if (postData.type === 'photo' && postData.files?.length > 0) {
				for (const file of postData.files) {
					const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
					const snap = await uploadBytes(fRef, file);
					const downloadURL = await getDownloadURL(snap.ref);
					imagePaths.push(downloadURL);
				}
			}

			if (postData.type === 'video' && postData.files?.length > 0) {
				const file = postData.files[0];
				const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
				const snap = await uploadBytes(fRef, file);
				const downloadURL = await getDownloadURL(snap.ref);
				videoPaths.push(downloadURL);
			}

			const youtubeId = postData.youtubeUrl ? getYouTubeVideoId(postData.youtubeUrl) : null;

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
			if (imagePaths.length > 0) {
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
				await updateDoc(postRef, { likes: arrayRemove(user.email) });
			} else {
				await updateDoc(postRef, { likes: arrayUnion(user.email) });
			}
		} catch (err) {
			console.error('Like toggle failed:', err);
		}
	}

	// 🗳️ Vote in poll
	async function voteInPoll(post: Post, optionIndex: number) {
		if (!user) return;
		try {
			const postRef = doc(db, 'posts', post.id);
			// remove from all options
			const updates: any = {};
			post.poll?.options.forEach((_: any, i: number) => {
				updates[`poll.options.${i}.votes`] = arrayRemove(user.email);
			});
			await updateDoc(postRef, updates);
			// add to selected option
			await updateDoc(postRef, {
				[`poll.options.${optionIndex}.votes`]: arrayUnion(user.email)
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
			await deleteDoc(doc(db, 'posts', postId));
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

	function isUserLiked(post: Post) {
		return post.likes?.includes(user?.email) || false;
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
			<p class="text-gray-500">Loading...</p>
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

							{#if post.text}
								<p class="mb-4 text-gray-900">{post.text}</p>
							{/if}

							{#if post.imagePath}
								<img src={post.imagePath} alt="" class="mb-4 max-h-96 w-full rounded-lg object-cover" />
							{/if}

							{#if post.videoPath}
								<video controls class="mb-4 max-h-96 w-full rounded-lg bg-black">
									<source src={post.videoPath} type="video/mp4" />
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
										<div
											class="mb-2 flex justify-between items-center rounded border p-2 {opt.votes?.includes(user?.email) ? 'bg-indigo-50' : ''}"
										>
											<span>{opt.text}</span>
											<div class="flex flex-col items-end text-xs text-gray-500">
												{#if opt.votes?.length > 0}
													<span>{opt.votes.length} voted</span>
													<span class="text-gray-400">
														{opt._voterNames?.join(', ')}
													</span>
												{:else}
													<span class="text-gray-400">No votes yet</span>
												{/if}
												{#if user}
													<button
														onclick={() => voteInPoll(post, index)}
														disabled={opt.votes?.includes(user?.email)}
														class="mt-1 rounded bg-indigo-500 px-2 py-0.5 text-white hover:bg-indigo-600 disabled:opacity-50"
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
									<button class="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600">
										<MessageCircle class="h-5 w-5" />
										<span
											>{post.comments?.length || 0}
											{(post.comments?.length || 0) === 1 ? 'comment' : 'comments'}</span
										>
									</button>
									<button class="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600">
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
