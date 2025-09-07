<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Image, Video, Youtube, BarChart3, Send, X, WifiOff } from 'lucide-svelte';
	import { validatePost } from '$lib/schemas';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { storage, db } from '$lib/firebase';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { FAMILY_ID } from '$lib/config';
	import { getDisplayName } from '$lib/getDisplayName';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import GlassChip from '$lib/themes/neo/components/GlassChip.svelte';
	import { themeStore } from '$lib/themes/neo';
	import { isOnline, queueOfflineAction } from '$lib/offline';

	const dispatch = createEventDispatcher();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { user } = $props<{ user: any }>();

	let textContent = $state('');
	let selectedFiles: FileList | null = $state(null);
	let youtubeUrl = $state('');
	let pollTitle = $state('');
	let pollOptions = $state(['', '']);
	let postType: 'text' | 'photo' | 'video' | 'youtube' | 'poll' = $state('text');
	let isUploading = $state(false);
	let previewUrls: string[] = $state([]);
	let uploadProgress = $state('');
	let currentTheme = $state('default');
	let showOfflineWarning = $state(false);

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	function setPostType(type: typeof postType) {
		// Check if trying to set media type while offline
		if (!$isOnline && (type === 'photo' || type === 'video')) {
			showOfflineWarning = true;
			setTimeout(() => {
				showOfflineWarning = false;
			}, 4000);
			return;
		}

		postType = type;
		// Reset form when changing type
		selectedFiles = null;
		youtubeUrl = '';
		pollTitle = '';
		pollOptions = ['', ''];
		previewUrls = [];
		uploadProgress = '';
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		selectedFiles = target.files;

		// Create preview URLs for any file type
		if (selectedFiles) {
			previewUrls = [];
			Array.from(selectedFiles).forEach((file) => {
				// Try to create preview for image and video files
				if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
					const url = URL.createObjectURL(file);
					previewUrls.push(url);
				}
			});
		}
	}

	function removePreview(index: number) {
		previewUrls = previewUrls.filter((_, i) => i !== index);
	}

	function addPollOption() {
		pollOptions = [...pollOptions, ''];
	}

	function removePollOption(index: number) {
		if (pollOptions.length > 2) {
			pollOptions = pollOptions.filter((_, i) => i !== index);
		}
	}

	function extractYouTubeId(url: string): string {
		const match = url.match(
			/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
		);
		return match ? match[1] : url;
	}

	async function handleSubmit() {
		// Early validation checks to prevent unnecessary processing
		if (isUploading) return;

		// Null-safety check
		if (!user?.uid) {
			console.error('User not authenticated');
			return;
		}

		if (!textContent.trim() && postType === 'text') {
			return; // No unreachable code after this - validation exit point
		}

		if (postType === 'youtube' && !youtubeUrl.trim()) {
			return; // No unreachable code after this - validation exit point
		}

		if (
			postType === 'poll' &&
			(!pollTitle.trim() || pollOptions.filter((opt) => opt.trim()).length < 2)
		) {
			return; // No unreachable code after this - validation exit point
		}

		// Check if trying to upload media while offline
		if (!$isOnline && (postType === 'photo' || postType === 'video')) {
			showOfflineWarning = true;
			setTimeout(() => {
				showOfflineWarning = false;
			}, 4000);
			return;
		}

		// Main submission logic starts here - no unreachable code issue
		isUploading = true;
		uploadProgress = '';

		try {
			let imagePaths: string[] = [];
			let videoPaths: string[] = [];

			// Handle file uploads FIRST before creating Firestore document (only when online)
			if (selectedFiles && (postType === 'photo' || postType === 'video') && $isOnline) {
				uploadProgress = 'Uploading files...';

				for (const file of Array.from(selectedFiles)) {
					if (postType === 'photo') {
						uploadProgress = `Uploading image: ${file.name}`;

						// Upload file directly without compression or validation
						const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}-${file.name}`);
						const uploadSnapshot = await uploadBytes(fileRef, file);
						const downloadURL = await getDownloadURL(uploadSnapshot.ref);
						imagePaths.push(downloadURL);
					} else if (postType === 'video') {
						uploadProgress = `Uploading video: ${file.name}`;

						// Upload file directly without validation
						const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}-${file.name}`);
						const uploadSnapshot = await uploadBytes(fileRef, file);
						const downloadURL = await getDownloadURL(uploadSnapshot.ref);
						videoPaths.push(downloadURL);
					}
				}
			}

			// Now create Firestore document with uploaded URLs
			uploadProgress = $isOnline ? 'Creating post...' : 'Queueing post for sync...';

			// Create post object following unified Firestore schema
			const postData = {
				authorUid: user.uid,
				familyId: FAMILY_ID,
				kind: postType,
				text: textContent.trim(),
				createdAt: new Date(), // Use Date object for validation, Firestore will convert to server timestamp
				likes: [],
				comments: [],
				// Add image URLs
				...(imagePaths.length > 0 && {
					imageUrl: imagePaths[0],
					imagePath: imagePaths[0],
					...(imagePaths.length > 1 && { imagePaths })
				}),
				// Add video URL
				...(videoPaths.length > 0 && {
					videoPath: videoPaths[0]
				}),
				// Add YouTube URL if present
				...(postType === 'youtube' &&
					youtubeUrl.trim() && {
						youtubeId: extractYouTubeId(youtubeUrl.trim())
					}),
				// Add poll data if present
				...(postType === 'poll' && {
					poll: {
						title: pollTitle.trim(),
						options: pollOptions
							.filter((opt) => opt.trim())
							.map((opt) => ({
								text: opt.trim(),
								votes: []
							}))
					}
				})
			};

			// Validate complete post data with Zod schema
			const postValidation = validatePost(postData);
			if (!postValidation.success) {
				console.error('Post validation failed:', postValidation.error);
				throw new Error('Invalid post data');
			}

			if ($isOnline) {
				// Replace client timestamp with server timestamp for Firestore
				const firestorePostData = {
					...postData,
					createdAt: serverTimestamp()
				};

				// Add to Firestore
				await addDoc(collection(db, 'posts'), firestorePostData);
				uploadProgress = 'Post created successfully!';
			} else {
				// Queue for offline sync (only text-based posts)
				if (postType === 'text' || postType === 'youtube' || postType === 'poll') {
					queueOfflineAction('post', postData);
					uploadProgress = 'Post queued for sync when online!';
				} else {
					throw new Error('Media uploads require internet connection');
				}
			}

			// Dispatch success event to parent
			dispatch('post-created');

			// Reset form
			textContent = '';
			selectedFiles = null;
			youtubeUrl = '';
			pollTitle = '';
			pollOptions = ['', ''];
			previewUrls = [];
			postType = 'text';
			uploadProgress = '';
		} catch (error) {
			console.error('Error creating post:', error);
			uploadProgress = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		} finally {
			isUploading = false;
		}
	}
</script>

{#if currentTheme === 'neo'}
	<GlassCard header="✍️ Share a moment" glow={true}>
		<div class="space-y-4">
			<div class="flex items-center space-x-3">
				{#if user.photoURL}
					<img
						src={user.photoURL}
						alt={getDisplayName(user?.email, { nickname: user?.nickname })}
						class="h-10 w-10 rounded-full border border-white/20"
					/>
				{:else}
					<div class="neo-glass h-10 w-10 rounded-full border border-white/20"></div>
				{/if}
				<div>
					<p class="font-medium" style="color: var(--neo-text-primary);">
						{getDisplayName(user?.email, { nickname: user?.nickname })}
					</p>
				</div>
			</div>

			<!-- Post type selector -->
			<div class="flex flex-wrap gap-2">
				<GlassChip
					onclick={() => setPostType('text')}
					variant={postType === 'text' ? 'accent' : 'default'}
					size="small"
				>
					Text
				</GlassChip>
				<GlassChip
					onclick={() => setPostType('photo')}
					variant={postType === 'photo' ? 'accent' : 'default'}
					size="small"
					disabled={!$isOnline}
					class={!$isOnline ? 'cursor-not-allowed opacity-50' : ''}
				>
					{#if !$isOnline}
						<WifiOff class="mr-1 h-4 w-4" />
					{:else}
						<Image class="mr-1 h-4 w-4" />
					{/if}
					Photo
				</GlassChip>
				<GlassChip
					onclick={() => setPostType('video')}
					variant={postType === 'video' ? 'accent' : 'default'}
					size="small"
					disabled={!$isOnline}
					class={!$isOnline ? 'cursor-not-allowed opacity-50' : ''}
				>
					{#if !$isOnline}
						<WifiOff class="mr-1 h-4 w-4" />
					{:else}
						<Video class="mr-1 h-4 w-4" />
					{/if}
					Video
				</GlassChip>
				<GlassChip
					onclick={() => setPostType('youtube')}
					variant={postType === 'youtube' ? 'accent' : 'default'}
					size="small"
				>
					<Youtube class="mr-1 h-4 w-4" />
					YouTube
				</GlassChip>
				<GlassChip
					onclick={() => setPostType('poll')}
					variant={postType === 'poll' ? 'accent' : 'default'}
					size="small"
				>
					<BarChart3 class="mr-1 h-4 w-4" />
					Poll
				</GlassChip>
			</div>

			<!-- Offline warning for media uploads -->
			{#if showOfflineWarning}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<WifiOff class="h-5 w-5 text-amber-400" />
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-amber-800">Internet needed for media uploads</h3>
							<p class="mt-1 text-sm text-amber-700">
								📡 Photo and video uploads require an internet connection. Try again once you're
								back online.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Content textarea -->
			{#if postType !== 'poll'}
				<div>
					<textarea
						bind:value={textContent}
						placeholder="What's on your mind?"
						class="neo-input w-full resize-none rounded-lg border px-3 py-3"
						style="background: var(--neo-glass); border-color: var(--neo-border); color: var(--neo-text-primary);"
						rows="3"
					></textarea>
				</div>
			{/if}

			<!-- File upload for photos/videos -->
			{#if postType === 'photo' || postType === 'video'}
				<div>
					<input
						type="file"
						multiple={postType === 'photo'}
						accept={postType === 'photo' ? 'image/*' : 'video/*'}
						onchange={handleFileSelect}
						class="neo-input w-full rounded-lg border px-3 py-2 text-sm"
						style="background: var(--neo-glass); border-color: var(--neo-border); color: var(--neo-text-primary);"
					/>
				</div>
			{/if}

			<!-- Preview uploaded files -->
			{#if previewUrls.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each previewUrls as url, index (url)}
						<div class="relative">
							{#if postType === 'photo'}
								<img
									src={url}
									alt="Preview"
									class="neo-image-glow h-20 w-20 rounded-lg object-cover"
								/>
							{:else if postType === 'video'}
								<video src={url} class="neo-image-glow h-20 w-20 rounded-lg object-cover" muted
								></video>
							{/if}
							<button
								onclick={() => removePreview(index)}
								class="neo-glass absolute -top-1 -right-1 rounded-full border border-white/20 p-1"
								style="color: var(--neo-magenta);"
							>
								<X class="h-3 w-3" />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<!-- YouTube URL input -->
			{#if postType === 'youtube'}
				<div>
					<input
						type="url"
						bind:value={youtubeUrl}
						placeholder="Enter YouTube URL"
						class="neo-input w-full rounded-lg border px-3 py-2"
						style="background: var(--neo-glass); border-color: var(--neo-border); color: var(--neo-text-primary);"
					/>
				</div>
			{/if}

			<!-- Poll creation -->
			{#if postType === 'poll'}
				<div class="space-y-3">
					<input
						type="text"
						bind:value={pollTitle}
						placeholder="Poll question"
						class="neo-input w-full rounded-lg border px-3 py-2"
						style="background: var(--neo-glass); border-color: var(--neo-border); color: var(--neo-text-primary);"
					/>
					{#each pollOptions as option, index (index)}
						<div class="flex space-x-2">
							<input
								type="text"
								bind:value={pollOptions[index]}
								placeholder="Option {index + 1}"
								class="neo-input flex-1 rounded-lg border px-3 py-2"
								style="background: var(--neo-glass); border-color: var(--neo-border); color: var(--neo-text-primary);"
							/>
							{#if pollOptions.length > 2}
								<GlassChip onclick={() => removePollOption(index)} size="small">
									<X class="h-4 w-4" style="color: var(--neo-magenta);" />
								</GlassChip>
							{/if}
						</div>
					{/each}
					<GlassChip onclick={addPollOption} size="small" variant="accent">Add Option</GlassChip>
				</div>
			{/if}

			<!-- Upload progress -->
			{#if uploadProgress}
				<div class="neo-glass rounded-lg border border-white/20 p-3">
					<p class="text-sm" style="color: var(--neo-text-secondary);">{uploadProgress}</p>
				</div>
			{/if}

			<!-- Submit button -->
			<div class="flex justify-end">
				<GlassChip onclick={handleSubmit} variant="accent" disabled={isUploading}>
					{#if isUploading}
						<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
					{:else}
						<Send class="mr-2 h-4 w-4" />
					{/if}
					{isUploading ? 'Posting...' : 'Post'}
				</GlassChip>
			</div>
		</div>
	</GlassCard>
{:else}
	<div class="rounded-lg bg-white p-6 shadow">
		<div class="mb-4 flex items-center space-x-3">
			{#if user.photoURL}
				<img
					src={user.photoURL}
					alt={getDisplayName(user?.email, { nickname: user?.nickname })}
					class="h-10 w-10 rounded-full"
				/>
			{:else}
				<div class="h-10 w-10 rounded-full bg-gray-300"></div>
			{/if}
			<div>
				<p class="font-medium text-gray-900">
					{getDisplayName(user?.email, { nickname: user?.nickname })}
				</p>
			</div>
		</div>

		<!-- Post type selector -->
		<div class="mb-4 flex flex-wrap gap-2">
			<button
				onclick={() => setPostType('text')}
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium {postType ===
				'text'
					? 'border-indigo-500 bg-indigo-50 text-indigo-700'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				Text
			</button>
			<button
				onclick={() => setPostType('photo')}
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium {postType ===
				'photo'
					? 'border-indigo-500 bg-indigo-50 text-indigo-700'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				<Image class="mr-1 h-4 w-4" />
				Photo
			</button>
			<button
				onclick={() => setPostType('video')}
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium {postType ===
				'video'
					? 'border-indigo-500 bg-indigo-50 text-indigo-700'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				<Video class="mr-1 h-4 w-4" />
				Video
			</button>
			<button
				onclick={() => setPostType('youtube')}
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium {postType ===
				'youtube'
					? 'border-indigo-500 bg-indigo-50 text-indigo-700'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				<Youtube class="mr-1 h-4 w-4" />
				YouTube
			</button>
			<button
				onclick={() => setPostType('poll')}
				class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium {postType ===
				'poll'
					? 'border-indigo-500 bg-indigo-50 text-indigo-700'
					: 'bg-white text-gray-700 hover:bg-gray-50'}"
			>
				<BarChart3 class="mr-1 h-4 w-4" />
				Poll
			</button>
		</div>

		<!-- Content textarea -->
		{#if postType !== 'poll'}
			<div class="mb-4">
				<textarea
					bind:value={textContent}
					placeholder="What's on your mind?"
					class="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
					rows="3"
				></textarea>
			</div>
		{/if}

		<!-- File upload for photos/videos -->
		{#if postType === 'photo' || postType === 'video'}
			<div class="mb-4">
				<input
					type="file"
					multiple={postType === 'photo'}
					accept={postType === 'photo' ? 'image/*' : 'video/*'}
					onchange={handleFileSelect}
					class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
				/>
				{#if uploadProgress}
					<p class="mt-2 text-xs text-blue-600">{uploadProgress}</p>
				{/if}
			</div>

			<!-- Image and video previews -->
			{#if previewUrls.length > 0}
				<div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
					{#each previewUrls as url, index (url)}
						<div class="relative">
							{#if selectedFiles && selectedFiles[index]?.type.startsWith('image/')}
								<img src={url} alt="" class="h-24 w-full rounded-xl bg-gray-100 object-contain" />
							{:else if selectedFiles && selectedFiles[index]?.type.startsWith('video/')}
								<video src={url} class="h-24 w-full rounded-lg object-cover" muted></video>
							{/if}
							<button
								onclick={() => removePreview(index)}
								class="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- YouTube URL input -->
		{#if postType === 'youtube'}
			<div class="mb-4">
				<input
					type="url"
					bind:value={youtubeUrl}
					placeholder="Enter YouTube URL"
					class="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
		{/if}

		<!-- Poll creator -->
		{#if postType === 'poll'}
			<div class="mb-4 space-y-3">
				<input
					type="text"
					bind:value={pollTitle}
					placeholder="What's your poll question?"
					class="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
				/>

				{#each pollOptions as _, optionIndex (optionIndex)}
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					<div class="flex items-center space-x-2">
						<input
							type="text"
							bind:value={pollOptions[optionIndex]}
							placeholder={`Option ${optionIndex + 1}`}
							class="flex-1 rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						/>
						{#if pollOptions.length > 2}
							<button
								onclick={() => removePollOption(optionIndex)}
								class="p-2 text-red-500 hover:text-red-700"
							>
								<X class="h-4 w-4" />
							</button>
						{/if}
					</div>
				{/each}

				{#if pollOptions.length < 6}
					<button
						onclick={addPollOption}
						class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
					>
						+ Add option
					</button>
				{/if}
			</div>
		{/if}

		<!-- Submit button -->
		<div class="flex justify-end">
			<button
				onclick={handleSubmit}
				disabled={isUploading}
				class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isUploading}
					<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
					{uploadProgress || 'Posting...'}
				{:else}
					<Send class="mr-2 h-4 w-4" />
					Post
				{/if}
			</button>
		</div>
	</div>
{/if}
