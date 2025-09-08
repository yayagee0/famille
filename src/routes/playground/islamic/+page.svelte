<script lang="ts">
	import { onMount } from 'svelte';
	import { islamicQuestions } from '$lib/data/islamicQuestions';
	import { SmartEngine } from '$lib/smartEngine';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import KnowledgeTree from '$lib/components/KnowledgeTree.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import GlassChip from '$lib/themes/neo/components/GlassChip.svelte';
	import { themeStore } from '$lib/themes/neo';
	import { auth, db, getUserProfile } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';
	import {
		collection,
		doc,
		getDocs,
		addDoc,
		deleteDoc,
		setDoc,
		serverTimestamp,
		query,
		orderBy
	} from 'firebase/firestore';

	// Question interface based on the data structure
	interface Question {
		id: string;
		category: string;
		question_en: string;
		question_ar: string;
		format: 'mcq' | 'open' | 'story';
		options?: string[];
		feedback_en: string;
		feedback_ar: string;
		reference: string;
	}

	// Progress document interface
	interface ProgressDoc {
		id: string;
		category: string;
		answeredAt: any; // Firestore Timestamp
	}

	// User authentication and data
	let user = $state(auth.currentUser);
	let userNickname = $state<string>('');
	let loading = $state(true);
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// State management using Svelte 5 runes
	let allQuestions = $state<Question[]>(islamicQuestions as Question[]);
	let answeredIds = $state<Set<string>>(new Set());
	let activeQuestions = $state<Question[]>([]);
	let allUnansweredQuestions = $state<Question[]>([]);
	let justAddedId = $state<string | null>(null); // Track newly added answers for animation

	// Derive answered questions from answeredIds and original questions
	const answeredQuestions = $derived(() => {
		return allQuestions.filter((q) => answeredIds.has(q.id));
	});

	// Initialize with first 3 questions - removed $effect to prevent infinite loop

	// Load user progress from Firestore
	async function loadUserProgress() {
		if (!user?.uid) return;

		try {
			// Load user profile to get nickname
			const userProfile = await getUserProfile(user.uid);
			if (userProfile?.nickname) {
				userNickname = userProfile.nickname;
			} else {
				userNickname = getDisplayName(user.email, { nickname: undefined });
			}

			// Load Islamic progress from the correct location: islamic_identity/{uid}
			const progressDoc = await doc(db, 'islamic_identity', user.uid);
			const progressSnapshot = await getDocs(query(collection(progressDoc, 'answers'), orderBy('answeredAt', 'desc')));

			const answeredQuestionIds = progressSnapshot.docs.map(doc => doc.id);

			// Update answered IDs
			answeredIds = new Set(answeredQuestionIds);

			// Filter questions to get unanswered ones
			updateQuestionLists();
		} catch (error) {
			console.error('Failed to load user progress:', error);
		} finally {
			loading = false;
		}
	}

	// Update question lists based on answered IDs
	function updateQuestionLists() {
		allUnansweredQuestions = allQuestions.filter((q) => !answeredIds.has(q.id));
		activeQuestions = allUnansweredQuestions.slice(0, 3);
	}

	// Save progress when a question is answered
	async function saveQuestionProgress(question: Question, isCorrect: boolean = true) {
		if (!user?.uid) return;

		try {
			// Save answer under islamic_identity/{uid}/answers/{questionId}
			const answerRef = doc(db, 'islamic_identity', user.uid, 'answers', question.id);
			await setDoc(answerRef, {
				questionId: question.id,
				category: question.category,
				isCorrect,
				answeredAt: serverTimestamp()
			});

			// Also update the main progress using Smart Engine  
			await SmartEngine.updateIslamicProgress(user.uid, question.id, isCorrect);

			// Update local state
			answeredIds.add(question.id);
			answeredIds = new Set(answeredIds); // Trigger reactivity
			updateQuestionLists();

			// Set justAddedId for animation
			justAddedId = question.id;
			setTimeout(() => {
				justAddedId = null;
			}, 2000);
		} catch (error) {
			console.error('Failed to save question progress:', error);
		}
	}

	// Reset all progress
	async function resetProgress() {
		if (!user?.uid) return;

		try {
			// Delete from the answers subcollection
			const answersQuery = query(collection(db, 'islamic_identity', user.uid, 'answers'));
			const answersSnapshot = await getDocs(answersQuery);

			const deletePromises = answersSnapshot.docs.map((doc) => deleteDoc(doc.ref));
			await Promise.all(deletePromises);

			// Also reset main progress document
			const progressRef = doc(db, 'islamic_identity', user.uid);
			await setDoc(progressRef, {
				userId: user.uid,
				answeredQuestions: [],
				totalCorrect: 0,
				streak: 0,
				updatedAt: serverTimestamp()
			});

			// Remove localStorage key islamicProgress (defensive programming)
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('islamicProgress');
			}

			// Reset local state
			answeredIds.clear();
			answeredIds = new Set(answeredIds); // Trigger reactivity
			justAddedId = null; // Reset animation state

			// Reload fresh data from islamicQuestions
			allQuestions = [...(islamicQuestions as Question[])];
			updateQuestionLists();

			// Log for debugging
			console.log('Progress reset');
		} catch (error) {
			console.error('Failed to reset progress:', error);
		}
	}

	function handleQuestionAnswered(question: Question) {
		// Save progress to Firestore
		saveQuestionProgress(question);
	}

	function showMoreQuestions() {
		const newQuestions = allUnansweredQuestions
			.filter((q) => !activeQuestions.find((aq) => aq.id === q.id))
			.slice(0, 3);

		activeQuestions = [...activeQuestions, ...newQuestions];
	}

	// Check if there are more questions to load
	const hasMoreQuestions = $derived(() => {
		const activeIds = new Set(activeQuestions.map((q) => q.id));
		return allUnansweredQuestions.some((q) => !activeIds.has(q.id));
	});

	// Group answered questions by category for the knowledge tree
	const groupedAnsweredQuestions = $derived(() => {
		const groups: Record<string, Question[]> = {};
		const answered = answeredQuestions();
		answered.forEach((q) => {
			if (!groups[q.category]) {
				groups[q.category] = [];
			}
			groups[q.category].push(q);
		});
		return groups;
	});

	// Authentication and data loading
	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				await loadUserProgress();
			} else {
				loading = false;
			}
		});

		return unsubscribe;
	});

	// Category icons mapping
	const categoryIcons: Record<string, string> = {
		Allah: '🌙',
		Prophet: '❤️',
		"Qur'an": '📖',
		Prayer: '🙏',
		'Life & Death': '🌱',
		Akhlaq: '🤲',
		Identity: '🕌'
	};
</script>

<div class="mx-auto max-w-2xl space-y-8 p-4">
	<!-- Loading State -->
	{#if loading}
		<div class="py-8 text-center">
			<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
			<p class="mt-2 text-gray-600">Loading your progress...</p>
		</div>
	{:else}
		<!-- Header -->
		<div class="text-center">
			<div
				class="mb-4 inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-white shadow-sm {currentTheme ===
				'neo'
					? 'neo-glass border border-white/20'
					: 'bg-gradient-to-r from-green-600 to-teal-500'}"
			>
				<span class="text-3xl">🕌</span>
				<h1 class="text-2xl font-bold {currentTheme === 'neo' ? 'neo-gradient-text' : ''}">
					Islam – Our Identity
				</h1>
			</div>
			<p
				class={currentTheme === 'neo' ? '' : 'text-gray-600'}
				style={currentTheme === 'neo' ? 'color: var(--neo-text-secondary);' : ''}
			>
				Learn about our beautiful faith through questions and reflections
			</p>
			{#if userNickname}
				<p
					class="mt-2 text-sm font-medium {currentTheme === 'neo' ? '' : 'text-green-700'}"
					style={currentTheme === 'neo' ? 'color: var(--neo-lime);' : ''}
				>
					Welcome back, {userNickname}! 🌟
				</p>
			{/if}
		</div>

		<!-- Active Questions Section -->
		{#if activeQuestions.length > 0}
			<div class="space-y-6">
				<h2
					class="text-xl font-semibold {currentTheme === 'neo'
						? 'neo-gradient-text'
						: 'text-gray-800'}"
				>
					Active Questions
				</h2>
				{#each activeQuestions as question (question.id)}
					{#if currentTheme === 'neo'}
						<GlassCard
							header={`${categoryIcons[question.category] || '📚'} ${question.category}`}
							glow={true}
						>
							<QuestionCard {question} onAnswered={() => handleQuestionAnswered(question)} />
						</GlassCard>
					{:else}
						<QuestionCard {question} onAnswered={() => handleQuestionAnswered(question)} />
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Show More Questions Button -->
		{#if hasMoreQuestions()}
			<div class="text-center">
				<button
					onclick={showMoreQuestions}
					class="rounded-2xl px-6 py-3 font-medium shadow-sm transition-all {currentTheme === 'neo'
						? 'neo-button'
						: 'bg-gradient-to-r from-green-600 to-teal-500 text-white hover:from-green-700 hover:to-teal-600 hover:shadow-md'}"
					style={currentTheme === 'neo'
						? 'border-color: var(--neo-lime); background: var(--neo-glass-medium); color: var(--neo-lime);'
						: ''}
				>
					Show More Questions
				</button>
			</div>
		{/if}

		<!-- Knowledge Tree Section -->
		{#if answeredQuestions().length > 0}
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2
						class="text-xl font-semibold {currentTheme === 'neo'
							? 'neo-gradient-text'
							: 'text-gray-800'}"
					>
						What I Know Now
					</h2>
					{#if currentTheme === 'neo'}
						<GlassChip onclick={resetProgress} size="medium" variant="accent">
							<span style="color: var(--neo-magenta);">Reset Progress</span>
						</GlassChip>
					{:else}
						<button
							onclick={resetProgress}
							class="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
						>
							Reset Progress
						</button>
					{/if}
				</div>

				<!-- Category summary with GlassChip badges -->
				{#if currentTheme === 'neo' && Object.keys(groupedAnsweredQuestions()).length > 0}
					<div class="mb-4 flex flex-wrap gap-2">
						{#each Object.entries(groupedAnsweredQuestions()) as [category, questions]}
							<GlassChip size="small" variant="accent">
								<span>{categoryIcons[category] || '📚'}</span>
								<span>{category}</span>
								<span style="color: var(--neo-cyan);">({questions.length})</span>
							</GlassChip>
						{/each}
					</div>
				{/if}

				{#if currentTheme === 'neo'}
					<GlassCard header="🌟 Knowledge Tree" glow={true}>
						<KnowledgeTree
							groupedAnsweredQuestions={groupedAnsweredQuestions()}
							{categoryIcons}
							{justAddedId}
							onAnimationComplete={() => {
								justAddedId = null;
							}}
						/>
					</GlassCard>
				{:else}
					<KnowledgeTree
						groupedAnsweredQuestions={groupedAnsweredQuestions()}
						{categoryIcons}
						{justAddedId}
						onAnimationComplete={() => {
							justAddedId = null;
						}}
					/>
				{/if}
			</div>
		{/if}

		<!-- Empty state when no questions are active -->
		{#if activeQuestions.length === 0 && !hasMoreQuestions()}
			<div
				class="rounded-2xl p-8 text-center {currentTheme === 'neo'
					? 'neo-glass'
					: 'bg-gradient-to-r from-green-50 to-teal-50'}"
				style={currentTheme === 'neo' ? 'border-color: var(--neo-lime);' : ''}
			>
				<div class="mb-4 text-4xl">🎉</div>
				<h3
					class="mb-2 text-xl font-semibold {currentTheme === 'neo'
						? 'neo-gradient-text'
						: 'text-gray-800'}"
				>
					Mashaallah! You've completed all questions!
				</h3>
				<p
					class={currentTheme === 'neo' ? '' : 'text-gray-600'}
					style={currentTheme === 'neo' ? 'color: var(--neo-text-secondary);' : ''}
				>
					Check your knowledge tree below to review what you've learned.
				</p>
			</div>
		{/if}
	{/if}
</div>
