<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Image, Video, Youtube, BarChart3, Send, X } from 'lucide-svelte';
	import { validateImageFile, validateVideoFile, validatePost } from '$lib/schemas';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { storage } from '$lib/firebase';
	import imageCompression from 'browser-image-compression';

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

	// Helper function to resize and compress images
	async function processImage(file: File): Promise<File> {
		const options = {
			maxSizeMB: 1, // Limit to 1MB
			maxWidthOrHeight: 1280, // Resize to max 1280px
			useWebWorker: true,
			fileType: 'image/jpeg' // Convert to JPEG for better compression
		};
		
		try {
			return await imageCompression(file, options);
		} catch (error) {
			console.warn('Image compression failed, using original:', error);
			return file;
		}
	}

	function setPostType(type: typeof postType) {
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

		// Create preview URLs for images and videos
		if (selectedFiles) {
			previewUrls = [];
			Array.from(selectedFiles).forEach((file) => {
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

		// Main submission logic starts here - no unreachable code issue
		isUploading = true;
		uploadProgress = '';

		try {
			let imagePaths: string[] = [];
			let videoPaths: string[] = [];
			let placeholderPaths: string[] = [];

			// For photo posts, create immediate placeholders and dispatch post right away
			if (selectedFiles && postType === 'photo') {
				uploadProgress = 'Creating post with placeholders...';
				
				// Create placeholder URLs from file objects for immediate display
				for (const file of Array.from(selectedFiles)) {
					const validation = validateImageFile(file);
					if (!validation.success) {
						throw new Error(`Invalid image file: ${file.name}`);
					}
					
					// Create blob URL for immediate preview
					const placeholderUrl = URL.createObjectURL(file);
					placeholderPaths.push(placeholderUrl);
				}

				// Create post data with placeholder images
				const placeholderPostData = {
					type: postType,
					content: textContent,
					authorUid: user.uid,
					familyId: import.meta.env.VITE_FAMILY_ID,
					createdAt: new Date(),
					imagePaths: placeholderPaths,
					isPlaceholder: true // Flag to indicate this needs real upload
				};

				// Dispatch placeholder post immediately
				dispatch('post-created', placeholderPostData);

				// Now upload actual images in background and dispatch update
				uploadProgress = 'Uploading optimized images...';
				
				for (let i = 0; i < selectedFiles.length; i++) {
					const file = selectedFiles[i];
					uploadProgress = `Optimizing and uploading image ${i + 1}/${selectedFiles.length}...`;
					
					// Process and compress image
					const processedFile = await processImage(file);
					
					const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}-${file.name}`);
					const uploadSnapshot = await uploadBytes(fileRef, processedFile);
					const downloadURL = await getDownloadURL(uploadSnapshot.ref);
					imagePaths.push(downloadURL);
				}

				// Clean up placeholder URLs
				placeholderPaths.forEach(url => URL.revokeObjectURL(url));

				// Create final post data with real images
				const finalPostData = {
					type: postType,
					content: textContent,
					authorUid: user.uid,
					familyId: import.meta.env.VITE_FAMILY_ID,
					createdAt: new Date(),
					imagePaths: imagePaths,
					isUpdate: true, // Flag to indicate this is an update to existing post
					placeholderPaths: placeholderPaths
				};

				uploadProgress = 'Finalizing post...';
				dispatch('post-updated', finalPostData);

			} else if (selectedFiles && postType === 'video') {
				// Handle video uploads (no placeholders for videos due to size)
				uploadProgress = 'Validating and processing files...';

				for (const file of Array.from(selectedFiles)) {
					const validation = validateVideoFile(file);
					if (!validation.success) {
						throw new Error(`Invalid video file: ${file.name}`);
					}

					uploadProgress = `Uploading video: ${file.name}`;
					const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}-${file.name}`);
					const uploadSnapshot = await uploadBytes(fileRef, file);
					const downloadURL = await getDownloadURL(uploadSnapshot.ref);
					videoPaths.push(downloadURL);
				}
			}

			// For non-photo posts or if no placeholders were created, handle normally
			if (postType !== 'photo' || !selectedFiles) {
				uploadProgress = 'Validating post data...';

				// Create post object following unified Firestore schema
				const postData = {
					type: postType,
					content: textContent.trim(),
					authorUid: user?.uid,
					familyId: 'ghassan-family',
					createdAt: new Date(),
					// Add media URLs if present
					...(imagePaths.length > 0 && { imagePaths }),
					...(videoPaths.length > 0 && { videoPaths }),
					// Add YouTube URL if present
					...(postType === 'youtube' && youtubeUrl.trim() && { youtubeUrl: youtubeUrl.trim() }),
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

				uploadProgress = 'Creating post...';
				dispatch('post-created', postData);
			}

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

<div class="rounded-lg bg-white p-6 shadow">
	<div class="mb-4 flex items-center space-x-3">
		{#if user.photoURL}
			<img src={user.photoURL} alt={user.displayName || 'User'} class="h-10 w-10 rounded-full" />
		{:else}
			<div class="h-10 w-10 rounded-full bg-gray-300"></div>
		{/if}
		<div>
			<p class="font-medium text-gray-900">{user.displayName || user.email}</p>
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
				accept={postType === 'photo'
					? '.jpg,.jpeg,.png,.webp,.gif,.heic,.bmp,.tiff,.svg'
					: '.mp4,.mov,.webm,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ogv'}
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

			{#each pollOptions as pollOption, index (index)}
				<div class="flex items-center space-x-2">
					<input
						type="text"
						bind:value={pollOptions[index]}
						placeholder={`Option ${index + 1}`}
						class="flex-1 rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
					/>
					{#if pollOptions.length > 2}
						<button
							onclick={() => removePollOption(index)}
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
