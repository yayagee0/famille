<script lang="ts">
	import { onMount } from "svelte";
	import { 
		createPoll, 
		sendFeedback, 
		getPersonalizedStoryTemplate, 
		assignBotTurn,
		getAdaptiveEngagementBias,
		getSeasonalSuggestion,
		addToFunFeed,
		trackPollVote,
		addPollSuggestion,
		addFeedbackSuggestion,
		addStorySuggestion,
		// Phase 8: New functions
		generateMemoryNudge,
		awardSeasonalBadge,
		getEnhancedStoryTemplate,
		processStoryWithChoices,
		createCustomPollWizard,
		createCustomPoll
	} from "$lib/smartEngine";
	import { 
		getPreferences, 
		updatePreference, 
		getMostPreferredPollOption,
		getMostPreferredStoryTheme,
		hasStrongPreference,
		type UserPreferences 
	} from "$lib/preferences";
	import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
	import { auth } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';

	type State = "idle" | "greeting" | "suggest" | "action" | "followUp" | "goodbye";

	let state: State = $state("idle");
	let nickname = $state("Friend");
	let suggestionMessage = $state("");
	let suggestions: { label: string; action: () => Promise<void> }[] = $state([]);
	let isLoading = $state(false);
	let userPreferences: UserPreferences | null = $state(null);
	
	// Poll wizard state
	let pollWizardStep: "kind" | "options" | "confirm" | null = $state(null);
	let pollKind: string = $state("");
	let pollOptions: string[] = $state([]);
	let pollQuestion = $state("");
	
	// Story state
	let currentStory = $state("");
	let storyTheme = $state("");
	
	// Feedback wizard state
	let feedbackTopic = $state("");
	let feedbackStep: "topic" | "input" | "confirm" | null = $state(null);
	let feedbackMessage = $state("");
	let feedbackInputType: "text" | "emoji" = $state("text");

	// Phase 8: Enhanced story state with chapters and choices
	let currentStoryTemplate: any = $state(null);
	let currentChapter = $state(0);
	let storyChoices: any = $state(null);
	let storyComplete = $state(false);
	let storyReflection: any = $state(null);

	// Phase 8: Custom poll wizard state
	let customPollStep: "question" | "options" | "review" | null = $state(null);
	let customPollQuestion = $state("");
	let customPollOptions: string[] = $state([]);
	let customPollGuidance: string[] = $state([]);
	let customPollValidated = $state(false);

	// Phase 8: Memory nudges state
	let memoryNudgeMessage = $state("");
	let showMemoryNudge = $state(false);

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

	// Phase 8: Load memory-based nudges with psychology guardrails
	async function loadMemoryNudge() {
		try {
			if (!uid) return;
			
			const nudgeMessage = await generateMemoryNudge(uid);
			if (nudgeMessage) {
				memoryNudgeMessage = nudgeMessage;
				showMemoryNudge = true;
				console.log('[FamilyBot] Generated memory nudge:', nudgeMessage);
			}
		} catch (error) {
			console.error('[FamilyBot] Failed to load memory nudge:', error);
		}
	}

	async function checkForNewBadges() {
		try {
			if (!uid) return;
			
			// Check for badges earned in the last hour
			const recentBadgesQuery = query(
				collection(db, 'users', uid, 'badges'),
				where('notificationSent', '==', false),
				orderBy('earnedAt', 'desc'),
				limit(3)
			);
			
			const recentBadges = await getDocs(recentBadgesQuery);
			
			if (!recentBadges.empty) {
				const badges = recentBadges.docs.map(doc => doc.data());
				
				// Show badge notification
				const badgeNames = badges.map(b => `${b.name} ${b.description.split(' ')[0]}`).join(', ');
				await showFollowUp(`🎉 Congratulations! You earned new badges: ${badgeNames}! Keep up the amazing work!`);
			}
		} catch (error) {
			console.error('[FamilyBot] Failed to check for new badges:', error);
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
				
				state = "goodbye";
				suggestionMessage = `It's ${assignedUserName}'s turn today! 🎉 I want to make sure everyone gets equal time with me.`;
				setTimeout(() => (state = "idle"), 3000);
				return;
			} catch (error) {
				console.error('[FamilyBot] Failed to get assigned user info:', error);
				state = "goodbye";
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

		// Phase 8: Memory-based nudge (highest priority, gentle psychology)
		if (showMemoryNudge && memoryNudgeMessage) {
			baseSuggestions.push({
				label: "💭 Memory nudge",
				action: async () => {
					await showFollowUp(memoryNudgeMessage);
					showMemoryNudge = false; // Reset after showing
				}
			});
		}

		// Seasonal suggestion (high priority if available)
		if (seasonalSuggestion) {
			baseSuggestions.push({
				label: seasonalSuggestion.label,
				action: async () => {
					await showFollowUp(seasonalSuggestion.content);
				}
			});
		}

		// Adaptive suggestions based on engagement level
		if (engagementBias === 'playful') {
			// Low engagement - focus on fun, easy activities
			baseSuggestions.push({
				label: "🎮 Play a quick game",
				action: async () => {
					await showFollowUp("Let's play a quick riddle! What has keys but no locks? A piano! 🎹 Thanks for playing with me!");
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
					await showFollowUp(randomJoke);
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
					await showFollowUp(randomReflection);
				}
			});
			
			baseSuggestions.push({
				label: "📚 Learn something new",
				action: async () => {
					await showFollowUp("Did you know that honeybees communicate by dancing? They do a special wiggle dance to tell other bees where flowers are! What amazing fact would you like to share? 🐝💃");
				}
			});
		}

		// Standard suggestions (always available)
		
		// Phase 8: Enhanced poll creation with custom wizard
		baseSuggestions.push({
			label: "📊 Create a poll",
			action: async () => {
				// Start custom poll wizard
				startCustomPollWizard();
			}
		});

		// Persistent story system
		const preferredTheme = userPreferences ? getMostPreferredStoryTheme(userPreferences) : null;
		let storyLabel = "📖 Tell me a story";
		
		if (preferredTheme && hasStrongPreference(userPreferences!, 'story')) {
			storyLabel = `📖 Tell me a ${preferredTheme} story`;
		}

		baseSuggestions.push({
			label: storyLabel,
			action: async () => {
				// Phase 8: Enhanced story system with chapters and choices
				await startEnhancedStory();
			}
		});

		// Enhanced feedback suggestion
		baseSuggestions.push({
			label: "💬 Share feedback",
			action: async () => {
				// Add feedback suggestion to Fun Feed
				await addFeedbackSuggestion(uid, "Family Hub Experience");
				startFeedbackWizard();
			}
		});

		// Progress tracking suggestion
		baseSuggestions.push({
			label: "🏆 Check my progress",
			action: async () => {
				await showUserProgress();
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
			await showFollowUp("Sorry, something went wrong. Please try again! 😅");
		} finally {
			isLoading = false;
		}
	}

	async function showFollowUp(message: string) {
		suggestionMessage = message;
		state = "followUp";
		suggestions = [
			{
				label: "Yes",
				action: async () => {
					await showSuggestions();
				}
			},
			{
				label: "No",
				action: async () => {
					showGoodbye();
				}
			}
		];
	}

	function showGoodbye() {
		suggestionMessage = "Okay! Goodbye for today 👋";
		state = "goodbye";
		setTimeout(() => (state = "idle"), 2500);
	}

	// Poll Wizard Functions
	function startPollWizard() {
		pollWizardStep = "kind";
		state = "suggest";
		suggestionMessage = "What kind of poll should we create?";
		suggestions = [
			{
				label: "🍽️ Food",
				action: async () => {
					pollKind = "food";
					setPollOptionsForKind("food");
				}
			},
			{
				label: "🎉 Activity",
				action: async () => {
					pollKind = "activity";
					setPollOptionsForKind("activity");
				}
			},
			{
				label: "🎮 Game",
				action: async () => {
					pollKind = "game";
					setPollOptionsForKind("game");
				}
			},
			{
				label: "📝 Custom",
				action: async () => {
					pollKind = "custom";
					setPollOptionsForKind("custom");
				}
			}
		];
	}

	function setPollOptionsForKind(kind: string) {
		pollWizardStep = "confirm";
		
		// Set question and options based on kind
		switch (kind) {
			case "food":
				pollQuestion = "What should we eat?";
				// Bias towards user's preferred food if they have one
				const preferredFood = userPreferences ? getMostPreferredPollOption(userPreferences) : null;
				pollOptions = ["Pasta 🍝", "Pizza 🍕", "Rice 🍚"];
				
				if (preferredFood && hasStrongPreference(userPreferences!, 'poll')) {
					// Reorder to prioritize preferred food
					pollOptions = pollOptions.filter(opt => opt.includes(preferredFood.split(' ')[0]));
					pollOptions = [...pollOptions, ...["Pasta 🍝", "Pizza 🍕", "Rice 🍚"].filter(opt => !pollOptions.includes(opt))];
				}
				break;
			case "activity":
				pollQuestion = "What activity should we do?";
				pollOptions = ["Board games 🎲", "Watch a movie 🎬", "Go for a walk 🚶"];
				break;
			case "game":
				pollQuestion = "What game should we play?";
				pollOptions = ["Trivia 🧠", "Charades 🎭", "Twenty Questions ❓"];
				break;
			case "custom":
				pollQuestion = "What's your choice?";
				pollOptions = ["Option A 🅰️", "Option B 🅱️", "Option C 🅲"];
				break;
		}
		
		state = "suggest";
		suggestionMessage = `Got it! Creating poll: "${pollQuestion}" with options: ${pollOptions.join(', ')}`;
		suggestions = [
			{
				label: "✅ Create this poll",
				action: async () => {
					await createPollFromWizard();
				}
			},
			{
				label: "🔄 Choose different kind",
				action: async () => {
					startPollWizard();
				}
			}
		];
	}

	async function createPollFromWizard() {
		try {
			await createPoll({
				question: pollQuestion,
				options: pollOptions
			});
			
			// Track preference
			if (pollKind !== "custom") {
				await updatePreference(uid, 'poll', pollKind);
			}
			
			// Add to Fun Feed with enhanced metadata
			await addToFunFeed(
				'poll',
				`📊 ${nickname} started a poll: ${pollQuestion}`,
				uid,
				{ pollQuestion }
			);
			
			pollWizardStep = null;
			await showFollowUp("Poll created! Your family can now vote on it. 📊");
			
		} catch (error) {
			console.error('[FamilyBot] Failed to create poll:', error);
			await showFollowUp("Sorry, I couldn't create the poll. Please try again! 😅");
		}
	}

	// Story Functions
	async function startStory() {
		try {
			const story = await getPersonalizedStoryTemplate(uid, userPreferences);
			currentStory = story;
			
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
			
			storyTheme = detectedTheme;
			
			// Track preference
			await updatePreference(uid, 'story', detectedTheme);
			
			// Add to Fun Feed with enhanced metadata (include first sentence as preview)
			const storyPreview = currentStory.split('.')[0] + '.' || currentStory.substring(0, 50) + '...';
			await addToFunFeed(
				'story',
				`📖 FamilyBot told a story about ${detectedTheme}`,
				uid,
				{ storyPreview }
			);
			
			showStoryOptions();
			
		} catch (error) {
			console.error('[FamilyBot] Failed to get story:', error);
			await showFollowUp("Sorry, I couldn't get a story right now. Please try again! 😅");
		}
	}

	function showStoryOptions() {
		state = "suggest";
		suggestionMessage = currentStory;
		suggestions = [
			{
				label: "➡️ Continue story",
				action: async () => {
					// Get next part of story (simplified - just show encouragement)
					currentStory += " And they lived happily, knowing that kindness brings the greatest joy! ✨";
					showStoryOptions();
				}
			},
			{
				label: "🔄 Another story",
				action: async () => {
					await startStory();
				}
			},
			{
				label: "❌ End story",
				action: async () => {
					currentStory = "";
					await showFollowUp("Thanks for enjoying the story with me! 📚");
				}
			}
		];
	}

	// Feedback Wizard Functions
	function startFeedbackWizard() {
		feedbackStep = "topic";
		state = "suggest";
		suggestionMessage = "What is your feedback about?";
		suggestions = [
			{
				label: "🏠 Family Hub",
				action: async () => {
					feedbackTopic = "Family Hub Experience";
					showFeedbackInput();
				}
			},
			{
				label: "🤖 FamilyBot",
				action: async () => {
					feedbackTopic = "FamilyBot Interaction";
					showFeedbackInput();
				}
			},
			{
				label: "📖 Stories",
				action: async () => {
					feedbackTopic = "Story & Content";
					showFeedbackInput();
				}
			},
			{
				label: "💡 General",
				action: async () => {
					feedbackTopic = "General Suggestion";
					showFeedbackInput();
				}
			}
		];
	}

	function showFeedbackInput() {
		feedbackStep = "input";
		state = "suggest";
		suggestionMessage = `Great! What would you like to share about ${feedbackTopic}?`;
		suggestions = [
			{
				label: "✍️ Type my message",
				action: async () => {
					feedbackInputType = "text";
					showFeedbackTextInput();
				}
			},
			{
				label: "👍 It's great!",
				action: async () => {
					feedbackMessage = "👍 It's great!";
					showFeedbackConfirmation();
				}
			},
			{
				label: "❤️ I love it!",
				action: async () => {
					feedbackMessage = "❤️ I love it!";
					showFeedbackConfirmation();
				}
			},
			{
				label: "😄 It's fun!",
				action: async () => {
					feedbackMessage = "😄 It's fun!";
					showFeedbackConfirmation();
				}
			},
			{
				label: "🤔 Could be better",
				action: async () => {
					feedbackMessage = "🤔 Could be better";
					showFeedbackConfirmation();
				}
			}
		];
	}

	function showFeedbackTextInput() {
		// For now, use a simple prompt - in a real implementation this would be a textarea
		const userInput = prompt("Please type your feedback:");
		if (userInput && userInput.trim()) {
			feedbackMessage = userInput.trim();
			showFeedbackConfirmation();
		} else {
			// Go back to input selection
			showFeedbackInput();
		}
	}

	function showFeedbackConfirmation() {
		feedbackStep = "confirm";
		state = "suggest";
		suggestionMessage = `Perfect! Your feedback: "${feedbackMessage}"`;
		suggestions = [
			{
				label: "✅ Send feedback",
				action: async () => {
					await submitFeedback();
				}
			},
			{
				label: "✏️ Edit message",
				action: async () => {
					showFeedbackInput();
				}
			},
			{
				label: "🔄 Change topic",
				action: async () => {
					startFeedbackWizard();
				}
			}
		];
	}

	async function submitFeedback() {
		try {
			await sendFeedback(uid, feedbackMessage, feedbackTopic);
			await updatePreference(uid, 'feedback');
			
			// Add to Fun Feed with enhanced metadata
			await addToFunFeed(
				'feedback',
				`💡 Feedback from ${nickname}: ${feedbackMessage}`,
				uid,
				{ feedbackTopic }
			);
			
			// Reset feedback state
			feedbackTopic = "";
			feedbackMessage = "";
			feedbackStep = null;
			feedbackInputType = "text";
			
			await showFollowUp(`Thanks ${nickname}! Your feedback has been sent ✅`);
			
		} catch (error) {
			console.error('[FamilyBot] Failed to send feedback:', error);
			await showFollowUp("Sorry, I couldn't send your feedback. Please try again! 😅");
		}
	}

	async function showUserProgress() {
		try {
			// Get user's badge counters
			const countersDoc = await getDoc(doc(db, 'user_badge_counters', uid));
			
			if (!countersDoc.exists()) {
				await showFollowUp("🌟 You're just getting started! Create polls, read stories, and share feedback to earn badges! Keep exploring!");
				return;
			}
			
			const counters = countersDoc.data();
			
			// Phase 6: Show both common and legendary progress
			const progressText = `📊 Your Progress:

🧭 Polls Created: ${counters.pollsCreated}/10 → 🌍 ${counters.pollsCreated}/50 (Explorer Master)
📖 Stories Read: ${counters.storiesRead}/10 → 📚 ${counters.storiesRead}/100 (Epic Storyteller)
💡 Feedback Sent: ${counters.feedbackSubmitted}/5 → 🏆 ${counters.feedbackSubmitted}/25 (Feedback Champion)
🤝 Poll Votes: ${counters.pollVotes}/20 → 👑 ${counters.pollVotes}/100 (Family Leader)
🌙 Islamic Stories: ${counters.islamicStoriesRead}/10 → 🌌 ${counters.islamicStoriesRead}/50 (Knowledge Guardian)
🔥 Current Streak: ${counters.consecutiveDays}/7 → 🔥✨ ${counters.consecutiveDays}/30 (Eternal Flame)`;
			
			// Phase 6: Add analytics-based motivational nudge
			const { SmartEngine } = await import('$lib/smartEngine');
			const motivationalNudge = await SmartEngine.generateAnalyticsBasedNudge(uid);
			
			if (motivationalNudge) {
				await showFollowUp(`${progressText}

${motivationalNudge}`);
			} else {
				await showFollowUp(progressText);
			}
			
		} catch (error) {
			console.error('[FamilyBot] Failed to show user progress:', error);
			await showFollowUp("Sorry, I couldn't load your progress right now. Please try again! 😅");
		}
	}

	// Phase 8: Enhanced Story System with Chapters and Choices
	async function startEnhancedStory() {
		try {
			const storyTemplate = await getEnhancedStoryTemplate();
			if (!storyTemplate) {
				await showFollowUp("Sorry, I couldn't find any stories right now. Please try again! 📖");
				return;
			}

			currentStoryTemplate = storyTemplate;
			currentChapter = 0;
			storyComplete = false;
			storyReflection = null;

			// Process first chapter
			const result = await processStoryWithChoices(storyTemplate, uid, 0);
			currentStory = result.content;
			storyChoices = result.choice;
			storyComplete = result.isComplete;
			storyReflection = result.reflection;

			// Show story with appropriate UI
			await showStoryChapter();

		} catch (error) {
			console.error('[FamilyBot] Failed to start enhanced story:', error);
			await showFollowUp("Sorry, something went wrong with the story. Please try again! 😅");
		}
	}

	async function showStoryChapter() {
		let storyMessage = currentStory;

		if (storyChoices) {
			// Add choice options
			storyMessage += `\n\n${storyChoices.question}`;
			
			// Show story with choices
			state = "action";
			suggestionMessage = storyMessage;
			suggestions = storyChoices.options.map((option: any, index: number) => ({
				label: `${option.emoji} ${option.text}`,
				action: async () => {
					await handleStoryChoice(index);
				}
			}));
		} else if (storyComplete && storyReflection) {
			// Show reflection
			storyMessage += `\n\n✨ Reflection: ${storyReflection.question}\n\n"${storyReflection.ayah}" - ${storyReflection.reference}`;
			await showFollowUp(storyMessage);
		} else if (!storyComplete) {
			// Continue story
			state = "action";
			suggestionMessage = storyMessage;
			suggestions = [
				{
					label: "➡️ Continue story",
					action: async () => {
						await continueStory();
					}
				},
				{
					label: "🔄 Different story",
					action: async () => {
						await startEnhancedStory();
					}
				},
				{
					label: "❌ End story",
					action: async () => {
						await showFollowUp("Thanks for reading with me! Stories help us learn and grow together. 📖✨");
					}
				}
			];
		} else {
			// Story complete
			await showFollowUp(storyMessage);
		}
	}

	async function handleStoryChoice(choiceIndex: number) {
		try {
			if (!currentStoryTemplate) return;

			// Process choice
			const result = await processStoryWithChoices(currentStoryTemplate, uid, currentChapter, choiceIndex);
			currentStory = result.content;
			storyChoices = result.choice;
			storyComplete = result.isComplete;
			storyReflection = result.reflection;
			currentChapter++;

			// Show next chapter
			await showStoryChapter();

		} catch (error) {
			console.error('[FamilyBot] Failed to handle story choice:', error);
			await showFollowUp("Sorry, something went wrong. Let's try a different story! 😅");
		}
	}

	async function continueStory() {
		try {
			if (!currentStoryTemplate) return;

			currentChapter++;
			const result = await processStoryWithChoices(currentStoryTemplate, uid, currentChapter);
			currentStory = result.content;
			storyChoices = result.choice;
			storyComplete = result.isComplete;
			storyReflection = result.reflection;

			await showStoryChapter();

		} catch (error) {
			console.error('[FamilyBot] Failed to continue story:', error);
			await showFollowUp("The story adventure ends here! Thanks for reading with me 📖✨");
		}
	}

	// Phase 8: Custom Poll Wizard with Psychology Guardrails
	async function startCustomPollWizard() {
		customPollStep = "question";
		customPollQuestion = "";
		customPollOptions = [];
		customPollGuidance = [];
		customPollValidated = false;

		state = "action";
		suggestionMessage = "Let's create a custom poll! What question would you like to ask your family? 📊";
		suggestions = [
			{
				label: "🍽️ Food question",
				action: async () => {
					customPollQuestion = "What should we have for dinner tonight?";
					await validateCustomPoll();
				}
			},
			{
				label: "🎉 Activity question", 
				action: async () => {
					customPollQuestion = "What should we do this weekend?";
					await validateCustomPoll();
				}
			},
			{
				label: "🎮 Game question",
				action: async () => {
					customPollQuestion = "Which game should we play together?";
					await validateCustomPoll();
				}
			},
			{
				label: "✏️ Write my own",
				action: async () => {
					await promptCustomQuestion();
				}
			}
		];
	}

	async function promptCustomQuestion() {
		// In a real implementation, this would open a text input
		// For now, provide helpful guidance
		await showFollowUp(`💡 Great! Here are some tips for good poll questions:

✅ Keep it family-friendly and positive
✅ Make it fun and engaging  
✅ Ask about choices everyone can participate in
✅ Avoid words like "worst" or "hate"

Examples:
• "What's our next family movie night pick?"
• "Which treats should we make this weekend?"
• "What new activity should we try together?"

Try asking me with one of the suggested categories! 😊`);
	}

	async function validateCustomPoll() {
		try {
			const validation = await createCustomPollWizard(uid, customPollQuestion, customPollOptions);
			
			customPollGuidance = validation.guidance;
			customPollValidated = validation.validated && validation.childFriendly;

			if (customPollValidated) {
				// Show suggested options
				customPollStep = "options";
				state = "action";
				suggestionMessage = `Great question! "${customPollQuestion}"

Here are some suggested options:`;
				
				suggestions = validation.suggestedOptions.slice(0, 4).map(option => ({
					label: option,
					action: async () => {
						if (customPollOptions.length < 4) {
							customPollOptions.push(option);
							await updatePollOptions();
						}
					}
				}));

				suggestions.push({
					label: "✅ Create poll",
					action: async () => {
						await finalizeCustomPoll();
					}
				});

			} else {
				// Show guidance for improvement
				await showFollowUp(`Let's make that question even better! 

${customPollGuidance.join('\n')}

Would you like to try a different question? 😊`);
			}

		} catch (error) {
			console.error('[FamilyBot] Failed to validate custom poll:', error);
			await showFollowUp("Let's try a simpler poll question! 😊");
		}
	}

	async function updatePollOptions() {
		state = "action";
		suggestionMessage = `Poll question: "${customPollQuestion}"

Current options: ${customPollOptions.join(', ')}

${customPollOptions.length >= 2 ? 'You can create the poll now or add more options!' : 'Add at least one more option to create the poll.'}`;

		suggestions = [
			{
				label: "✅ Create poll now",
				action: async () => {
					await finalizeCustomPoll();
				}
			}
		];

		if (customPollOptions.length < 4) {
			suggestions.push({
				label: "➕ Add another option",
				action: async () => {
					// In real implementation, would prompt for custom option
					await showFollowUp("Great! You can add more options to make your poll even better! 🎯");
				}
			});
		}
	}

	async function finalizeCustomPoll() {
		try {
			if (customPollOptions.length < 2) {
				// Add default options if needed
				customPollOptions = ["Option A 🅰️", "Option B 🅱️"];
			}

			const result = await createCustomPoll(uid, customPollQuestion, customPollOptions);
			
			if (result.success) {
				await showFollowUp(`🎉 Amazing! Your poll "${customPollQuestion}" has been created! Your family can now vote on it. Thanks for being creative! 📊✨`);
				
				// Award seasonal badge if appropriate
				await awardSeasonalBadge(uid, 'celebrate_birthday'); // Example action
			} else {
				await showFollowUp(`${result.guidance?.join('\n') || "Let's try creating a different poll! 😊"}`);
			}

		} catch (error) {
			console.error('[FamilyBot] Failed to finalize custom poll:', error);
			await showFollowUp("Something went wrong creating your poll. Let's try again! 😊");
		}
	}

	function closeBot() {
		// Reset all wizard states including Phase 8
		pollWizardStep = null;
		pollKind = "";
		pollOptions = [];
		pollQuestion = "";
		currentStory = "";
		storyTheme = "";
		feedbackTopic = "";
		feedbackMessage = "";
		feedbackStep = null;
		feedbackInputType = "text";
		
		// Phase 8: Reset enhanced states
		currentStoryTemplate = null;
		currentChapter = 0;
		storyChoices = null;
		storyComplete = false;
		storyReflection = null;
		customPollStep = null;
		customPollQuestion = "";
		customPollOptions = [];
		customPollGuidance = [];
		customPollValidated = false;
		memoryNudgeMessage = "";
		showMemoryNudge = false;
		
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
			checkForNewBadges();
			loadMemoryNudge(); // Phase 8: Load memory nudges
		}
	});

	// Update nickname and preferences when user changes
	$effect(() => {
		if (currentUser) {
			loadNickname();
			loadUserPreferences();
			loadMemoryNudge(); // Phase 8: Load memory nudges when user changes
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
			
			{#if state === "followUp"}
				<div class="message" style="margin-top: 1rem; color: #6b7280; font-size: 0.85rem;">
					Would you like me to help with something else?
				</div>
				{#each suggestions as s}
					<button onclick={() => handleAction(s.action)} disabled={isLoading}>
						{s.label}
					</button>
				{/each}
			{/if}
			
			{#if state === "suggest" || state === "followUp" || state === "goodbye"}
				<button class="close-button" onclick={closeBot}>
					{state === "goodbye" ? "Thanks!" : "Close"}
				</button>
			{/if}
		{/if}
	</div>
{/if}