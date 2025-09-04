<script lang="ts">
	import { X, ArrowLeft, ArrowRight } from 'lucide-svelte';

	let {
		photos = [],
		selectedPhoto = null,
		selectedIndex = 0,
		onClose = () => {},
		onPrevious = () => {},
		onNext = () => {}
	}: {
		photos: any[];
		selectedPhoto: any;
		selectedIndex: number;
		onClose: () => void;
		onPrevious: () => void;
		onNext: () => void;
	} = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
		if (event.key === 'ArrowLeft') onPrevious();
		if (event.key === 'ArrowRight') onNext();
	}

	// Touch/swipe gesture support
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;

		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (event.changedTouches.length !== 1) return;

		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;

		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;

		// Only trigger swipe if horizontal movement is greater than vertical
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
			if (deltaX > 0) {
				// Swipe right -> previous photo
				onPrevious();
			} else {
				// Swipe left -> next photo
				onNext();
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if selectedPhoto}
	<div
		class="bg-opacity-90 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		onclick={onClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="photo-dialog-title"
		aria-describedby="photo-dialog-description"
		tabindex="-1"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		<!-- Close Button -->
		<button
			class="bg-opacity-50 hover:bg-opacity-70 absolute top-4 right-4 z-60 rounded-full bg-black p-2 text-white transition-all focus:ring-2 focus:ring-white focus:outline-none"
			onclick={onClose}
			tabindex="0"
			aria-label="Close photo viewer"
		>
			<X class="h-6 w-6" />
		</button>

		<!-- Navigation Buttons -->
		{#if photos.length > 1}
			<button
				class="bg-opacity-50 hover:bg-opacity-70 absolute top-1/2 left-4 z-60 -translate-y-1/2 rounded-full bg-black p-2 text-white transition-all focus:ring-2 focus:ring-white focus:outline-none disabled:opacity-30"
				onclick={(e) => {
					e.stopPropagation();
					onPrevious();
				}}
				disabled={selectedIndex === 0}
				tabindex="0"
				aria-label="Previous photo"
			>
				<ArrowLeft class="h-6 w-6" />
			</button>

			<button
				class="bg-opacity-50 hover:bg-opacity-70 absolute top-1/2 right-4 z-60 -translate-y-1/2 rounded-full bg-black p-2 text-white transition-all focus:ring-2 focus:ring-white focus:outline-none disabled:opacity-30"
				onclick={(e) => {
					e.stopPropagation();
					onNext();
				}}
				disabled={selectedIndex === photos.length - 1}
				tabindex="0"
				aria-label="Next photo"
			>
				<ArrowRight class="h-6 w-6" />
			</button>
		{/if}

		<!-- Image Container -->
		<div
			class="flex max-h-full max-w-full flex-col items-center justify-center"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			role="button"
			tabindex="0"
			id="photo-dialog-title"
		>
			<img
				src={selectedPhoto.displayUrl}
				alt="Family photo by {selectedPhoto.author?.displayName || 'Unknown'}"
				class="max-h-[80vh] max-w-full rounded-lg object-contain"
			/>

			<!-- Photo Info -->
			<div class="mt-4 text-center text-white" id="photo-dialog-description">
				<p class="text-lg font-medium">
					{selectedPhoto.author?.displayName || 'Unknown'}
				</p>
				<p class="text-sm opacity-80">
					{#if selectedPhoto.createdAt}
						{new Date(selectedPhoto.createdAt.toDate()).toLocaleDateString()}
					{/if}
				</p>
				{#if selectedPhoto.text}
					<p class="mt-2 text-sm">{selectedPhoto.text}</p>
				{/if}
			</div>

			<!-- Photo Counter -->
			{#if photos.length > 1}
				<div class="mt-2 text-sm text-white opacity-60">
					{selectedIndex + 1} of {photos.length}
				</div>
			{/if}
		</div>
	</div>
{/if}
