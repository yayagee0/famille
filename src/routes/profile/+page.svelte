<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, storage } from '$lib/firebase';
	import { updateProfile } from 'firebase/auth';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { User, Save, Mail } from 'lucide-svelte';
	import imageCompression from 'browser-image-compression';

	let user = $state(auth.currentUser);
	let displayName = $state('');
	let isUploading = $state(false);
	let isSaving = $state(false);
	let successMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				displayName = firebaseUser.displayName || '';
			}
		});

		return unsubscribe;
	});

	async function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file || !user) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			errorMessage = 'Please select an image file';
			return;
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			errorMessage = 'Image must be smaller than 5MB';
			return;
		}

		isUploading = true;
		errorMessage = null;

		try {
			// Compress image
			const options = {
				maxSizeMB: 1,
				maxWidthOrHeight: 400,
				useWebWorker: true
			};

			const compressedFile = await imageCompression(file, options);

			// Create preview
			previewUrl = URL.createObjectURL(compressedFile);

			// Upload to Firebase Storage
			const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}-avatar.jpg`);
			const snapshot = await uploadBytes(avatarRef, compressedFile);
			const downloadURL = await getDownloadURL(snapshot.ref);

			// Update user profile
			await updateProfile(user, {
				photoURL: downloadURL
			});

			// Force refresh user object
			await auth.currentUser?.reload();
			user = auth.currentUser;

			successMessage = 'Avatar updated successfully!';
		} catch (error) {
			console.error('Error uploading avatar:', error);
			errorMessage = 'Failed to upload avatar. Please try again.';
		} finally {
			isUploading = false;
			// Clear the input
			target.value = '';
		}
	}

	async function handleSaveProfile() {
		if (!user || isSaving) return;

		if (!displayName.trim()) {
			errorMessage = 'Display name is required';
			return;
		}

		isSaving = true;
		errorMessage = null;

		try {
			await updateProfile(user, {
				displayName: displayName.trim()
			});

			// Force refresh user object
			await auth.currentUser?.reload();
			user = auth.currentUser;

			successMessage = 'Profile updated successfully!';
		} catch (error) {
			console.error('Error updating profile:', error);
			errorMessage = 'Failed to update profile. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	// Clear messages after 5 seconds
	$effect(() => {
		if (successMessage || errorMessage) {
			const timer = setTimeout(() => {
				successMessage = null;
				errorMessage = null;
			}, 5000);

			return () => clearTimeout(timer);
		}
	});
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Profile Settings</h1>
		<p class="mt-1 text-sm text-gray-500">Manage your profile information and avatar</p>
	</div>

	{#if user}
		<!-- Messages -->
		{#if successMessage}
			<div class="rounded-md bg-green-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">{successMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<div class="rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-red-800">{errorMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Avatar Section -->
		<div class="rounded-lg bg-white shadow">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Profile Picture</h3>

				<div class="flex items-center space-x-6">
					<div class="flex-shrink-0">
						{#if previewUrl}
							<img class="h-20 w-20 rounded-full object-cover" src={previewUrl} alt="Preview" />
						{:else if user.photoURL}
							<img
								class="h-20 w-20 rounded-full object-cover"
								src={user.photoURL}
								alt={user.displayName || 'User'}
							/>
						{:else}
							<div class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-300">
								<User class="h-8 w-8 text-gray-500" />
							</div>
						{/if}
					</div>

					<div class="flex-1">
						<label class="block">
							<span class="sr-only">Choose profile photo</span>
							<input
								type="file"
								accept="image/*"
								onchange={handleAvatarUpload}
								disabled={isUploading}
								class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
							/>
						</label>
						<p class="mt-2 text-xs text-gray-500">
							JPG, PNG or GIF. Max 5MB. Image will be resized to 400x400px.
						</p>
					</div>

					{#if isUploading}
						<div class="flex items-center space-x-2">
							<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600"></div>
							<span class="text-sm text-gray-500">Uploading...</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Profile Information -->
		<div class="rounded-lg bg-white shadow">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Profile Information</h3>

				<div class="space-y-4">
					<!-- Display Name -->
					<div>
						<label for="displayName" class="mb-1 block text-sm font-medium text-gray-700">
							Display Name
						</label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<User class="h-5 w-5 text-gray-400" />
							</div>
							<input
								id="displayName"
								type="text"
								bind:value={displayName}
								class="block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 leading-5 placeholder-gray-500 focus:border-indigo-500 focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
								placeholder="Enter your display name"
							/>
						</div>
					</div>

					<!-- Email (read-only) -->
					<div>
						<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
							Email Address
						</label>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Mail class="h-5 w-5 text-gray-400" />
							</div>
							<input
								id="email"
								type="email"
								value={user.email || ''}
								disabled
								class="block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 py-2 pr-3 pl-10 leading-5 text-gray-500"
							/>
						</div>
						<p class="mt-1 text-xs text-gray-500">Email address cannot be changed</p>
					</div>
				</div>

				<!-- Save Button -->
				<div class="mt-6 flex justify-end">
					<button
						onclick={handleSaveProfile}
						disabled={isSaving || !displayName.trim()}
						class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isSaving}
							<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							Saving...
						{:else}
							<Save class="mr-2 h-4 w-4" />
							Save Changes
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Account Information -->
		<div class="rounded-lg bg-white shadow">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900">Account Information</h3>

				<dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Account Created</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(user.metadata.creationTime || '').toLocaleDateString()}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Last Sign In</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(user.metadata.lastSignInTime || '').toLocaleDateString()}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Provider</dt>
						<dd class="mt-1 text-sm text-gray-900">Google</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Family Role</dt>
						<dd class="mt-1 text-sm text-gray-900">Family Member</dd>
					</div>
				</dl>
			</div>
		</div>
	{:else}
		<div class="py-12 text-center">
			<User class="mx-auto h-12 w-12 text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Not signed in</h3>
			<p class="mt-1 text-sm text-gray-500">Please sign in to view your profile.</p>
		</div>
	{/if}
</div>
