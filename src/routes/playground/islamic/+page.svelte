<script lang="ts">
	import { islamicQuestions } from '$lib/data/islamicQuestions';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import KnowledgeTree from '$lib/components/KnowledgeTree.svelte';

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

	// State management using Svelte 5 runes
	let allQuestions = $state<Question[]>(islamicQuestions as Question[]);
	let activeQuestions = $state<Question[]>(islamicQuestions.slice(0, 3) as Question[]);
	let answeredQuestions = $state<Question[]>([]);
	let questionsToShow = $state(3);

	// Initialize with first 3 questions - removed $effect to prevent infinite loop

	function handleQuestionAnswered(question: Question) {
		// Remove from active questions
		activeQuestions = activeQuestions.filter(q => q.id !== question.id);
		
		// Add to answered questions
		answeredQuestions = [...answeredQuestions, question];
	}

	function showMoreQuestions() {
		const unanswered = allQuestions.filter(
			(q) => !answeredQuestions.find((aq) => aq.id === q.id) && 
				   !activeQuestions.find((aq) => aq.id === q.id)
		);
		
		const newQuestions = unanswered.slice(0, 3);
		activeQuestions = [...activeQuestions, ...newQuestions];
	}

	// Check if there are more questions to load
	const hasMoreQuestions = $derived(() => {
		const answeredIds = new Set(answeredQuestions.map(q => q.id));
		const activeIds = new Set(activeQuestions.map(q => q.id));
		return allQuestions.some(q => !answeredIds.has(q.id) && !activeIds.has(q.id));
	});

	// Group answered questions by category for the knowledge tree
	const groupedAnsweredQuestions = $derived(() => {
		const groups: Record<string, Question[]> = {};
		answeredQuestions.forEach(q => {
			if (!groups[q.category]) {
				groups[q.category] = [];
			}
			groups[q.category].push(q);
		});
		return groups;
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
	<!-- Header -->
	<div class="text-center">
		<div class="mb-4 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-4 text-white shadow-sm">
			<span class="text-3xl">🕌</span>
			<h1 class="text-2xl font-bold">Islam – Our Identity</h1>
		</div>
		<p class="text-gray-600">
			Learn about our beautiful faith through questions and reflections
		</p>
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
	{#if answeredQuestions.length > 0}
		<div class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-800">What I Know Now</h2>
			<KnowledgeTree groupedAnsweredQuestions={groupedAnsweredQuestions()} {categoryIcons} />
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
</div>