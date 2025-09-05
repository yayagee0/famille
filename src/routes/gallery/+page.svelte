<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
	import { db, getFamilyId } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	let photos = $state<any[]>([]);
	let loading = $state(true);
	let selectedPhoto = $state<any | null>(null);
	let selectedIndex = $state(0);

	// Dynamic import for Lightbox component
	let LightboxComponent = $state<any>(null);

	async function loadLightbox() {
		if (!LightboxComponent) {
			const { default: Lightbox } = await import('$lib/components/Lightbox.svelte');
			LightboxComponent = Lightbox;
		}
	}

	onMount(async () => {
		try {
			const familyId = getFamilyId();

			// Query for photo posts only
			const photosQuery = query(
				collection(db, 'posts'),
				where('familyId', '==', familyId),
				where('kind', '==', 'photo'),
				orderBy('createdAt', 'desc')
			);

			const photosSnapshot = await getDocs(photosQuery);
			const rawPhotos = photosSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			// Enrich with author data from users/{uid}
			const enrichedPhotos = await Promise.all(
				rawPhotos.map(async (photo: any) => {
					if (photo.authorUid) {
						const userDoc = await getDoc(doc(db, 'users', photo.authorUid));
						if (userDoc.exists()) {
							const userData = userDoc.data();
							return {
								...photo,
								author: {
									displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
									avatarUrl: userData.avatarUrl || null
								}
							};
						}
					}
					return { ...photo, author: { displayName: 'Unknown User', avatarUrl: null } };
				})
			);

			// Flatten to individual images
			const allImages: any[] = [];
			enrichedPhotos.forEach((photo) => {
				// Check both imagePath (single) and imagePaths (multiple)
				const imagePaths = photo.imagePaths || (photo.imagePath ? [photo.imagePath] : []);
				imagePaths.forEach((imageUrl: string) => {
					allImages.push({
						...photo,
						imageUrl,
						displayUrl: imageUrl
					});
				});
			});

			photos = allImages;
		} catch (error) {
			console.error('Error loading gallery:', error);
		} finally {
			loading = false;
		}
	});

	async function openLightbox(photo: any, index: number) {
		await loadLightbox(); // Load Lightbox component dynamically
		selectedPhoto = photo;
		selectedIndex = index;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		selectedPhoto = null;
		selectedIndex = 0;
		document.body.style.overflow = 'auto';
	}

	function previousPhoto() {
		if (selectedIndex > 0) {
			selectedIndex--;
			selectedPhoto = photos[selectedIndex];
		}
	}

	function nextPhoto() {
		if (selectedIndex < photos.length - 1) {
			selectedIndex++;
			selectedPhoto = photos[selectedIndex];
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!selectedPhoto) return;

		if (event.key === 'Escape') closeLightbox();
		if (event.key === 'ArrowLeft') previousPhoto();
		if (event.key === 'ArrowRight') nextPhoto();
	}

	// Touch/swipe gesture support
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	// Touch handlers removed - unused in template
	// TODO: Add touch/swipe support for mobile gallery navigation if needed
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Family Gallery</h1>
		<p class="mt-1 text-sm text-gray-500">All the beautiful moments you've shared</p>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each Array(8) as _}
				<div class="aspect-square animate-pulse rounded-2xl bg-gray-200"></div>
			{/each}
		</div>
	{:else if photos.length === 0}
		<!-- Empty State -->
		<div class="py-16 text-center">
			<div class="mb-4 text-6xl">📷</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900">No photos yet</h3>
			<p class="mb-6 text-gray-500">Start sharing photos with your family to see them here!</p>
			<a
				href="/feed"
				class="inline-flex items-center rounded-2xl border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
			>
				Share Your First Photo
			</a>
		</div>
	{:else}
		<!-- Photo Grid -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each photos as photo, index}
				<button
					class="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-shadow hover:shadow-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					onclick={() => openLightbox(photo, index)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openLightbox(photo, index);
						}
					}}
					tabindex="0"
					aria-label="View photo by {photo.author?.displayName || 'Unknown'}"
				>
					<img
						src={photo.displayUrl}
						alt="Family photo by {photo.author?.displayName || 'Unknown'}"
						class="h-full w-full object-cover transition-transform group-hover:scale-105"
						loading="lazy"
					/>
					<div
						class="bg-opacity-0 group-hover:bg-opacity-20 absolute inset-0 bg-black transition-opacity"
					></div>
				</button>
			{/each}
		</div>

		<!-- Photo Count -->
		<div class="text-center">
			<p class="text-sm text-gray-500">
				{photos.length}
				{photos.length === 1 ? 'photo' : 'photos'} in your family gallery
			</p>
		</div>
	{/if}
</div>

<!-- Dynamic Lightbox Component -->
{#if LightboxComponent && selectedPhoto}
	{@const DynamicLightbox = LightboxComponent}
	<DynamicLightbox
		{photos}
		{selectedPhoto}
		{selectedIndex}
		onClose={closeLightbox}
		onPrevious={previousPhoto}
		onNext={nextPhoto}
	/>
{/if}
