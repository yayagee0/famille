<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		where,
		orderBy,
		addDoc,
		getDocs,
		doc,
		updateDoc,
		arrayUnion,
		arrayRemove
	} from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { auth, db, storage, getFamilyId } from '$lib/firebase';
	import FeedUpload from '$lib/FeedUpload.svelte';
	import { Heart, MessageCircle, Share2, BarChart3, Play, ExternalLink } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	let posts = $state<any[]>([]);
	let loading = $state(true);

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				loadPosts();
			}
		});

		return unsubscribe;
	});

	async function loadPosts() {
		try {
			loading = true;
			const familyId = getFamilyId();

			const postsQuery = query(
				collection(db, 'posts'),
				where('familyId', '==', familyId),
				orderBy('timestamp', 'desc')
			);

			const snapshot = await getDocs(postsQuery);
			posts = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('Error loading posts:', error);
		} finally {
			loading = false;
		}
	}

	async function handlePostCreated(event: CustomEvent) {
		const postData = event.detail;

		try {
			// Upload files if any
			const fileUrls: string[] = [];
			if (postData.files && postData.files.length > 0) {
				for (const file of postData.files) {
					const fileRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
					const snapshot = await uploadBytes(fileRef, file);
					const downloadURL = await getDownloadURL(snapshot.ref);
					fileUrls.push(downloadURL);
				}
			}

			// Create post document
			const postDoc = {
				...postData,
				files: fileUrls,
				likes: [],
				comments: [],
				createdAt: new Date(),
				timestamp: new Date()
			};

			// Remove the file objects before saving to Firestore
			delete postDoc.files;
			if (fileUrls.length > 0) {
				if (postData.type === 'photo') {
					postDoc.imageUrls = fileUrls;
				} else if (postData.type === 'video') {
					postDoc.videoUrls = fileUrls;
				}
			}

			await addDoc(collection(db, 'posts'), postDoc);

			// Reload posts
			await loadPosts();
		} catch (error) {
			console.error('Error creating post:', error);
		}
	}

	async function toggleLike(postId: string, isLiked: boolean) {
		if (!user) return;

		try {
			const postRef = doc(db, 'posts', postId);

			if (isLiked) {
				await updateDoc(postRef, {
					likes: arrayRemove(user.uid)
				});
			} else {
				await updateDoc(postRef, {
					likes: arrayUnion(user.uid)
				});
			}

			// Update local state
			posts = posts.map((post) => {
				if (post.id === postId) {
					const likes = post.likes || [];
					if (isLiked) {
						return { ...post, likes: likes.filter((uid: string) => uid !== user?.uid) };
					} else {
						return { ...post, likes: [...likes, user?.uid] };
					}
				}
				return post;
			});
		} catch (error) {
			console.error('Error toggling like:', error);
		}
	}

	function getYouTubeVideoId(url: string): string | null {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}

	function isUserLiked(post: any): boolean {
		return post.likes?.includes(user?.uid) || false;
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Family Feed</h1>
		<p class="mt-1 text-sm text-gray-500">Share moments and stay connected with your family</p>
	</div>

	{#if user}
		<!-- Post Upload -->
		<FeedUpload {user} on:post-created={handlePostCreated} />

		<!-- Feed -->
		{#if loading}
			<div class="space-y-6">
				{#each Array(3) as _}
					<div class="animate-pulse rounded-lg bg-white shadow">
						<div class="p-6">
							<div class="mb-4 flex items-center space-x-3">
								<div class="h-10 w-10 rounded-full bg-gray-200"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-1/4 rounded bg-gray-200"></div>
									<div class="h-3 w-1/6 rounded bg-gray-200"></div>
								</div>
							</div>
							<div class="space-y-2">
								<div class="h-4 rounded bg-gray-200"></div>
								<div class="h-4 w-3/4 rounded bg-gray-200"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if posts.length === 0}
			<div class="rounded-lg bg-white py-12 text-center shadow">
				<MessageCircle class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
				<p class="mt-1 text-sm text-gray-500">Be the first to share something with your family!</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each posts as post}
					<article class="rounded-lg bg-white shadow">
						<!-- Post Header -->
						<div class="p-6 pb-4">
							<div class="mb-4 flex items-center space-x-3">
								{#if post.author?.photoURL}
									<img
										class="h-10 w-10 rounded-full"
										src={post.author.photoURL}
										alt={post.author.displayName || 'User'}
									/>
								{:else}
									<div class="h-10 w-10 rounded-full bg-gray-300"></div>
								{/if}
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">
										{post.author?.displayName || 'Unknown User'}
									</p>
									<p class="text-xs text-gray-500">
										{dayjs(post.timestamp?.toDate()).fromNow()}
									</p>
								</div>
							</div>

							<!-- Post Content -->
							{#if post.content}
								<p class="mb-4 text-gray-900">{post.content}</p>
							{/if}

							<!-- Images -->
							{#if post.imageUrls && post.imageUrls.length > 0}
								<div class="mb-4 {post.imageUrls.length === 1 ? '' : 'grid grid-cols-2 gap-2'}">
									{#each post.imageUrls as imageUrl, index}
										<img
											src={imageUrl}
											alt="Photo {index + 1} from {post.author?.displayName || 'family member'}"
											class="w-full rounded-lg {post.imageUrls.length === 1
												? 'max-h-96'
												: 'h-48'} object-cover"
										/>
									{/each}
								</div>
							{/if}

							<!-- Videos -->
							{#if post.videoUrls && post.videoUrls.length > 0}
								<div class="mb-4">
									{#each post.videoUrls as videoUrl}
										<video controls class="max-h-96 w-full rounded-lg bg-black" preload="metadata">
											<source src={videoUrl} type="video/mp4" />
											<track kind="captions" />
											Your browser does not support the video tag.
										</video>
									{/each}
								</div>
							{/if}

							<!-- YouTube -->
							{#if post.youtubeUrl}
								{@const videoId = getYouTubeVideoId(post.youtubeUrl)}
								<div class="mb-4">
									{#if videoId}
										<div class="relative aspect-video">
											<iframe
												src="https://www.youtube.com/embed/{videoId}"
												title="YouTube video"
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowfullscreen
												class="absolute inset-0 h-full w-full rounded-lg"
											></iframe>
										</div>
									{:else}
										<a
											href={post.youtubeUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center space-x-2 rounded-lg border border-gray-300 p-3 hover:bg-gray-50"
										>
											<Play class="h-5 w-5 text-red-600" />
											<span class="text-sm text-gray-900">YouTube Video</span>
											<ExternalLink class="h-4 w-4 text-gray-400" />
										</a>
									{/if}
								</div>
							{/if}

							<!-- Poll -->
							{#if post.poll}
								<div class="mb-4 rounded-lg border border-gray-200 p-4">
									<h4 class="mb-3 font-medium text-gray-900">{post.poll.question}</h4>
									<div class="space-y-2">
										{#each post.poll.options as option, index}
											<button
												class="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
											>
												<div class="flex items-center justify-between">
													<span class="text-sm text-gray-900">{option.text}</span>
													<span class="text-xs text-gray-500">{option.votes} votes</span>
												</div>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<!-- Post Actions -->
						<div class="border-t border-gray-200 px-6 py-3">
							<div class="flex items-center space-x-6">
								<button
									onclick={() => toggleLike(post.id, isUserLiked(post))}
									class="flex items-center space-x-2 text-sm text-gray-500 transition-colors hover:text-red-600"
								>
									<Heart class="h-5 w-5 {isUserLiked(post) ? 'fill-red-500 text-red-500' : ''}" />
									<span
										>{post.likes?.length || 0}
										{(post.likes?.length || 0) === 1 ? 'like' : 'likes'}</span
									>
								</button>

								<button
									class="flex items-center space-x-2 text-sm text-gray-500 transition-colors hover:text-blue-600"
								>
									<MessageCircle class="h-5 w-5" />
									<span
										>{post.comments?.length || 0}
										{(post.comments?.length || 0) === 1 ? 'comment' : 'comments'}</span
									>
								</button>

								<button
									class="flex items-center space-x-2 text-sm text-gray-500 transition-colors hover:text-green-600"
								>
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
			<MessageCircle class="mx-auto h-12 w-12 text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Not signed in</h3>
			<p class="mt-1 text-sm text-gray-500">Please sign in to view the family feed.</p>
		</div>
	{/if}
</div>
