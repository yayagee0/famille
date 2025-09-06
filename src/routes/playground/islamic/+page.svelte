<script lang="ts">
	import { onMount } from 'svelte';
	import { islamicQuestions } from '$lib/data/islamicQuestions';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import KnowledgeTree from '$lib/components/KnowledgeTree.svelte';
	import { auth, db, getUserProfile } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';
	import {
		collection,
		doc,
		getDocs,
		addDoc,
		deleteDoc,
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
	
	// State management using Svelte 5 runes
	let allQuestions = $state<Question[]>(islamicQuestions as Question[]);
	let answeredIds = $state<Set<string>>(new Set());
	let activeQuestions = $state<Question[]>([]);
	let allUnansweredQuestions = $state<Question[]>([]);
	let justAddedId = $state<string | null>(null); // Track newly added answers for animation
	
	// Derive answered questions from answeredIds and original questions
	const answeredQuestions = $derived(() => {
		return allQuestions.filter(q => answeredIds.has(q.id));
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

			// Load progress documents
			const progressQuery = query(
				collection(db, 'users', user.uid, 'islamicProgress'),
				orderBy('answeredAt', 'desc')
			);
			const progressSnapshot = await getDocs(progressQuery);
			
			const progressDocs = progressSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			})) as ProgressDoc[];

			// Update answered IDs
			answeredIds = new Set(progressDocs.map(doc => doc.id));
			
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
		allUnansweredQuestions = allQuestions.filter(q => !answeredIds.has(q.id));
		activeQuestions = allUnansweredQuestions.slice(0, 3);
	}

	// Save progress when a question is answered
	async function saveQuestionProgress(question: Question) {
		if (!user?.uid) return;

		try {
			const progressDoc = {
				id: question.id,
				category: question.category,
				answeredAt: serverTimestamp()
			};

			await addDoc(
				collection(db, 'users', user.uid, 'islamicProgress'),
				progressDoc
			);

			// Update local state
			answeredIds.add(question.id);
			answeredIds = new Set(answeredIds); // Trigger reactivity
			updateQuestionLists();
			
			// Set justAddedId for animation
			justAddedId = question.id;

		} catch (error) {
			console.error('Failed to save progress:', error);
		}
	}

	// Reset all progress
	async function resetProgress() {
		if (!user?.uid) return;
		
		try {
			const progressQuery = query(collection(db, 'users', user.uid, 'islamicProgress'));
			const progressSnapshot = await getDocs(progressQuery);
			
			const deletePromises = progressSnapshot.docs.map(doc => 
				deleteDoc(doc.ref)
			);
			
			await Promise.all(deletePromises);
			
			// Remove localStorage key islamicProgress (defensive programming)
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('islamicProgress');
			}
			
			// Reset local state
			answeredIds.clear();
			answeredIds = new Set(answeredIds); // Trigger reactivity
			justAddedId = null; // Reset animation state
			
			// Reload fresh data from islamicQuestions
			allQuestions = [...islamicQuestions as Question[]];
			updateQuestionLists();
			
			// Log for debugging
			console.log("Progress reset");
			
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
			.filter(q => !activeQuestions.find(aq => aq.id === q.id))
			.slice(0, 3);
		
		activeQuestions = [...activeQuestions, ...newQuestions];
	}

	// Check if there are more questions to load
	const hasMoreQuestions = $derived(() => {
		const activeIds = new Set(activeQuestions.map(q => q.id));
		return allUnansweredQuestions.some(q => !activeIds.has(q.id));
	});

	// Group answered questions by category for the knowledge tree
	const groupedAnsweredQuestions = $derived(() => {
		const groups: Record<string, Question[]> = {};
		const answered = answeredQuestions();
		answered.forEach(q => {
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
		'Allah': '🌙',
		'Prophet': '❤️',
		'Qur\'an': '📖',
		'Prayer': '🙏',
		'Life & Death': '🌱',
		'Akhlaq': '🤲',
		'Identity': '🕌'
	};
</script>

<div class="mx-auto max-w-2xl space-y-8 p-4">
	<!-- Loading State -->
	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Loading your progress...</p>
		</div>
	{:else}
		<!-- Header -->
		<div class="text-center">
			<div class="mb-4 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-4 text-white shadow-sm">
				<span class="text-3xl">🕌</span>
				<h1 class="text-2xl font-bold">Islam – Our Identity</h1>
			</div>
			<p class="text-gray-600">
				Learn about our beautiful faith through questions and reflections
			</p>
			{#if userNickname}
				<p class="mt-2 text-sm text-green-700 font-medium">
					Welcome back, {userNickname}! 🌟
				</p>
			{/if}
		</div>

		<!-- Active Questions Section -->
		{#if activeQuestions.length > 0}
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-800">Active Questions</h2>
				{#each activeQuestions as question (question.id)}
					<QuestionCard 
						{question} 
						onAnswered={() => handleQuestionAnswered(question)} 
					/>
				{/each}
			</div>
		{/if}

		<!-- Show More Questions Button -->
		{#if hasMoreQuestions()}
			<div class="text-center">
				<button
					onclick={showMoreQuestions}
					class="rounded-2xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-3 font-medium text-white shadow-sm transition-all hover:shadow-md hover:from-green-700 hover:to-teal-600"
				>
					Show More Questions
				</button>
			</div>
		{/if}

		<!-- Knowledge Tree Section -->
		{#if answeredQuestions().length > 0}
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-800">What I Know Now</h2>
					<button
						onclick={resetProgress}
						class="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
					>
						Reset Progress
					</button>
				</div>
				<KnowledgeTree 
					groupedAnsweredQuestions={groupedAnsweredQuestions()} 
					{categoryIcons} 
					{justAddedId}
					onAnimationComplete={() => { justAddedId = null; }}
				/>
			</div>
		{/if}

		<!-- Empty state when no questions are active -->
		{#if activeQuestions.length === 0 && !hasMoreQuestions()}
			<div class="rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 p-8 text-center">
				<div class="text-4xl mb-4">🎉</div>
				<h3 class="text-xl font-semibold text-gray-800 mb-2">
					Mashaallah! You've completed all questions!
				</h3>
				<p class="text-gray-600">
					Check your knowledge tree below to review what you've learned.
				</p>
			</div>
		{/if}
	{/if}
</div>