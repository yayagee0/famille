<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { auth } from '$lib/firebase';
	import { onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let user = $state(auth.currentUser);
	let textContent = '';
	let files: File[] = [];
	let youtubeUrl = '';
	let postType: 'text' | 'photo' | 'video' | 'youtube' | 'poll' = 'text';

	// Poll state
	let pollQuestion = '';
	let pollOptions: string[] = ['', '']; // default 2 options

	onMount(() => {
		auth.onAuthStateChanged((u) => (user = u));
	});

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			files = Array.from(target.files);
		}
	}

	function addPollOption() {
		if (pollOptions.length < 6) pollOptions.push('');
	}

	function removePollOption(index: number) {
		if (pollOptions.length > 2) pollOptions.splice(index, 1);
	}

	function resetForm() {
		textContent = '';
		files = [];
		youtubeUrl = '';
		postType = 'text';
		pollQuestion = '';
		pollOptions = ['', ''];
	}

	function submitPost() {
		if (!user) return;

		const payload: any = {
			type: postType,
			content: textContent,
			files,
			youtubeUrl,
			familyId: import.meta.env.VITE_FAMILY_ID
		};

		if (postType === 'poll' && pollQuestion.trim()) {
			payload.poll = {
				question: pollQuestion.trim(),
				options: pollOptions
					.filter((o) => o.trim())
					.map((opt) => ({
						text: opt.trim(),
						votes: [] // ✅ always start with empty array
					}))
			};
		}

		dispatch('post-created', payload);
		resetForm();
	}
</script>

<div class="mb-6 rounded-lg bg-white p-4 shadow">
	<!-- Tabs -->
	<div class="mb-4 flex space-x-4 text-sm font-medium text-gray-600">
		<button
			onclick={() => (postType = 'text')}
			class:selected={postType === 'text'}
			class="hover:text-indigo-600"
		>
			Text
		</button>
		<button
			onclick={() => (postType = 'photo')}
			class:selected={postType === 'photo'}
			class="hover:text-indigo-600"
		>
			Photo
		</button>
		<button
			onclick={() => (postType = 'video')}
			class:selected={postType === 'video'}
			class="hover:text-indigo-600"
		>
			Video
		</button>
		<button
			onclick={() => (postType = 'youtube')}
			class:selected={postType === 'youtube'}
			class="hover:text-indigo-600"
		>
			YouTube
		</button>
		<button
			onclick={() => (postType = 'poll')}
			class:selected={postType === 'poll'}
			class="hover:text-indigo-600"
		>
			Poll
		</button>
	</div>

	<!-- Content -->
	{#if postType === 'text'}
		<textarea
			bind:value={textContent}
			placeholder="What's on your mind?"
			class="w-full rounded border border-gray-300 p-2"
		></textarea>
	{/if}

	{#if postType === 'photo' || postType === 'video'}
		<input type="file" multiple={postType === 'photo'} accept={postType === 'photo' ? 'image/*' : 'video/*'} on:change={handleFileChange} />
	{/if}

	{#if postType === 'youtube'}
		<input
			type="url"
			bind:value={youtubeUrl}
			placeholder="Paste YouTube URL"
			class="w-full rounded border border-gray-300 p-2"
		/>
	{/if}

	{#if postType === 'poll'}
		<div class="space-y-2">
			<input
				type="text"
				bind:value={pollQuestion}
				placeholder="Poll question"
				class="w-full rounded border border-gray-300 p-2"
			/>
			{#each pollOptions as option, i (i)}
				<div class="flex space-x-2">
					<input
						type="text"
						bind:value={pollOptions[i]}
						placeholder="Option {i + 1}"
						class="flex-1 rounded border border-gray-300 p-2"
					/>
					{#if pollOptions.length > 2}
						<button
							type="button"
							onclick={() => removePollOption(i)}
							class="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
						>
							-
						</button>
					{/if}
				</div>
			{/each}
			{#if pollOptions.length < 6}
				<button
					type="button"
					onclick={addPollOption}
					class="rounded bg-indigo-500 px-3 py-1 text-sm text-white hover:bg-indigo-600"
				>
					Add Option
				</button>
			{/if}
		</div>
	{/if}

	<!-- Submit -->
	<div class="mt-4 text-right">
		<button
			onclick={submitPost}
			class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
		>
			Post
		</button>
	</div>
</div>

<style>
	button[selected],
	button.class\:selected {
		color: #4f46e5; /* indigo-600 */
		font-weight: bold;
	}
</style>
