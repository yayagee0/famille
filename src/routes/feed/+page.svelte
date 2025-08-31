<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		where,
		orderBy,
		addDoc,
		getDoc,
		doc,
		updateDoc,
		arrayUnion,
		arrayRemove,
		onSnapshot
	} from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { auth, db, storage, getFamilyId } from '$lib/firebase';
	import FeedUpload from '$lib/FeedUpload.svelte';
	import { Heart, MessageCircle, Share2 } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	let posts = $state<any[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;

	onMount(() => {
		const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
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
		const familyId = getFamilyId();
		const postsQuery = query(
			collection(db, 'posts'),
			where('familyId', '==', familyId),
			orderBy('createdAt', 'desc')
		);

		loading = true;
		unsubscribePosts = onSnapshot(postsQuery, async (snapshot) => {
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
		}, (err) => {
			console.error('Feed subscription error:', err);
			loading = false;
		});
	}

	// ➕ Create post
	async function handlePostCreated(event: CustomEvent) {
		const postData = event.detail;
		const familyId = getFamilyId();

		try {
			const { files: _, youtubeUrl, ...rest } = postData;
			let imagePath, videoPath;

			if (postData.type === 'photo' && postData.files?.[0]) {
				const f = postData.files[0];
				const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${f.name}`);
				const snap = await uploadBytes(fRef, f);
				imagePath = await getDownloadURL(snap.ref);
			}
			if (postData.type === 'video' && postData.files?.[0]) {
				const f = postData.files[0];
				const fRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${f.name}`);
				const snap = await uploadBytes(fRef, f);
				videoPath = await getDownloadURL(snap.ref);
			}

			const youtubeId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;

			const postDoc = {
				...rest,
				familyId,
				authorUid: user?.uid,
				createdAt: new Date(),
				kind: postData.type,
				text: postData.text || '',
				youtubeId,
				imagePath,
				videoPath,
				likes: [],
				comments: []
			};

			await addDoc(collection(db, 'posts'), postDoc);
			// no manual reload needed → onSnapshot updates
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

	function getYouTubeVideoId(url: string): string | null {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
		const m = url.match(regex);
		return m ? m[1] : null;
	}
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
			<p class="text-gray-500">Loading feed...</p>
		{:else if posts.length === 0}
			<div class="rounded bg-white py-8 text-center shadow">
				<p class="text-gray-600">No posts yet — be the first!</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each posts as post}
					<article class="rounded-lg bg-white shadow">
						<div class="p-6 pb-4">
							<!-- Header -->
							<div class="mb-4 flex items-center space-x-3">
								{#if post.author?.avatarUrl}
									<img src={post.author.avatarUrl} alt="" class="h-10 w-10 rounded-full" />
								{:else}
									<div class="h-10 w-10 bg-gray-300 rounded-full"></div>
								{/if}
								<div>
									<p class="text-sm font-medium text-gray-900">{post.author?.displayName}</p>
									<p class="text-xs text-gray-500">
										{#if post.createdAt}
											{dayjs(post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt).fromNow()}
										{/if}
									</p>
								</div>
							</div>

							<!-- Text -->
							{#if post.text}
								<p class="mb-4 text-gray-900">{post.text}</p>
							{/if}

							<!-- Image -->
							{#if post.imagePath}
								<img src={post.imagePath} alt="Photo" class="w-full rounded-lg max-h-96 object-cover mb-4" />
							{/if}

							<!-- Video -->
							{#if post.videoPath}
								<video controls class="max-h-96 w-full rounded-lg bg-black mb-4">
									<source src={post.videoPath} type="video/mp4" />
								</video>
							{/if}

							<!-- YouTube -->
							{#if post.youtubeId}
								<div class="relative aspect-video mb-4">
									<iframe
										src="https://www.youtube.com/embed/{post.youtubeId}"
										class="absolute inset-0 h-full w-full rounded-lg"
										allowfullscreen
									></iframe>
								</div>
							{/if}

							<!-- Poll -->
							{#if post.poll?.options}
								<div class="mb-4 rounded-lg border border-gray-200 p-4">
									<h4 class="mb-3 font-medium text-gray-900">{post.poll.question}</h4>
									{#each post.poll.options as opt}
										<div class="flex justify-between p-2 border rounded mb-2">
											<span>{opt.text}</span>
											<span class="text-xs text-gray-500">{opt.votes?.length || 0} votes</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="border-t border-gray-200 px-6 py-3">
							<div class="flex items-center space-x-6">
								<button
									onclick={() => toggleLike(post.id, isUserLiked(post))}
									class="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600"
								>
									<Heart class="h-5 w-5 {isUserLiked(post) ? 'fill-red-500 text-red-500' : ''}" />
									<span>{post.likes?.length || 0} {(post.likes?.length || 0) === 1 ? 'like' : 'likes'}</span>
								</button>
								<button class="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600">
									<MessageCircle class="h-5 w-5" />
									<span>{post.comments?.length || 0} {(post.comments?.length || 0) === 1 ? 'comment' : 'comments'}</span>
								</button>
								<button class="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600">
									<Share2 class="h-5 w-5" />
									<span>Share</span>
								</button>
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
