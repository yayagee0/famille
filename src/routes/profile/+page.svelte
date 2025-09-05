<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, storage, db } from '$lib/firebase';
	import { FAMILY_ID } from '$lib/config';
	import { updateProfile } from 'firebase/auth';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import {
		doc,
		setDoc,
		serverTimestamp,
		collection,
		getDocs,
		query,
		addDoc,
		orderBy,
		getDoc
	} from 'firebase/firestore';
	import { User, Save, Mail, Download, Plus, Trophy, Star, Heart } from 'lucide-svelte';
	import imageCompression from 'browser-image-compression';
	import ErrorMessage from '$lib/ErrorMessage.svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import { validateImageFile } from '$lib/schemas';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import GlassChip from '$lib/themes/neo/components/GlassChip.svelte';
	import { themeStore } from '$lib/themes/neo';

	let user = $state(auth.currentUser);
	let displayName = $state('');
	let nickname = $state(''); // Add dedicated nickname field
	let isUploading = $state(false);
	let isSaving = $state(false);
	let isExporting = $state(false);
	let isLoadingQuestions = $state(false);
	let isAnswering = $state(false);
	let successMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);

	// Question bank state
	let userAnswers = $state<Array<any>>([]);
	let totalQuestions = $state(40); // Based on seed data
	let currentQuestions = $state<Array<any>>([]);
	let showQuestions = $state(false);
	let selectedAnswers = $state<Record<string, string>>({});
	let customAnswers = $state<Record<string, string>>({});
	let showOtherInput = $state<Record<string, boolean>>({});
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Categories for balanced rotation
	const categoryOrder = [
		['fun', 'daily'],
		['family', 'dreams'],
		['values', 'personality']
	];

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				displayName = firebaseUser.displayName || '';

				// Load existing user profile to get nickname
				try {
					const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
					if (userDoc.exists()) {
						const userData = userDoc.data();
						nickname = userData.nickname || '';
					}
				} catch (error) {
					console.error('Error loading user profile:', error);
				}

				loadUserAnswers();
			}
		});

		return unsubscribe;
	});

	async function loadUserAnswers() {
		if (!user?.uid) return;

		try {
			const answersQuery = query(
				collection(db, 'userAnswers', user.uid, 'answers'),
				orderBy('createdAt', 'desc')
			);
			const answersSnapshot = await getDocs(answersQuery);
			userAnswers = answersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('Error loading user answers:', error);
		}
	}

	async function loadNextQuestions() {
		if (!user?.uid || isLoadingQuestions) return;

		try {
			isLoadingQuestions = true;

			// Get all questions
			const questionsQuery = query(collection(db, 'questions'));
			const questionsSnapshot = await getDocs(questionsQuery);
			const allQuestions = questionsSnapshot.docs.map((doc) => ({
				id: doc.id,
				category: doc.data().category,
				text: doc.data().text,
				type: doc.data().type,
				options: doc.data().options,
				allowOther: doc.data().allowOther,
				...doc.data()
			}));

			// Filter out already answered questions
			const answeredQuestionIds = new Set(userAnswers.map((answer) => answer.questionId));
			const unansweredQuestions = allQuestions.filter((q) => !answeredQuestionIds.has(q.id));

			if (unansweredQuestions.length === 0) {
				currentQuestions = [];
				return;
			}

			// Balanced selection: pick 2-3 questions with ≥2 categories
			const selectedQuestions: any[] = [];
			const usedCategories = new Set<string>();

			// Try to get questions from different category groups
			for (const categoryGroup of categoryOrder) {
				for (const category of categoryGroup) {
					const categoryQuestions = unansweredQuestions.filter(
						(q) => q.category === category && !selectedQuestions.some((sq) => sq.id === q.id)
					);

					if (categoryQuestions.length > 0) {
						// Add user offset for fairness (based on UID hash)
						const userOffset = user.uid.charCodeAt(0) % categoryQuestions.length;
						const selectedQuestion = categoryQuestions[userOffset] || categoryQuestions[0];
						selectedQuestions.push(selectedQuestion);
						usedCategories.add(category);

						if (selectedQuestions.length >= 3) break;
					}
				}
				if (selectedQuestions.length >= 3) break;
			}

			// If we don't have enough, fill from any remaining questions
			if (selectedQuestions.length < 2) {
				const remainingQuestions = unansweredQuestions.filter(
					(q) => !selectedQuestions.some((sq) => sq.id === q.id)
				);

				while (selectedQuestions.length < Math.min(3, unansweredQuestions.length)) {
					if (remainingQuestions.length === 0) break;
					selectedQuestions.push(remainingQuestions.shift()!);
				}
			}

			currentQuestions = selectedQuestions;
			showQuestions = true;

			// Clear previous selections
			selectedAnswers = {};
			customAnswers = {};
			showOtherInput = {};
		} catch (error) {
			console.error('Error loading questions:', error);
			errorMessage = 'Failed to load questions. Please try again.';
		} finally {
			isLoadingQuestions = false;
		}
	}

	async function handleAnswerSelection(questionId: string, answer: string, isCustom = false) {
		selectedAnswers[questionId] = answer;

		if (isCustom) {
			showOtherInput[questionId] = true;
		} else {
			showOtherInput[questionId] = false;
			customAnswers[questionId] = '';
		}
	}

	async function handleCustomAnswer(questionId: string, customAnswer: string) {
		if (customAnswer.trim()) {
			customAnswers[questionId] = customAnswer.trim();
			selectedAnswers[questionId] = customAnswer.trim();
		}
	}

	async function saveAnswers() {
		if (!user?.uid || isAnswering) return;

		try {
			isAnswering = true;
			const answersToSave = [];

			for (const question of currentQuestions) {
				const selectedAnswer = selectedAnswers[question.id];
				if (!selectedAnswer) continue;

				const answerData = {
					questionId: question.id,
					answer: selectedAnswer,
					category: question.category,
					createdAt: serverTimestamp(),
					visibility: 'private',
					custom: customAnswers[question.id] ? true : false
				};

				answersToSave.push(answerData);
			}

			// Save all answers
			for (const answerData of answersToSave) {
				await addDoc(collection(db, 'userAnswers', user.uid, 'answers'), answerData);
			}

			// Show motivational messages
			const newTotalAnswers = userAnswers.length + answersToSave.length;
			showMotivationalMessage(newTotalAnswers);

			// Refresh user answers
			await loadUserAnswers();

			// Hide questions section
			showQuestions = false;
			currentQuestions = [];

			successMessage = `✅ ${answersToSave.length} answer${answersToSave.length > 1 ? 's' : ''} saved!`;
		} catch (error) {
			console.error('Error saving answers:', error);
			errorMessage = 'Failed to save answers. Please try again.';
		} finally {
			isAnswering = false;
		}
	}

	function showMotivationalMessage(totalAnswers: number) {
		const milestones = [
			{ count: 5, message: "You're starting to reveal your unique personality ✨" },
			{ count: 10, message: 'Your profile is really coming alive 🌟' },
			{ count: 20, message: 'Halfway there — your character identity is shining 💎' },
			{ count: 40, message: "Incredible! You've built a complete family identity card 🎉" }
		];

		const milestone = milestones.find((m) => m.count === totalAnswers);
		if (milestone) {
			// Create toast notification (simplified for now)
			successMessage = milestone.message;
		}

		// Random compliments (5-10% chance)
		if (Math.random() < 0.08) {
			const compliments = [
				'Cool choice! Someone in your family may agree 😉',
				"That's a bold pick 👊",
				'Interesting — this makes your profile unique 🔑',
				'Great taste 🏆',
				'Love that answer 💖'
			];
			const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
			successMessage = randomCompliment;
		}
	}

	function dismissError() {
		errorMessage = null;
	}

	function dismissSuccess() {
		successMessage = null;
	}

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
			// Show preview immediately
			previewUrl = URL.createObjectURL(file);

			// Compress image
			const compressedFile = await imageCompression(file, {
				maxSizeMB: 1,
				maxWidthOrHeight: 400,
				useWebWorker: true
			});

			// Upload to Firebase Storage
			const filename = `avatar-${Date.now()}.jpg`;
			const storageRef = ref(storage, `avatars/${user.uid}/${filename}`);
			await uploadBytes(storageRef, compressedFile);
			const downloadURL = await getDownloadURL(storageRef);

			// Update user profile
			await updateProfile(user, { photoURL: downloadURL });

			// Update user document
			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(
				userDocRef,
				{
					uid: user.uid,
					displayName: user.displayName,
					email: user.email,
					avatarUrl: downloadURL,
					photoURL: downloadURL,
					lastUpdatedAt: serverTimestamp()
				},
				{ merge: true }
			);

			// Refresh user
			await auth.currentUser?.reload();
			user = auth.currentUser;

			successMessage = 'Profile picture updated successfully!';
		} catch (error) {
			console.error('Error uploading avatar:', error);
			errorMessage = 'Failed to upload image. Please try again.';
		} finally {
			isUploading = false;
			target.value = '';
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
				previewUrl = null;
			}
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

			// Update user document in Firestore with structure: { uid: string, email: string, nickname?: string }
			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(
				userDocRef,
				{
					uid: user.uid,
					displayName: displayName.trim(),
					email: user.email,
					nickname: nickname.trim() || undefined, // Save nickname field specifically
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

	async function exportFamilyData() {
		if (!user || isExporting) return;

		isExporting = true;
		try {
			// Get all family posts
			const postsSnapshot = await getDocs(collection(db, 'posts'));
			const posts = postsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			// Create export data
			const exportData = {
				exportDate: new Date().toISOString(),
				familyId: FAMILY_ID,
				posts: posts,
				totalPosts: posts.length
			};

			// Download as JSON
			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `family-data-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			successMessage = 'Family data exported successfully!';
		} catch (error) {
			console.error('Error exporting data:', error);
			errorMessage = 'Failed to export data. Please try again.';
		} finally {
			isExporting = false;
		}
	}

	// Helper function to render trait with sentence template
	async function renderTrait(answer: any): Promise<string> {
		try {
			const questionDoc = await getDoc(doc(db, 'questions', answer.questionId));
			if (questionDoc.exists()) {
				const questionData = questionDoc.data();
				return questionData.sentenceTemplate.replace('{answer}', answer.answer);
			}
		} catch (error) {
			console.error('Error rendering trait:', error);
		}
		return `${answer.answer}`;
	}

	// Calculate progress percentage
	const progressPercentage = $derived(
		totalQuestions > 0 ? Math.round((userAnswers.length / totalQuestions) * 100) : 0
	);

	// Helper functions for category styling
	function getCategoryBadgeClass(category: string): string {
		const categoryStyles = {
			personality: 'bg-blue-100 text-blue-800',
			values: 'bg-green-100 text-green-800',
			family: 'bg-pink-100 text-pink-800',
			fun: 'bg-yellow-100 text-yellow-800',
			daily: 'bg-indigo-100 text-indigo-800',
			dreams: 'bg-purple-100 text-purple-800',
			hobbies: 'bg-orange-100 text-orange-800'
		};
		return categoryStyles[category as keyof typeof categoryStyles] || 'bg-gray-100 text-gray-800';
	}

	function getCategoryIcon(category: string): string {
		const categoryIcons = {
			personality: '🧠',
			values: '💎',
			family: '👨‍👩‍👧‍👦',
			fun: '🎉',
			daily: '📅',
			dreams: '✨',
			hobbies: '🎨'
		};
		return categoryIcons[category as keyof typeof categoryIcons] || '📋';
	}
</script>

<div class="mx-auto max-w-4xl space-y-6">
	{#if user}
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
					<div class="ml-auto pl-3">
						<button onclick={dismissSuccess} class="text-green-500 hover:text-green-700">
							<span class="sr-only">Dismiss</span>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<ErrorMessage message={errorMessage} onDismiss={dismissError} />
		{/if}

		<!-- 1. Identity Section (Avatar + Nickname) -->
		<div class="{currentTheme === 'neo' ? 'neo-glass neo-row-hover border border-white/10' : 'bg-white shadow-sm'} rounded-2xl">
			<div class="px-6 py-5">
				<h3 class="mb-4 text-lg font-semibold {currentTheme === 'neo' ? 'neo-gradient-text' : 'text-gray-900'}">Identity</h3>

				<div class="flex items-center space-x-6">
					<div class="flex-shrink-0">
						{#if previewUrl}
							<img class="h-20 w-20 rounded-full object-cover {currentTheme === 'neo' ? 'border-2 border-cyan-400/50' : ''}" src={previewUrl} alt="Preview" />
						{:else if user.photoURL}
							<img
								class="h-20 w-20 rounded-full object-cover {currentTheme === 'neo' ? 'border-2 border-cyan-400/50' : ''}"
								src={user.photoURL}
								alt={getDisplayName(user?.email, { nickname: undefined })}
							/>
						{:else}
							<div class="flex h-20 w-20 items-center justify-center rounded-full {currentTheme === 'neo' ? 'neo-glass border border-white/30' : 'bg-gray-300'}">
								<User class="h-8 w-8 {currentTheme === 'neo' ? 'text-slate-400' : 'text-gray-500'}" />
							</div>
						{/if}
					</div>

					<div class="flex-1 space-y-4">
						<!-- Avatar Upload -->
						<div>
							<label for="avatarUpload" class="mb-2 block text-sm font-medium text-gray-700">
								Profile Picture
							</label>
							<input
								id="avatarUpload"
								type="file"
								accept="image/*"
								onchange={handleAvatarUpload}
								disabled={isUploading}
								class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
							/>
							{#if isUploading}
								<div class="mt-2 flex items-center">
									<div
										class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600"
									></div>
									<span class="text-sm text-gray-500">Uploading...</span>
								</div>
							{/if}
						</div>

						<!-- Display Name -->
						<div>
							<label for="displayName" class="mb-1 block text-sm font-medium text-gray-700">
								Display Name
							</label>
							<input
								id="displayName"
								type="text"
								bind:value={displayName}
								placeholder="Enter your display name"
								disabled={isSaving}
								class="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
							/>
						</div>

						<!-- Nickname -->
						<div>
							<label for="nickname" class="mb-1 block text-sm font-medium text-gray-700">
								Nickname
							</label>
							<div class="flex flex-col gap-2 sm:flex-row">
								<input
									id="nickname"
									type="text"
									bind:value={nickname}
									placeholder="Enter your nickname (optional)"
									disabled={isSaving}
									class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
								/>
								<button
									onclick={handleSaveProfile}
									disabled={isSaving || !displayName.trim()}
									class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
								>
									{#if isSaving}
										<div
											class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"
										></div>
										Saving...
									{:else}
										<Save class="mr-2 h-4 w-4" />
										Save
									{/if}
								</button>
							</div>
						</div>

						<!-- Theme Preference -->
						<div>
							<ThemeToggle variant="full" showLabel={true} />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 2. My Identity Traits Section -->
		<div class="rounded-2xl bg-white shadow-sm">
			<div class="px-6 py-5">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-gray-900">My Identity Traits</h3>
						<p class="text-sm text-gray-600">Build your character profile by answering questions</p>
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold text-indigo-600">
							{userAnswers.length}/{totalQuestions}
						</div>
						<div class="text-xs text-gray-500">Answered</div>
					</div>
				</div>

				<!-- Progress Bar -->
				<div class="mb-6">
					<div class="mb-1 flex items-center justify-between text-sm text-gray-600">
						<span>Profile Completion</span>
						<span>{progressPercentage}%</span>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-200">
						<div
							class="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
							style="width: {progressPercentage}%"
						></div>
					</div>
				</div>

				<!-- Answered Questions (Traits) -->
				{#if userAnswers.length > 0}
					<div class="mb-6 space-y-3">
						{#each userAnswers as answer (answer.questionId)}
							{#await renderTrait(answer)}
								<div class="h-12 animate-pulse rounded-lg bg-gray-200"></div>
							{:then traitText}
								<div
									class="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4"
								>
									<div class="flex items-start justify-between">
										<p class="flex-1 pr-3 text-sm {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-800'}">{traitText}</p>
										<div class="flex flex-col items-end space-y-1">
											{#if currentTheme === 'neo'}
												<GlassChip size="small" variant="accent">
													{getCategoryIcon(answer.category)}
													{answer.category}
												</GlassChip>
												{#if answer.custom}
													<GlassChip size="small" variant="default">
														<Star class="h-3 w-3" />
														unique
													</GlassChip>
												{/if}
											{:else}
												<span
													class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getCategoryBadgeClass(
														answer.category
													)}"
												>
													{getCategoryIcon(answer.category)}
													{answer.category}
												</span>
												{#if answer.custom}
													<span
														class="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
													>
														<Star class="mr-1 h-3 w-3" />
														unique
													</span>
												{/if}
											{/if}
										</div>
									</div>
								</div>
							{/await}
						{/each}
					</div>
				{:else}
					<div class="mb-6 py-8 text-center">
						<Trophy class="mx-auto mb-3 h-12 w-12 text-gray-400" />
						<h4 class="mb-2 text-lg font-medium text-gray-900">Start Building Your Identity</h4>
						<p class="text-sm text-gray-500">
							Answer questions to discover and share your unique traits!
						</p>
					</div>
				{/if}

				<!-- Current Questions Section -->
				{#if showQuestions && currentQuestions.length > 0}
					<div class="border-t border-gray-200 pt-6">
						<h4 class="text-md mb-4 font-medium text-gray-900">Answer These Questions</h4>

						<div class="space-y-6">
							{#each currentQuestions as question (question.id)}
								<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
									<h5 class="mb-3 font-medium text-gray-900">{question.text}</h5>

									{#if question.type === 'multiple-choice'}
										<div class="mb-3 space-y-2">
											{#each question.options || [] as option (option)}
												<button
													onclick={() => handleAnswerSelection(question.id, option)}
													class="w-full rounded-lg border p-3 text-left transition-colors {selectedAnswers[
														question.id
													] === option
														? 'border-indigo-500 bg-indigo-50 text-indigo-700'
														: 'border-gray-200 bg-white hover:bg-gray-50'}"
												>
													{option}
												</button>
											{/each}

											{#if question.allowOther}
												<button
													onclick={() => handleAnswerSelection(question.id, 'Other', true)}
													class="w-full rounded-lg border p-3 text-left transition-colors {selectedAnswers[
														question.id
													] === 'Other' || showOtherInput[question.id]
														? 'border-indigo-500 bg-indigo-50 text-indigo-700'
														: 'border-gray-200 bg-white hover:bg-gray-50'}"
												>
													Other
												</button>

												{#if showOtherInput[question.id]}
													<input
														type="text"
														placeholder="Type your own answer..."
														bind:value={customAnswers[question.id]}
														onchange={() =>
															handleCustomAnswer(question.id, customAnswers[question.id])}
														class="mt-2 w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
													/>
												{/if}
											{/if}
										</div>
									{:else}
										<!-- Open-ended question -->
										<textarea
											placeholder="Share your thoughts..."
											bind:value={selectedAnswers[question.id]}
											class="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
											rows="3"
										></textarea>
									{/if}

									<div class="mt-3 flex items-center justify-between">
										<span
											class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
										>
											{question.category}
										</span>
									</div>
								</div>
							{/each}
						</div>

						<div class="mt-6 flex items-center space-x-3">
							<button
								onclick={saveAnswers}
								disabled={isAnswering || Object.keys(selectedAnswers).length === 0}
								class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isAnswering}
									<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
									Saving...
								{:else}
									<Heart class="mr-2 h-4 w-4" />
									Save Answers
								{/if}
							</button>

							<button
								onclick={() => {
									showQuestions = false;
									currentQuestions = [];
								}}
								class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<!-- Answer More Button -->
					<div class="flex justify-center">
						<button
							onclick={loadNextQuestions}
							disabled={isLoadingQuestions || userAnswers.length >= totalQuestions}
							class="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isLoadingQuestions}
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
								Loading Questions...
							{:else if userAnswers.length >= totalQuestions}
								<Trophy class="mr-2 h-4 w-4" />
								All Questions Completed! 🎉
							{:else}
								<Plus class="mr-2 h-4 w-4" />
								Answer More Questions
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- 3. Account Information Section -->
		<div class="rounded-2xl bg-white shadow-sm">
			<div class="px-6 py-5">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Account Information</h3>

				<dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Email</dt>
						<dd class="mt-1 flex items-center text-sm text-gray-900">
							<Mail class="mr-2 h-4 w-4 text-gray-400" />
							{user.email}
						</dd>
					</div>
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
					<div>
						<dt class="text-sm font-medium text-gray-500">Profile Progress</dt>
						<dd class="mt-1 text-sm text-gray-900">{progressPercentage}% Complete</dd>
					</div>
				</dl>

				<div class="mt-6">
					<button
						onclick={exportFamilyData}
						disabled={isExporting}
						class="inline-flex items-center rounded-lg border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
