<script lang="ts">
	import { onMount } from "svelte";
	import { 
		createPoll, 
		sendFeedback, 
		getPersonalizedStoryTemplate, 
		assignBotTurn,
		getAdaptiveEngagementBias,
		getSeasonalSuggestion
	} from "$lib/smartEngine";
	import { 
		getPreferences, 
		updatePreference, 
		getMostPreferredPollOption,
		getMostPreferredStoryTheme,
		hasStrongPreference,
		type UserPreferences 
	} from "$lib/preferences";
	import { getFirestore, doc, getDoc } from "firebase/firestore";
	import { auth } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';

	type State = "idle" | "greeting" | "suggest" | "action" | "close";

	let state: State = $state("idle");
	let nickname = $state("Friend");
	let suggestionMessage = $state("");
	let suggestions: { label: string; action: () => Promise<void> }[] = $state([]);
	let isLoading = $state(false);
	let userPreferences: UserPreferences | null = $state(null);

	const db = getFirestore();

	// Get current user from auth using derived
	const currentUser = $derived(auth.currentUser);
	const uid = $derived(currentUser?.uid || "");

	async function loadNickname() {
		try {
			if (!currentUser?.email) return;
			
			// Use the same getDisplayName helper used throughout the app
			nickname = getDisplayName(currentUser.email);
		} catch (e) {
			console.error("Failed to load nickname:", e);
			nickname = "Friend";
		}
	}

	async function loadUserPreferences() {
		try {
			if (!uid) return;
			
			userPreferences = await getPreferences(uid);
			console.log('[FamilyBot] Loaded user preferences:', userPreferences);
		} catch (error) {
			console.error('[FamilyBot] Failed to load preferences:', error);
		}
	}

	async function startInteraction() {
		// Check fairness - ensure this user gets appropriate interaction opportunity
		const assignedUid = await assignBotTurn(uid);
		
		if (assignedUid !== uid) {
			// Another user should get priority - show fairness transparency message
			try {
				// Get assigned user's display name for transparency
				const assignedUserDoc = await getDoc(doc(db, 'users', assignedUid));
				let assignedUserName = 'Someone else';
				
				if (assignedUserDoc.exists()) {
					const userData = assignedUserDoc.data();
					assignedUserName = getDisplayName(userData.email, { nickname: userData.nickname });
				}
				
				state = "close";
				suggestionMessage = `It's ${assignedUserName}'s turn today! 🎉 I want to make sure everyone gets equal time with me.`;
				setTimeout(() => (state = "idle"), 3000);
				return;
			} catch (error) {
				console.error('[FamilyBot] Failed to get assigned user info:', error);
				state = "close";
				suggestionMessage = `It's someone else's turn today! 🎉 I want to make sure everyone gets equal time with me.`;
				setTimeout(() => (state = "idle"), 3000);
				return;
			}
		}

		state = "greeting";
		suggestionMessage = `Hello ${nickname}! 👋 I can help you today.`;
		setTimeout(() => showSuggestions(), 1200);
	}

	async function showSuggestions() {
		state = "suggest";
		
		// Get adaptive engagement bias and seasonal content
		const [engagementBias, seasonalSuggestion] = await Promise.all([
			getAdaptiveEngagementBias(uid),
			getSeasonalSuggestion()
		]);
		
		// Create personalized suggestions based on preferences and engagement
		const baseSuggestions = [];

		// Seasonal suggestion (highest priority if available)
		if (seasonalSuggestion) {
			baseSuggestions.push({
				label: seasonalSuggestion.label,
				action: async () => {
					finish(seasonalSuggestion.content);
				}
			});
		}

		// Adaptive suggestions based on engagement level
		if (engagementBias === 'playful') {
			// Low engagement - focus on fun, easy activities
			baseSuggestions.push({
				label: "🎮 Play a quick game",
				action: async () => {
					finish("Let's play a quick riddle! What has keys but no locks? A piano! 🎹 Thanks for playing with me!");
				}
			});
			
			baseSuggestions.push({
				label: "😄 Tell me a joke",
				action: async () => {
					const jokes = [
						"Why don't scientists trust atoms? Because they make up everything! 😂",
						"What do you call a sleeping bull? A bulldozer! 🐂💤",
						"Why did the math book look so sad? Because it had too many problems! 📚😢"
					];
					const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
					finish(randomJoke);
				}
			});
		} else if (engagementBias === 'deeper') {
			// High engagement - focus on reflection and learning
			baseSuggestions.push({
				label: "🤔 Share a reflection",
				action: async () => {
					const reflections = [
						"Take a moment to think about something kind you did today. How did it make you feel? ✨",
						"What's one thing you're grateful for right now? Gratitude makes our hearts grow stronger. 🙏",
						"If you could teach someone younger one important lesson, what would it be? 💭"
					];
					const randomReflection = reflections[Math.floor(Math.random() * reflections.length)];
					finish(randomReflection);
				}
			});
			
			baseSuggestions.push({
				label: "📚 Learn something new",
				action: async () => {
					finish("Did you know that honeybees communicate by dancing? They do a special wiggle dance to tell other bees where flowers are! What amazing fact would you like to share? 🐝💃");
				}
			});
		}

		// Standard suggestions (always available)
		
		// Lunch poll - bias towards user's preferred food if they have one
		const preferredFood = userPreferences ? getMostPreferredPollOption(userPreferences) : null;
		let pollOptions = ["Pasta 🍝", "Pizza 🍕", "Rice 🍚"];
		
		if (preferredFood && hasStrongPreference(userPreferences!, 'poll')) {
			// Reorder to prioritize preferred food
			pollOptions = pollOptions.filter(opt => opt.includes(preferredFood.split(' ')[0]));
			pollOptions = [...pollOptions, ...["Pasta 🍝", "Pizza 🍕", "Rice 🍚"].filter(opt => !pollOptions.includes(opt))];
		}

		baseSuggestions.push({
			label: "🍝 Create a lunch poll",
			action: async () => {
				const selectedOption = pollOptions[0]; // Use first (preferred) option
				await createPoll({
					question: "What should we eat for lunch?",
					options: pollOptions
				});
				
				// Track preference
				const foodType = selectedOption.split(' ')[0].toLowerCase(); // Extract "pasta", "pizza", etc.
				await updatePreference(uid, 'poll', foodType);
				
				finish("I've created a lunch poll for the family!");
			}
		});

		// Story suggestion - bias towards preferred themes
		const preferredTheme = userPreferences ? getMostPreferredStoryTheme(userPreferences) : null;
		let storyLabel = "📖 Tell me a story";
		
		if (preferredTheme && hasStrongPreference(userPreferences!, 'story')) {
			storyLabel = `📖 Tell me a ${preferredTheme} story`;
		}

		baseSuggestions.push({
			label: storyLabel,
			action: async () => {
				const story = await getPersonalizedStoryTemplate(uid, userPreferences);
				
				// Extract theme from story content for preference tracking
				let detectedTheme = 'adventure'; // default
				if (story.includes('family') || story.includes('brother') || story.includes('sister')) {
					detectedTheme = 'family';
				} else if (story.includes('wise') || story.includes('learn') || story.includes('teach')) {
					detectedTheme = 'wisdom';
				} else if (story.includes('magical') || story.includes('magic')) {
					detectedTheme = 'fantasy';
				} else if (story.includes('mosque') || story.includes('Allah') || story.includes('Quran')) {
					detectedTheme = 'islamic';
				}
				
				// Track preference
				await updatePreference(uid, 'story', detectedTheme);
				
				finish(story);
			}
		});

		// Feedback suggestion
		baseSuggestions.push({
			label: "💬 Share feedback",
			action: async () => {
				// Ask user for feedback topic first
				state = "suggest";
				suggestionMessage = "What would you like to share feedback about?";
				
				// Show topic options
				suggestions = [
					{
						label: "🏠 Family Hub Experience",
						action: async () => {
							const feedbackMessage = `Family Hub feedback from ${nickname}: Thanks for the great family experience!`;
							await sendFeedback(uid, feedbackMessage, 'Family Hub Experience');
							await updatePreference(uid, 'feedback');
							finish("Thank you for your Family Hub feedback! It helps make our platform better. 🙏");
						}
					},
					{
						label: "🤖 FamilyBot Interaction",
						action: async () => {
							const feedbackMessage = `FamilyBot feedback from ${nickname}: I enjoyed talking with the bot!`;
							await sendFeedback(uid, feedbackMessage, 'FamilyBot Interaction');
							await updatePreference(uid, 'feedback');
							finish("Thank you for your FamilyBot feedback! I'll keep learning to help better. 🤖💙");
						}
					},
					{
						label: "📖 Story & Content",
						action: async () => {
							const feedbackMessage = `Content feedback from ${nickname}: The stories are wonderful!`;
							await sendFeedback(uid, feedbackMessage, 'Story & Content');
							await updatePreference(uid, 'feedback');
							finish("Thank you for your content feedback! I'll share more great stories. 📚✨");
						}
					},
					{
						label: "💡 General Suggestion",
						action: async () => {
							const feedbackMessage = `General suggestion from ${nickname}: Keep up the great work!`;
							await sendFeedback(uid, feedbackMessage, 'General Suggestion');
							await updatePreference(uid, 'feedback');
							finish("Thank you for your suggestion! Every idea helps us improve. 💡");
						}
					}
				];
			}
		});

		// Limit suggestions to 4 max for better UX
		suggestions = baseSuggestions.slice(0, 4);
	}

	async function handleAction(fn: () => Promise<void>) {
		if (isLoading) return;
		
		state = "action";
		isLoading = true;
		
		try {
			await fn();
		} catch (error) {
			console.error("FamilyBot action failed:", error);
			finish("Sorry, something went wrong. Please try again! 😅");
		} finally {
			isLoading = false;
		}
	}

	function finish(message: string) {
		suggestionMessage = message;
		state = "close";
		setTimeout(() => (state = "idle"), 2500);
	}

	function closeBot() {
		state = "idle";
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			startInteraction();
		}
	}

	onMount(() => {
		if (currentUser) {
			loadNickname();
			loadUserPreferences();
		}
	});

	// Update nickname and preferences when user changes
	$effect(() => {
		if (currentUser) {
			loadNickname();
			loadUserPreferences();
		}
	});
</script>

<style>
	.bot-button {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: #4f46e5;
		border-radius: 50%;
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		animation: bounce 3s infinite;
		color: white;
		font-size: 2rem;
		box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		z-index: 1000;
		transition: transform 0.2s ease;
	}
	
	.bot-button:hover {
		transform: scale(1.05);
	}
	
	.panel {
		position: fixed;
		bottom: 5rem;
		right: 1rem;
		background: white;
		border-radius: 1rem;
		padding: 1rem;
		width: 260px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		z-index: 1000;
		border: 1px solid #e5e7eb;
	}
	
	.panel button {
		display: block;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background: #f3f4f6;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
		text-align: left;
	}
	
	.panel button:hover {
		background: #e5e7eb;
	}
	
	.panel button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.close-button {
		background: #ef4444 !important;
		color: white;
		text-align: center !important;
		margin-top: 0.75rem;
	}
	
	.close-button:hover {
		background: #dc2626 !important;
	}
	
	.message {
		font-size: 0.9rem;
		line-height: 1.4;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		color: #6b7280;
	}
	
	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #4f46e5;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}
	
	@keyframes bounce {
		0%, 100% { 
			transform: translateY(0); 
		}
		50% { 
			transform: translateY(-5px); 
		}
	}
	
	@keyframes spin {
		0% { 
			transform: rotate(0deg); 
		}
		100% { 
			transform: rotate(360deg); 
		}
	}
</style>

<!-- Floating Bot Button -->
{#if state === "idle"}
	<div 
		class="bot-button" 
		onclick={startInteraction} 
		onkeydown={handleKeydown}
		role="button" 
		tabindex="0"
		aria-label="Open FamilyBot assistant"
	>
		🤖
	</div>
{/if}

<!-- Bot Panel -->
{#if state !== "idle"}
	<div class="panel">
		{#if state === "action" && isLoading}
			<div class="loading">
				<div class="loading-spinner"></div>
				<span>Working on it...</span>
			</div>
		{:else}
			<div class="message">{suggestionMessage}</div>
			
			{#if state === "suggest"}
				{#each suggestions as s}
					<button onclick={() => handleAction(s.action)} disabled={isLoading}>
						{s.label}
					</button>
				{/each}
			{/if}
			
			{#if state === "suggest" || state === "close"}
				<button class="close-button" onclick={closeBot}>
					{state === "close" ? "Thanks!" : "Close"}
				</button>
			{/if}
		{/if}
	</div>
{/if}