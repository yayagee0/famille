<script lang="ts">
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	
	// Custom transition that combines fade and scale
	function growIn(node: Element, { duration = 500 } = {}) {
		return {
			duration,
			css: (t: number) => {
				const scaleFactor = 0.95 + (0.05 * t);
				return `
					transform: scale(${scaleFactor});
					opacity: ${t};
				`;
			}
		};
	}

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

	let { 
		groupedAnsweredQuestions, 
		categoryIcons,
		justAddedId = null,
		onAnimationComplete
	}: { 
		groupedAnsweredQuestions: Record<string, Question[]>; 
		categoryIcons: Record<string, string>;
		justAddedId?: string | null;
		onAnimationComplete?: () => void;
	} = $props();

	// State for collapsible sections
	let expandedCategories = $state<Set<string>>(new Set());

	function toggleCategory(category: string) {
		if (expandedCategories.has(category)) {
			expandedCategories.delete(category);
		} else {
			expandedCategories.add(category);
		}
		// Trigger reactivity
		expandedCategories = new Set(expandedCategories);
	}

	// Get sorted categories for consistent display
	const sortedCategories = $derived(() => {
		return Object.keys(groupedAnsweredQuestions).sort();
	});

	// Handle animation completion
	function handleAnimationComplete() {
		if (onAnimationComplete) {
			// Small delay to ensure the animation is fully visible
			setTimeout(() => {
				onAnimationComplete();
			}, 500);
		}
	}
</script>

<div class="space-y-3">
	{#each sortedCategories() as category}
		{@const questions = groupedAnsweredQuestions[category]}
		{@const isExpanded = expandedCategories.has(category)}
		{@const icon = categoryIcons[category] || '📝'}
		
		<div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
			<!-- Category Header -->
			<button
				onclick={() => toggleCategory(category)}
				class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
				aria-expanded={isExpanded}
				aria-controls="category-{category}"
			>
				<div class="flex items-center gap-3">
					<span class="text-2xl">{icon}</span>
					<div>
						<h3 class="font-semibold text-gray-900">{category}</h3>
						<p class="text-sm text-gray-600">
							{questions.length} question{questions.length === 1 ? '' : 's'} learned
						</p>
					</div>
				</div>
				
				<div class="text-gray-400">
					{#if isExpanded}
						<ChevronDown class="h-5 w-5" />
					{:else}
						<ChevronRight class="h-5 w-5" />
					{/if}
				</div>
			</button>

			<!-- Expanded Content -->
			{#if isExpanded}
				<div 
					id="category-{category}" 
					class="border-t border-gray-100 p-4 space-y-4"
				>
					{#each questions as question}
						{@const isJustAdded = justAddedId === question.id}
						<div 
							class="rounded-xl bg-gradient-to-r from-green-50 to-teal-50 p-4 relative"
							class:animate-grow={isJustAdded}
						>
							{#if isJustAdded}
								<!-- Apply animation only to newly added items -->
								<div 
									in:growIn={{ duration: 500 }}
									onintroend={handleAnimationComplete}
									class="w-full"
								>
									<!-- Leaf emoji for newly added items -->
									<div 
										class="absolute -top-2 -right-2 text-lg"
										in:scale={{ duration: 300, delay: 200 }}
									>
										🌱
									</div>
									
									<!-- Question content for animated items -->
									<div class="mb-3 space-y-2">
										<h4 class="font-medium text-gray-900 text-left">
											{question.question_en}
										</h4>
										<h4 class="font-amiri text-arabic-lg text-gray-700" dir="rtl" lang="ar">
											{question.question_ar}
										</h4>
									</div>

									<!-- Feedback -->
									<div class="space-y-2 border-t border-green-200 pt-3">
										<!-- Arabic Feedback -->
										<p class="font-amiri text-arabic-lg text-gray-800 leading-relaxed" dir="rtl" lang="ar">
											{question.feedback_ar}
										</p>
										
										<!-- English Feedback -->
										<p class="text-sm text-gray-700 text-left leading-relaxed">
											{question.feedback_en}
										</p>

										<!-- Reference -->
										<p class="text-xs text-gray-600 text-center font-medium">
											— {question.reference}
										</p>
									</div>

									<!-- Question Type Badge -->
									<div class="mt-3 flex justify-between items-center">
										<span class="inline-flex items-center rounded-full bg-white bg-opacity-70 px-2 py-1 text-xs font-medium text-gray-600">
											{question.format.toUpperCase()}
										</span>
										<span class="text-xs text-gray-500">
											{question.id}
										</span>
									</div>
								</div>
							{:else}
								<!-- Regular display for existing items (no animation) -->
								<!-- Original Question -->
							<div class="mb-3 space-y-2">
								<h4 class="font-medium text-gray-900 text-left">
									{question.question_en}
								</h4>
								<h4 class="font-amiri text-arabic-lg text-gray-700" dir="rtl" lang="ar">
									{question.question_ar}
								</h4>
							</div>

							<!-- Feedback -->
							<div class="space-y-2 border-t border-green-200 pt-3">
								<!-- Arabic Feedback -->
								<p class="font-amiri text-arabic-lg text-gray-800 leading-relaxed" dir="rtl" lang="ar">
									{question.feedback_ar}
								</p>
								
								<!-- English Feedback -->
								<p class="text-sm text-gray-700 text-left leading-relaxed">
									{question.feedback_en}
								</p>

								<!-- Reference -->
								<p class="text-xs text-gray-600 text-center font-medium">
									— {question.reference}
								</p>
							</div>

							<!-- Question Type Badge -->
							<div class="mt-3 flex justify-between items-center">
								<span class="inline-flex items-center rounded-full bg-white bg-opacity-70 px-2 py-1 text-xs font-medium text-gray-600">
									{question.format.toUpperCase()}
								</span>
								<span class="text-xs text-gray-500">
									{question.id}
								</span>
							</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<!-- Empty state if no categories -->
{#if sortedCategories().length === 0}
	<div class="rounded-2xl bg-gray-50 p-8 text-center">
		<div class="text-4xl mb-3">📚</div>
		<p class="text-gray-600">
			Answer questions to build your knowledge tree!
		</p>
	</div>
{/if}

