<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { type WeeklyFeedback } from '$lib/smartEngine';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { MessageSquare, Send, CheckCircle } from 'lucide-svelte';

	// State
	let loading = $state(true);
	let pendingFeedback = $state<WeeklyFeedback[]>([]);
	let currentTheme = $state('default');
	let user = $state(auth.currentUser);
	let answers = $state<Record<string, Record<string, string>>>({});
	let submitting = $state<string | null>(null);

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Load pending feedback
	onMount(async () => {
		if (!user?.uid) {
			loading = false;
			return;
		}

		try {
			// Get unanswered feedback cards
			const feedbackQuery = query(
				collection(db, 'users', user.uid, 'feedback'),
				where('isPersistent', '==', true),
				where('answeredAt', '==', null)
			);

			const feedbackSnapshot = await getDocs(feedbackQuery);
			pendingFeedback = feedbackSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			})) as WeeklyFeedback[];

			// Initialize answers object
			answers = {};
			pendingFeedback.forEach((feedback) => {
				answers[feedback.id!] = {};
			});
		} catch (error) {
			console.error('[WeeklyFeedback] Failed to load feedback:', error);
		} finally {
			loading = false;
		}
	});

	// Submit feedback answers
	async function submitFeedback(feedbackId: string) {
		if (!user?.uid || !answers[feedbackId]) return;

		const feedbackAnswers = answers[feedbackId];
		const feedback = pendingFeedback.find((f) => f.id === feedbackId);

		if (!feedback) return;

		// Check if all questions are answered
		const allAnswered = feedback.questions.every((_, index) =>
			feedbackAnswers[index.toString()]?.trim()
		);

		if (!allAnswered) {
			alert('Please answer all questions before submitting.');
			return;
		}

		try {
			submitting = feedbackId;

			// Update feedback document
			await updateDoc(doc(db, 'users', user.uid, 'feedback', feedbackId), {
				answers: feedbackAnswers,
				answeredAt: new Date(),
				updatedAt: new Date()
			});

			// Remove from pending list
			pendingFeedback = pendingFeedback.filter((f) => f.id !== feedbackId);
			delete answers[feedbackId];

			console.log('[WeeklyFeedback] Submitted feedback:', feedbackId);
		} catch (error) {
			console.error('[WeeklyFeedback] Failed to submit feedback:', error);
			alert('Failed to submit feedback. Please try again.');
		} finally {
			submitting = null;
		}
	}

	// Format week range
	function formatWeekRange(weekStart: any) {
		if (!weekStart?.toDate) return '';

		const start = weekStart.toDate();
		const end = new Date(start);
		end.setDate(start.getDate() + 6);

		return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
	}

	// Get question icon
	function getQuestionIcon(type: string) {
		switch (type) {
			case 'gratitude':
				return '🙏';
			case 'reflection':
				return '💭';
			case 'goal':
				return '🎯';
			case 'challenge':
				return '💪';
			default:
				return '❓';
		}
	}
</script>

{#if pendingFeedback.length > 0}
	{#if currentTheme === 'neo'}
		<GlassCard header="📝 Weekly Reflections">
			<div class="space-y-6">
				<div class="flex items-center gap-2">
					<MessageSquare class="h-5 w-5 text-cyan-400" />
					<h2 class="text-xl font-bold text-slate-200">Weekly Reflections</h2>
					<span class="rounded-full bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">
						{pendingFeedback.length} pending
					</span>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-8">
						<LoadingSpinner />
					</div>
				{:else}
					{#each pendingFeedback as feedback (feedback.id)}
						<div class="space-y-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
							<!-- Header -->
							<div class="border-b border-cyan-400/20 pb-3">
								<h3 class="font-medium text-slate-200">
									Week of {formatWeekRange(feedback.weekStart)}
								</h3>
								<p class="text-sm text-cyan-300">Please share your thoughts from this week 💙</p>
							</div>

							<!-- Questions -->
							<div class="space-y-4">
								{#each feedback.questions as question, index}
									<div class="space-y-2">
										<label
											for="question-{feedback.id}-{index}"
											class="flex items-start gap-2 text-sm font-medium text-slate-200"
										>
											<span class="text-lg">{getQuestionIcon(question.type)}</span>
											<span>{question.text}</span>
										</label>
										<textarea
											id="question-{feedback.id}-{index}"
											bind:value={answers[feedback.id!][index.toString()]}
											placeholder="Share your thoughts..."
											class="w-full rounded-lg border border-slate-600 bg-slate-800/50 p-3 text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
											rows="3"
										></textarea>
									</div>
								{/each}
							</div>

							<!-- Submit Button -->
							<div class="flex justify-end pt-4">
								<button
									onclick={() => submitFeedback(feedback.id!)}
									disabled={submitting === feedback.id}
									class="flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if submitting === feedback.id}
										<LoadingSpinner size="small" />
										Submitting...
									{:else}
										<Send class="h-4 w-4" />
										Submit Reflection
									{/if}
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</GlassCard>
	{:else}
		<PlayCard header="📝 Weekly Reflections">
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<p class="text-gray-600">Please complete your weekly reflections</p>
					<span class="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">
						{pendingFeedback.length} pending
					</span>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-8">
						<LoadingSpinner />
					</div>
				{:else}
					{#each pendingFeedback as feedback (feedback.id)}
						<div class="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
							<!-- Header -->
							<div class="border-b border-indigo-200 pb-3">
								<h3 class="font-medium text-gray-800">
									Week of {formatWeekRange(feedback.weekStart)}
								</h3>
								<p class="text-sm text-indigo-600">Please share your thoughts from this week 💙</p>
							</div>

							<!-- Questions -->
							<div class="space-y-4">
								{#each feedback.questions as question, index}
									<div class="space-y-2">
										<label
											for="question-{feedback.id}-{index}-default"
											class="flex items-start gap-2 text-sm font-medium text-gray-700"
										>
											<span class="text-lg">{getQuestionIcon(question.type)}</span>
											<span>{question.text}</span>
										</label>
										<textarea
											id="question-{feedback.id}-{index}-default"
											bind:value={answers[feedback.id!][index.toString()]}
											placeholder="Share your thoughts..."
											class="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
											rows="3"
										></textarea>
									</div>
								{/each}
							</div>

							<!-- Submit Button -->
							<div class="flex justify-end pt-4">
								<button
									onclick={() => submitFeedback(feedback.id!)}
									disabled={submitting === feedback.id}
									class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if submitting === feedback.id}
										<LoadingSpinner size="small" />
										Submitting...
									{:else}
										<Send class="h-4 w-4" />
										Submit Reflection
									{/if}
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</PlayCard>
	{/if}
{/if}
