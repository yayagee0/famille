<script lang="ts">
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

<div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
	<!-- Question Text -->
	<div class="mb-6 space-y-3">
		<!-- English Question -->
		<h3 class="text-left text-lg font-medium text-gray-900">
			{question.question_en}
		</h3>

		<!-- Arabic Question -->
		<h3 class="font-amiri text-arabic-lg text-gray-700" dir="rtl" lang="ar">
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
						class="w-full rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-green-300 hover:bg-green-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
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
					class="w-full resize-none rounded-xl border border-gray-200 p-4 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
					rows="3"
					aria-label="Type your answer here"
				></textarea>
				<button
					onclick={handleOpenAnswer}
					disabled={!openAnswer.trim()}
					class="rounded-xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-2 font-medium text-white shadow-sm transition-all hover:from-green-700 hover:to-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
				>
					Submit Answer
				</button>
			</div>
		{:else if question.format === 'story'}
			<!-- Story Questions -->
			<div class="text-center">
				<button
					onclick={handleStoryNext}
					class="rounded-xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-3 font-medium text-white shadow-sm transition-all hover:from-green-700 hover:to-teal-600 hover:shadow-md"
				>
					Next
				</button>
			</div>
		{/if}
	{:else}
		<!-- Feedback Display -->
		<div class="space-y-4 rounded-xl bg-gradient-to-r from-green-50 to-teal-50 p-6">
			<!-- Result indicator -->
			<div class="text-center">
				{#if isCorrect}
					<div class="mb-2 text-2xl">✅</div>
					<p class="font-medium text-green-800">Excellent!</p>
				{:else}
					<div class="mb-2 text-2xl">📚</div>
					<p class="font-medium text-blue-800">Let's learn together!</p>
				{/if}
			</div>

			<!-- Arabic Feedback (Primary) -->
			<div class="text-center">
				<p class="font-amiri text-arabic-xl leading-relaxed text-gray-800" dir="rtl" lang="ar">
					{question.feedback_ar}
				</p>
			</div>

			<!-- English Feedback (Secondary) -->
			<div class="text-center">
				<p class="text-base leading-relaxed text-gray-700">
					{question.feedback_en}
				</p>
			</div>

			<!-- Reference -->
			<div class="text-center">
				<p class="text-sm font-medium text-gray-600">
					— {question.reference}
				</p>
			</div>

			<!-- Auto-advance indicator -->
			<div class="text-center">
				<p class="text-xs text-gray-500">Moving to Knowledge Tree in 3 seconds...</p>
			</div>
		</div>
	{/if}

	<!-- Category Badge -->
	<div class="mt-4 flex items-center justify-between">
		<span
			class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
		>
			{question.category}
		</span>
		{#if showFeedback}
			<span class="text-xs text-gray-500">
				Question {question.id}
			</span>
		{/if}
	</div>
</div>
