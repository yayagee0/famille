<script lang="ts">
	import { themeStore } from '$lib/themes/neo';

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

	let { question, onAnswered }: { question: Question; onAnswered: () => void } = $props();

	let selectedAnswer = $state<string>('');
	let openAnswer = $state<string>('');
	let showFeedback = $state(false);
	let isCorrect = $state(false);
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	function handleMCQAnswer(option: string) {
		selectedAnswer = option;
		// For MCQ, the first option is typically the correct one based on the data structure
		isCorrect = question.options ? question.options[0] === option : false;
		showFeedback = true;

		// Auto-advance after showing feedback
		setTimeout(() => {
			onAnswered();
		}, 3000);
	}

	function handleOpenAnswer() {
		if (openAnswer.trim()) {
			selectedAnswer = openAnswer.trim();
			isCorrect = true; // Open answers are always accepted
			showFeedback = true;

			// Auto-advance after showing feedback
			setTimeout(() => {
				onAnswered();
			}, 3000);
		}
	}

	function handleStoryNext() {
		isCorrect = true; // Story questions are just informational
		showFeedback = true;

		// Auto-advance after showing feedback
		setTimeout(() => {
			onAnswered();
		}, 3000);
	}
</script>

<div
	class="rounded-2xl border p-6 shadow-sm {currentTheme === 'neo'
		? 'neo-glass border-white/20'
		: 'border-gray-100 bg-white'}"
>
	<!-- Question Text -->
	<div class="mb-6 space-y-3">
		<!-- English Question -->
		<h3
			class="text-left text-lg font-medium {currentTheme === 'neo'
				? 'text-slate-200'
				: 'text-gray-900'}"
		>
			{question.question_en}
		</h3>

		<!-- Arabic Question -->
		<h3
			class="font-amiri text-arabic-lg {currentTheme === 'neo'
				? 'arabic-text text-slate-300'
				: 'text-gray-700'}"
			dir="rtl"
			lang="ar"
		>
			{question.question_ar}
		</h3>
	</div>

	<!-- Question Interface -->
	{#if !showFeedback}
		{#if question.format === 'mcq'}
			<!-- Multiple Choice Questions -->
			<div class="space-y-3">
				{#each question.options || [] as option}
					<button
						onclick={() => handleMCQAnswer(option)}
						class="w-full rounded-xl border p-4 text-left transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none {currentTheme ===
						'neo'
							? 'neo-row-hover border-white/20 text-slate-200 focus:ring-cyan-400'
							: 'border-gray-200 hover:border-green-300 hover:bg-green-50 focus:ring-green-500'}"
						aria-label="Answer option: {option}"
					>
						{option}
					</button>
				{/each}
			</div>
		{:else if question.format === 'open'}
			<!-- Open-ended Questions -->
			<div class="space-y-4">
				<textarea
					bind:value={openAnswer}
					placeholder="Share your thoughts..."
					class="w-full resize-none rounded-xl border p-4 focus:ring-2 focus:ring-offset-2 focus:outline-none {currentTheme ===
					'neo'
						? 'neo-glass border-white/20 text-slate-200 placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-400'
						: 'border-gray-200 focus:border-green-500 focus:ring-green-500'}"
					rows="3"
					aria-label="Type your answer here"
				></textarea>
				<button
					onclick={handleOpenAnswer}
					disabled={!openAnswer.trim()}
					class="rounded-xl px-6 py-2 font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 {currentTheme ===
					'neo'
						? 'neo-button border border-lime-400/50 bg-lime-500/20 text-lime-400 hover:bg-lime-500/30'
						: 'bg-gradient-to-r from-green-600 to-teal-500 hover:from-green-700 hover:to-teal-600 hover:shadow-md'}"
				>
					Submit Answer
				</button>
			</div>
		{:else if question.format === 'story'}
			<!-- Story Questions -->
			<div class="text-center">
				<button
					onclick={handleStoryNext}
					class="rounded-xl px-6 py-3 font-medium text-white shadow-sm transition-all {currentTheme ===
					'neo'
						? 'neo-button border border-lime-400/50 bg-lime-500/20 text-lime-400 hover:bg-lime-500/30'
						: 'bg-gradient-to-r from-green-600 to-teal-500 hover:from-green-700 hover:to-teal-600 hover:shadow-md'}"
				>
					Next
				</button>
			</div>
		{/if}
	{:else}
		<!-- Feedback Display -->
		<div
			class="space-y-4 rounded-xl p-6 {currentTheme === 'neo'
				? 'neo-glass border border-lime-400/30'
				: 'bg-gradient-to-r from-green-50 to-teal-50'}"
		>
			<!-- Result indicator -->
			<div class="text-center">
				{#if isCorrect}
					<div class="mb-2 text-2xl">✅</div>
					<p class="font-medium {currentTheme === 'neo' ? 'text-lime-400' : 'text-green-800'}">
						Excellent!
					</p>
				{:else}
					<div class="mb-2 text-2xl">📚</div>
					<p class="font-medium {currentTheme === 'neo' ? 'text-cyan-400' : 'text-blue-800'}">
						Let's learn together!
					</p>
				{/if}
			</div>

			<!-- Arabic Feedback (Primary) -->
			<div class="text-center">
				<p
					class="font-amiri text-arabic-xl leading-relaxed {currentTheme === 'neo'
						? 'arabic-text text-slate-200'
						: 'text-gray-800'}"
					dir="rtl"
					lang="ar"
				>
					{question.feedback_ar}
				</p>
			</div>

			<!-- English Feedback (Secondary) -->
			<div class="text-center">
				<p
					class="text-base leading-relaxed {currentTheme === 'neo'
						? 'text-slate-300'
						: 'text-gray-700'}"
				>
					{question.feedback_en}
				</p>
			</div>

			<!-- Reference -->
			<div class="text-center">
				<p
					class="text-sm font-medium {currentTheme === 'neo' ? 'text-slate-400' : 'text-gray-600'}"
				>
					— {question.reference}
				</p>
			</div>

			<!-- Auto-advance indicator -->
			<div class="text-center">
				<p class="text-xs {currentTheme === 'neo' ? 'text-slate-500' : 'text-gray-500'}">
					Moving to Knowledge Tree in 3 seconds...
				</p>
			</div>
		</div>
	{/if}

	<!-- Category Badge -->
	<div class="mt-4 flex items-center justify-between">
		<span
			class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium {currentTheme ===
			'neo'
				? 'neo-glass border border-white/20 text-slate-300'
				: 'bg-gray-100 text-gray-700'}"
		>
			{question.category}
		</span>
		{#if showFeedback}
			<span class="text-xs {currentTheme === 'neo' ? 'text-slate-500' : 'text-gray-500'}">
				Question {question.id}
			</span>
		{/if}
	</div>
</div>
