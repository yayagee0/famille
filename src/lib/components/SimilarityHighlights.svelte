<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db, getFamilyId } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
	import { Users, Sparkles } from 'lucide-svelte';
	import { getDisplayName } from '../getDisplayName';
	import type { User } from 'firebase/auth';

	let user = $state<User | null>(auth.currentUser);
	let similarities = $state<
		Array<{
			question: string;
			answer: string;
			sharedWith: string[];
			category: string;
		}>
	>([]);
	let loading = $state(true);

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				loadSimilarities();
			}
		});

		return unsubscribe;
	});

	async function loadSimilarities() {
		if (!user?.uid) return;

		try {
			loading = true;

			// Batch all required data in parallel for better performance
			const [userAnswersSnapshot, usersSnapshot, questionsSnapshot] = await Promise.all([
				// Get current user's answers
				getDocs(query(collection(db, 'userAnswers', user.uid, 'answers'))),
				// Get all family members
				getDocs(query(collection(db, 'users'))),
				// Get all questions for reference
				getDocs(query(collection(db, 'questions')))
			]);

			const userAnswers = userAnswersSnapshot.docs.map((doc) => ({
				id: doc.id,
				questionId: doc.data().questionId,
				answer: doc.data().answer,
				category: doc.data().category,
				...doc.data()
			}));

			const familyMembers = usersSnapshot.docs
				.map((doc) => ({
					uid: doc.id,
					displayName: doc.data().displayName,
					email: doc.data().email,
					...doc.data()
				}))
				.filter((member: any) => member.uid !== user?.uid);

			// Create questions lookup map
			const questionsMap = new Map();
			questionsSnapshot.docs.forEach((doc) => {
				questionsMap.set(doc.id, doc.data());
			});

			// Batch fetch all family members' answers in parallel
			const memberAnswersPromises = familyMembers.map(async (member) => {
				const memberAnswersSnapshot = await getDocs(
					query(collection(db, 'userAnswers', member.uid, 'answers'))
				);
				return {
					memberUid: member.uid,
					memberName: getDisplayName(member.email, { nickname: undefined }),
					answers: memberAnswersSnapshot.docs.map((doc) => ({
						questionId: doc.data().questionId,
						answer: doc.data().answer,
						category: doc.data().category,
						...doc.data()
					}))
				};
			});

			const allMemberAnswers = await Promise.all(memberAnswersPromises);

			// Create a lookup map for faster comparison
			const memberAnswersMap = new Map();
			allMemberAnswers.forEach(({ memberUid, memberName, answers }) => {
				answers.forEach((answer) => {
					const key = `${memberUid}_${answer.questionId}`;
					memberAnswersMap.set(key, { ...answer, memberName });
				});
			});

			const matchingAnswers: Array<{
				question: string;
				answer: string;
				sharedWith: string[];
				category: string;
			}> = [];

			// Compare answers efficiently using the lookup map
			for (const userAnswer of userAnswers) {
				const sharedWith: string[] = [];

				for (const member of familyMembers) {
					const key = `${member.uid}_${userAnswer.questionId}`;
					const memberAnswer = memberAnswersMap.get(key);

					if (memberAnswer && userAnswer.answer === memberAnswer.answer) {
						sharedWith.push(memberAnswer.memberName);
					}
				}

				if (sharedWith.length > 0) {
					// Get question text from the map
					const questionData = questionsMap.get(userAnswer.questionId);
					if (questionData) {
						matchingAnswers.push({
							question: questionData.text,
							answer: userAnswer.answer,
							sharedWith,
							category: userAnswer.category
						});
					}
				}
			}

			// Show 2-3 most recent matches
			similarities = matchingAnswers.slice(0, 3);
		} catch (error) {
			console.error('Error loading similarities:', error);
		} finally {
			loading = false;
		}
	}
</script>

{#if user}
	<div class="rounded-2xl bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center space-x-3">
			<div class="flex-shrink-0">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
					<Users class="h-4 w-4 text-purple-600" />
				</div>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Family Similarities</h3>
				<p class="text-sm text-gray-600">Discover what you have in common</p>
			</div>
		</div>

		{#if loading}
			<!-- Skeleton Loader -->
			<div class="animate-pulse space-y-3">
				{#each Array(3) as _, i}
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div class="flex items-start justify-between">
							<div class="flex-1 space-y-2">
								<div class="h-4 w-3/4 rounded bg-gray-300"></div>
								<div class="h-3 w-1/2 rounded bg-gray-200"></div>
								<div class="flex items-center space-x-2">
									<div class="h-3 w-16 rounded bg-gray-300"></div>
									<div class="h-5 w-20 rounded-full bg-gray-200"></div>
								</div>
							</div>
							<div class="ml-3">
								<div class="h-6 w-16 rounded-full bg-gray-200"></div>
							</div>
						</div>
					</div>
				{/each}
				<div class="pt-2 text-center">
					<div class="mx-auto h-3 w-32 rounded bg-gray-200"></div>
				</div>
			</div>
		{:else if similarities.length === 0}
			<div class="py-8 text-center">
				<Sparkles class="mx-auto mb-3 h-12 w-12 text-gray-400" />
				<p class="text-sm text-gray-500">
					Answer more questions to unlock<br />similarities with your family!
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each similarities as similarity}
					<div
						class="rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4"
					>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<p class="mb-1 text-sm font-medium text-gray-900">
									{similarity.question}
								</p>
								<p class="mb-2 text-sm text-gray-700">
									<span class="font-medium">"{similarity.answer}"</span>
								</p>
								<div class="flex items-center space-x-2">
									<Users class="h-4 w-4 text-purple-600" />
									<span class="text-xs text-purple-700">
										Also chosen by: {similarity.sharedWith.join(', ')}
									</span>
								</div>
							</div>
							<div class="ml-3">
								<span
									class="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800"
								>
									{similarity.category}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
