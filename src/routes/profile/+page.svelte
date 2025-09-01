<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, storage, db } from '$lib/firebase';
	import { updateProfile } from 'firebase/auth';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
	import { User, Save, Mail, Moon, Sun, Download } from 'lucide-svelte';
	import imageCompression from 'browser-image-compression';
	import ErrorMessage from '$lib/ErrorMessage.svelte';
	import { validateImageFile } from '$lib/schemas';
	import { browser } from '$app/environment';

	let user = $state(auth.currentUser);
	let displayName = $state('');
	let isUploading = $state(false);
	let isSaving = $state(false);
	let isExporting = $state(false);
	let successMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);
	let isDarkMode = $state(false);

	onMount(() => {
		// Initialize dark mode from localStorage
		if (browser) {
			isDarkMode = localStorage.getItem('darkMode') === 'true' || false;
			if (isDarkMode) {
				document.documentElement.classList.add('dark');
			}
		}

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

		// Validate file using Zod schema
		const fileValidation = validateImageFile(file);
		if (!fileValidation.success) {
			const error = fileValidation.error;
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = 'Invalid file selected';
			}
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

			// Update user profile in Firebase Auth
			await updateProfile(user, {
				photoURL: downloadURL
			});

			// Update user document in Firestore
			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(
				userDocRef,
				{
					uid: user.uid,
					displayName: user.displayName || null,
					email: user.email,
					avatarUrl: downloadURL,
					photoURL: downloadURL,
					lastUpdatedAt: serverTimestamp()
				},
				{ merge: true }
			);

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
			// Update Firebase Auth profile
			await updateProfile(user, {
				displayName: displayName.trim()
			});

			// Update user document in Firestore
			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(
				userDocRef,
				{
					uid: user.uid,
					displayName: displayName.trim(),
					email: user.email,
					avatarUrl: user.photoURL || null,
					photoURL: user.photoURL || null,
					lastUpdatedAt: serverTimestamp()
				},
				{ merge: true }
			);

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

	function dismissError() {
		errorMessage = null;
	}

	function toggleDarkMode() {
		isDarkMode = !isDarkMode;
		if (browser) {
			if (isDarkMode) {
				document.documentElement.classList.add('dark');
				localStorage.setItem('darkMode', 'true');
			} else {
				document.documentElement.classList.remove('dark');
				localStorage.setItem('darkMode', 'false');
			}
		}

		// Trigger haptic feedback for mobile
		if ('vibrate' in navigator) {
			navigator.vibrate(25);
		}
	}

	async function exportFamilyData() {
		if (!user || isExporting) return;

		isExporting = true;
		errorMessage = null;

		try {
			// Gather all posts data
			const postsSnapshot = await getDocs(collection(db, 'posts'));
			const posts = postsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				// Convert Firestore timestamps to readable dates
				createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
			}));

			// Gather all users data
			const usersSnapshot = await getDocs(collection(db, 'users'));
			const users = usersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				// Convert Firestore timestamps to readable dates
				createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
				lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString() || doc.data().lastLoginAt,
				lastUpdatedAt:
					doc.data().lastUpdatedAt?.toDate?.()?.toISOString() || doc.data().lastUpdatedAt
			}));

			// Create export data structure
			const exportData = {
				exportDate: new Date().toISOString(),
				exportedBy: {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName
				},
				familyData: {
					posts,
					users
				},
				metadata: {
					totalPosts: posts.length,
					totalUsers: users.length,
					version: '1.0'
				}
			};

			// Create and download JSON file
			const dataStr = JSON.stringify(exportData, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);

			const link = document.createElement('a');
			link.href = url;
			link.download = `family-hub-data-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			successMessage = 'Family data exported successfully!';
		} catch (error) {
			console.error('Error exporting family data:', error);
			errorMessage = 'Failed to export family data. Please try again.';
		} finally {
			isExporting = false;
		}
	}
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
			<ErrorMessage message={errorMessage} onDismiss={dismissError} />
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

		<!-- Settings -->
		<div class="rounded-lg bg-white shadow dark:bg-gray-800">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900 dark:text-white">Settings</h3>

				<div class="space-y-4">
					<!-- Dark Mode Toggle -->
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<label for="dark-mode" class="text-sm font-medium text-gray-700 dark:text-gray-300">
								Dark Mode
							</label>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Toggle between light and dark appearance
							</p>
						</div>
						<button
							onclick={toggleDarkMode}
							class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none {isDarkMode
								? 'bg-indigo-600'
								: 'bg-gray-200'}"
							role="switch"
							aria-checked={isDarkMode}
							aria-labelledby="dark-mode"
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {isDarkMode
									? 'translate-x-5'
									: 'translate-x-0'}"
							>
								<span
									class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in {isDarkMode
										? 'opacity-0'
										: 'opacity-100'}"
								>
									<Sun class="h-3 w-3 text-gray-400" />
								</span>
								<span
									class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in {isDarkMode
										? 'opacity-100'
										: 'opacity-0'}"
								>
									<Moon class="h-3 w-3 text-indigo-600" />
								</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Data Export -->
		<div class="rounded-lg bg-white shadow dark:bg-gray-800">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="mb-4 text-lg leading-6 font-medium text-gray-900 dark:text-white">
					Data Export
				</h3>

				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Export all family data including posts and user information as a JSON file. This is a
						read-only operation that doesn't modify any data.
					</p>
				</div>

				<div class="flex justify-start">
					<button
						onclick={exportFamilyData}
						disabled={isExporting}
						class="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isExporting}
							<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							Exporting...
						{:else}
							<Download class="mr-2 h-4 w-4" />
							Export Family Data
						{/if}
					</button>
				</div>
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
