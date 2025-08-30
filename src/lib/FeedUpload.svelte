<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Image, Video, Youtube, BarChart3, Send, X } from 'lucide-svelte';
	import imageCompression from 'browser-image-compression';

	const dispatch = createEventDispatcher();

	let { user } = $props<{ user: any }>();

	let textContent = $state('');
	let selectedFiles: FileList | null = $state(null);
	let youtubeUrl = $state('');
	let pollQuestion = $state('');
	let pollOptions = $state(['', '']);
	let postType: 'text' | 'photo' | 'video' | 'youtube' | 'poll' = $state('text');
	let isUploading = $state(false);
	let previewUrls: string[] = $state([]);

	function setPostType(type: typeof postType) {
		postType = type;
		// Reset form when changing type
		selectedFiles = null;
		youtubeUrl = '';
		pollQuestion = '';
		pollOptions = ['', ''];
		previewUrls = [];
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		selectedFiles = target.files;

		// Create preview URLs for images
		if (selectedFiles) {
			previewUrls = [];
			Array.from(selectedFiles).forEach((file) => {
				if (file.type.startsWith('image/')) {
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

	async function compressImage(file: File): Promise<File> {
		if (!file.type.startsWith('image/')) return file;

		try {
			const options = {
				maxSizeMB: 1,
				maxWidthOrHeight: 1920,
				useWebWorker: true
			};

			return await imageCompression(file, options);
		} catch (error) {
			console.error('Error compressing image:', error);
			return file;
		}
	}

	async function handleSubmit() {
		if (isUploading) return;

		if (!textContent.trim() && postType === 'text') {
			return;
		}

		if (postType === 'youtube' && !youtubeUrl.trim()) {
			return;
		}

		if (
			postType === 'poll' &&
			(!pollQuestion.trim() || pollOptions.filter((opt) => opt.trim()).length < 2)
		) {
			return;
		}

		isUploading = true;

		try {
			let files: File[] = [];

			if (selectedFiles && (postType === 'photo' || postType === 'video')) {
				for (const file of Array.from(selectedFiles)) {
					if (postType === 'photo') {
						const compressedFile = await compressImage(file);
						files.push(compressedFile);
					} else {
						files.push(file);
					}
				}
			}

			const postData = {
				type: postType,
				content: textContent.trim(),
				author: {
					uid: user.uid,
					displayName: user.displayName || 'Anonymous',
					photoURL: user.photoURL || null,
					email: user.email
				},
				files: files,
				youtubeUrl: postType === 'youtube' ? youtubeUrl.trim() : null,
				poll:
					postType === 'poll'
						? {
								question: pollQuestion.trim(),
								options: pollOptions
									.filter((opt) => opt.trim())
									.map((opt) => ({
										text: opt.trim(),
										votes: 0
									}))
							}
						: null,
				timestamp: new Date(),
				familyId: 'ghassan-family'
			};

			dispatch('post-created', postData);

			// Reset form
			textContent = '';
			selectedFiles = null;
			youtubeUrl = '';
			pollQuestion = '';
			pollOptions = ['', ''];
			previewUrls = [];
			postType = 'text';
		} catch (error) {
			console.error('Error creating post:', error);
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
	<div class="mb-4">
		<textarea
			bind:value={textContent}
			placeholder={postType === 'poll'
				? 'Add a description for your poll...'
				: "What's on your mind?"}
			class="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
			rows="3"
		></textarea>
	</div>

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
		</div>

		<!-- Image previews -->
		{#if previewUrls.length > 0}
			<div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
				{#each previewUrls as url, index}
					<div class="relative">
						<img src={url} alt="Preview" class="h-24 w-full rounded-lg object-cover" />
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
				bind:value={pollQuestion}
				placeholder="Ask a question..."
				class="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
			/>

			{#each pollOptions as option, index}
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
				Posting...
			{:else}
				<Send class="mr-2 h-4 w-4" />
				Post
			{/if}
		</button>
	</div>
</div>
