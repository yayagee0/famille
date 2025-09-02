<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db, getFamilyId } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
	import { Users, Sparkles } from 'lucide-svelte';

	let user = $state(auth.currentUser);
	let similarities = $state<Array<{ 
		question: string; 
		answer: string; 
		sharedWith: string[];
		category: string;
	}>>([]);
	let loading = $state(true);

	onMount(async () => {
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
			const familyId = getFamilyId();
			
			// Get current user's answers
			const userAnswersQuery = query(
				collection(db, 'userAnswers', user.uid, 'answers')
			);
			const userAnswersSnapshot = await getDocs(userAnswersQuery);
			const userAnswers = userAnswersSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			// Get all family members' UIDs (from allowlist or users collection)
			const usersQuery = query(collection(db, 'users'));
			const usersSnapshot = await getDocs(usersQuery);
			const familyMembers = usersSnapshot.docs
				.map(doc => ({ uid: doc.id, ...doc.data() }))
				.filter((member: any) => member.uid !== user.uid);

			const matchingAnswers: Array<{
				question: string;
				answer: string;
				sharedWith: string[];
				category: string;
			}> = [];

			// Compare answers with each family member
			for (const userAnswer of userAnswers) {
				const sharedWith: string[] = [];
				
				for (const member of familyMembers) {
					const memberAnswersQuery = query(
						collection(db, 'userAnswers', member.uid, 'answers'),
						where('questionId', '==', userAnswer.questionId)
					);
					const memberAnswersSnapshot = await getDocs(memberAnswersQuery);
					
					for (const memberAnswerDoc of memberAnswersSnapshot.docs) {
						const memberAnswer = memberAnswerDoc.data();
						
						// Compare answers - exact match for custom answers, otherwise direct comparison
						if (userAnswer.answer === memberAnswer.answer) {
							sharedWith.push(member.displayName || member.email?.split('@')[0] || 'Family Member');
						}
					}
				}

				if (sharedWith.length > 0) {
					// Get question text for display
					const questionDoc = await getDoc(doc(db, 'questions', userAnswer.questionId));
					if (questionDoc.exists()) {
						const questionData = questionDoc.data();
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
	<div class="rounded-2xl bg-white shadow-sm p-6">
		<div class="flex items-center space-x-3 mb-4">
			<div class="flex-shrink-0">
				<div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
					<Users class="w-4 h-4 text-purple-600" />
				</div>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Family Similarities</h3>
				<p class="text-sm text-gray-600">Discover what you have in common</p>
			</div>
		</div>

		{#if loading}
			<div class="animate-pulse space-y-3">
				{#each Array(2) as _}
					<div class="h-16 bg-gray-200 rounded-lg"></div>
				{/each}
			</div>
		{:else if similarities.length === 0}
			<div class="text-center py-8">
				<Sparkles class="mx-auto h-12 w-12 text-gray-400 mb-3" />
				<p class="text-gray-500 text-sm">
					Answer more questions to unlock<br />similarities with your family! 
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each similarities as similarity}
					<div class="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900 mb-1">
									{similarity.question}
								</p>
								<p class="text-sm text-gray-700 mb-2">
									<span class="font-medium">"{similarity.answer}"</span>
								</p>
								<div class="flex items-center space-x-2">
									<Users class="w-4 h-4 text-purple-600" />
									<span class="text-xs text-purple-700">
										Also chosen by: {similarity.sharedWith.join(', ')}
									</span>
								</div>
							</div>
							<div class="ml-3">
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
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