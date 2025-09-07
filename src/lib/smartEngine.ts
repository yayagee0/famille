/**
 * Smart Engine Core Logic
 *
 * Handles:
 * - Daily nudge generation (exactly one per child per day)
 * - Trait-based personalization with round-robin rotation
 * - Islamic progression (lowest-ID unanswered questions)
 * - Template merging ({{trait}}, {{ayah}}, {{character}} replacement)
 * - Badge earning and notifications
 * - Weekly feedback management
 */

import {
	collection,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	addDoc,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	serverTimestamp,
	Timestamp
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { getFamilyId } from '$lib/firebase';
import { islamicQuestions } from '$lib/data/islamicQuestions';
import {
	nudgeTemplates,
	characters,
	identityTraits,
	badgeTemplates,
	type NudgeTemplate,
	type Character,
	type IdentityTrait,
	type BadgeTemplate
} from '$lib/data/smartEngine';
import { seasonalNudgeTemplates } from '$lib/data/seasonal';
import { pollTemplates, type DailyPoll, type PollTemplate } from '$lib/data/polls';
import {
	getCurrentSeasonalConfig,
	getCurrentSeasonalBanners,
	type SeasonalBanner
} from '$lib/data/seasonal';
import { AnalyticsEngine, type DailyAnalytics, type UserDailyMetrics } from '$lib/data/analytics';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserNudge {
	id?: string;
	userId: string;
	templateId: string;
	generatedText: string;
	character: string;
	traits: string[];
	islamicContext?: {
		ayah: string;
		reference: string;
	};
	createdAt: Timestamp;
	readAt?: Timestamp;
	type: 'positive' | 'bonding' | 'constructive' | 'reflection' | 'islamic' | 'personalized';
}

export interface UserTraits {
	userId: string;
	traits: string[];
	currentRotationIndex: number;
	lastRotationDate: Timestamp;
	customTraits?: string[]; // Parent-added traits
	updatedAt: Timestamp;
}

export interface IslamicProgress {
	userId: string;
	answeredQuestions: string[];
	currentQuestionId?: string;
	lastAnsweredAt?: Timestamp;
	totalCorrect: number;
	streak: number;
	updatedAt: Timestamp;
}

export interface WeeklyFeedback {
	id?: string;
	userId: string;
	weekStart: Timestamp;
	questions: {
		text: string;
		type: 'reflection' | 'goal' | 'gratitude' | 'challenge';
	}[];
	answers?: Record<string, string>;
	answeredAt?: Timestamp;
	createdAt: Timestamp;
	isPersistent: boolean; // Cannot be dismissed until answered
}

export interface UserBadge {
	id?: string;
	userId: string;
	badgeId: string;
	earnedAt: Timestamp;
	notificationSent: boolean;
}

export interface DailyPoll {
	id?: string;
	question: string;
	options: string[];
	votes: Record<string, string>; // userId -> optionIndex
	createdAt: Timestamp;
	closesAt: Timestamp;
	isClosed: boolean;
	resultsPosted: boolean;
	familyId: string;
}

// ============================================================================
// SMART ENGINE CORE
// ============================================================================

export class SmartEngine {
	/**
	 * Generate exactly one daily nudge for a user
	 */
	static async generateDailyNudge(userId: string): Promise<UserNudge | null> {
		try {
			// Check if user already has a nudge for today
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const existingNudgeQuery = query(
				collection(db, 'users', userId, 'nudges'),
				where('createdAt', '>=', Timestamp.fromDate(today)),
				where('createdAt', '<', Timestamp.fromDate(tomorrow)),
				limit(1)
			);

			const existingNudges = await getDocs(existingNudgeQuery);
			if (!existingNudges.empty) {
				console.log(`[SmartEngine] User ${userId} already has a nudge for today`);
				return null; // Already has today's nudge
			}

			// Get user traits and Islamic progress
			const [userTraits, islamicProgress] = await Promise.all([
				this.getUserTraits(userId),
				this.getIslamicProgress(userId)
			]);

			// Select appropriate nudge template
			const selectedTemplate = this.selectNudgeTemplateEnhanced(userTraits, userId);
			if (!selectedTemplate) {
				console.error('[SmartEngine] No suitable template found');
				return null;
			}

			// Generate the nudge
			const nudge = await this.generateNudgeFromTemplate(
				userId,
				selectedTemplate,
				userTraits,
				islamicProgress
			);

			if (nudge) {
				// Save to Firestore
				const nudgeRef = await addDoc(collection(db, 'users', userId, 'nudges'), nudge);
				console.log(`[SmartEngine] Generated daily nudge for user ${userId}: ${nudgeRef.id}`);

				// Update trait rotation if needed
				await this.updateTraitRotation(userId, userTraits);

				return { ...nudge, id: nudgeRef.id };
			}

			return null;
		} catch (error) {
			console.error('[SmartEngine] Failed to generate daily nudge:', error);
			return null;
		}
	}

	/**
	 * Get or initialize user traits
	 */
	static async getUserTraits(userId: string): Promise<UserTraits> {
		try {
			const traitsDoc = await getDoc(doc(db, 'identity_traits', userId));

			if (traitsDoc.exists()) {
				return traitsDoc.data() as UserTraits;
			} else {
				// Initialize with default traits
				const defaultTraits: UserTraits = {
					userId,
					traits: ['curious', 'kind_heart', 'loves_stories'], // Default starter traits
					currentRotationIndex: 0,
					lastRotationDate: Timestamp.now(),
					updatedAt: Timestamp.now()
				};

				await setDoc(doc(db, 'identity_traits', userId), defaultTraits);
				return defaultTraits;
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to get user traits:', error);
			// Return minimal default
			return {
				userId,
				traits: ['curious'],
				currentRotationIndex: 0,
				lastRotationDate: Timestamp.now(),
				updatedAt: Timestamp.now()
			};
		}
	}

	/**
	 * Get or initialize Islamic progress
	 */
	static async getIslamicProgress(userId: string): Promise<IslamicProgress> {
		try {
			const progressDoc = await getDoc(doc(db, 'islamic_identity', userId));

			if (progressDoc.exists()) {
				return progressDoc.data() as IslamicProgress;
			} else {
				// Initialize new progress
				const defaultProgress: IslamicProgress = {
					userId,
					answeredQuestions: [],
					currentQuestionId: this.getNextIslamicQuestion([]),
					totalCorrect: 0,
					streak: 0,
					updatedAt: Timestamp.now()
				};

				await setDoc(doc(db, 'islamic_identity', userId), defaultProgress);
				return defaultProgress;
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to get Islamic progress:', error);
			return {
				userId,
				answeredQuestions: [],
				totalCorrect: 0,
				streak: 0,
				updatedAt: Timestamp.now()
			};
		}
	}

	/**
	 * Select nudge template based on rules:
	 * - ≥80% positive/bonding nudges
	 * - ≤20% constructive nudges
	 * - Prefer personalized when traits available
	 */
	static selectNudgeTemplate(userTraits: UserTraits): NudgeTemplate | null {
		// Get today's nudge count for user (to determine type distribution)
		const random = Math.random();

		// Filter templates based on type distribution rules
		let candidateTemplates: NudgeTemplate[];

		if (random < 0.8) {
			// 80% positive/bonding/reflection/islamic/personalized
			candidateTemplates = nudgeTemplates.filter((t) => t.type !== 'constructive');
		} else {
			// 20% constructive
			candidateTemplates = nudgeTemplates.filter((t) => t.type === 'constructive');
		}

		// Filter by available traits
		const availableTemplates = candidateTemplates.filter((template) => {
			if (!template.requiredTraits) return true;
			if (template.requiredTraits.includes('any')) {
				return userTraits.traits.length > 0;
			}
			return template.requiredTraits.some((trait) => userTraits.traits.includes(trait));
		});

		if (availableTemplates.length === 0) {
			console.warn('[SmartEngine] No available templates found, falling back to all candidates');
			availableTemplates.push(...candidateTemplates);
		}

		// Weighted random selection
		const totalWeight = availableTemplates.reduce((sum, t) => sum + t.weight, 0);
		let randomWeight = Math.random() * totalWeight;

		for (const template of availableTemplates) {
			randomWeight -= template.weight;
			if (randomWeight <= 0) {
				return template;
			}
		}

		return availableTemplates[0] || null;
	}

	/**
	 * Generate nudge from template with placeholder replacement
	 */
	static async generateNudgeFromTemplate(
		userId: string,
		template: NudgeTemplate,
		userTraits: UserTraits,
		islamicProgress: IslamicProgress
	): Promise<UserNudge | null> {
		try {
			let generatedText = template.template;
			const usedTraits: string[] = [];
			const character = characters.find((c) => c.id === template.character);

			if (!character) {
				console.error(`[SmartEngine] Character not found: ${template.character}`);
				return null;
			}

			// Replace {{character}} placeholder
			const characterGreeting =
				character.greetings[Math.floor(Math.random() * character.greetings.length)];
			generatedText = generatedText.replace(/\{\{character\}\}/g, characterGreeting);

			// Replace {{trait}} placeholder
			if (generatedText.includes('{{trait}}')) {
				const currentTrait = this.getCurrentTrait(userTraits);
				if (currentTrait) {
					const traitData = identityTraits.find((t) => t.id === currentTrait);
					if (traitData) {
						generatedText = generatedText.replace(/\{\{trait\}\}/g, traitData.name.toLowerCase());
						usedTraits.push(currentTrait);
					}
				}
			}

			// Replace {{ayah}} placeholder
			let islamicContext;
			if (generatedText.includes('{{ayah}}') && islamicProgress.currentQuestionId) {
				const currentQuestion = islamicQuestions.find(
					(q) => q.id === islamicProgress.currentQuestionId
				);
				if (currentQuestion) {
					generatedText = generatedText.replace(/\{\{ayah\}\}/g, currentQuestion.feedback_en);
					islamicContext = {
						ayah: currentQuestion.feedback_en,
						reference: currentQuestion.reference
					};
				}
			}

			// Create nudge object
			const nudge: UserNudge = {
				userId,
				templateId: template.id,
				generatedText,
				character: template.character,
				traits: usedTraits,
				islamicContext,
				createdAt: serverTimestamp() as Timestamp,
				type: template.type
			};

			return nudge;
		} catch (error) {
			console.error('[SmartEngine] Failed to generate nudge from template:', error);
			return null;
		}
	}

	/**
	 * Get current trait for rotation (weekly round-robin)
	 */
	static getCurrentTrait(userTraits: UserTraits): string | null {
		if (userTraits.traits.length === 0) return null;

		// Check if we need to rotate (weekly)
		const now = new Date();
		const lastRotation = userTraits.lastRotationDate.toDate();
		const daysSinceRotation = Math.floor(
			(now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysSinceRotation >= 7) {
			// Time to rotate - this will be handled by updateTraitRotation
			const nextIndex = (userTraits.currentRotationIndex + 1) % userTraits.traits.length;
			return userTraits.traits[nextIndex];
		}

		return userTraits.traits[userTraits.currentRotationIndex];
	}

	/**
	 * Update trait rotation if needed (weekly)
	 */
	static async updateTraitRotation(userId: string, currentTraits: UserTraits): Promise<void> {
		const now = new Date();
		const lastRotation = currentTraits.lastRotationDate.toDate();
		const daysSinceRotation = Math.floor(
			(now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysSinceRotation >= 7 && currentTraits.traits.length > 1) {
			const nextIndex = (currentTraits.currentRotationIndex + 1) % currentTraits.traits.length;

			await updateDoc(doc(db, 'identity_traits', userId), {
				currentRotationIndex: nextIndex,
				lastRotationDate: serverTimestamp(),
				updatedAt: serverTimestamp()
			});

			console.log(`[SmartEngine] Rotated trait for user ${userId} to index ${nextIndex}`);
		}
	}

	/**
	 * Get next Islamic question (lowest ID unanswered)
	 */
	static getNextIslamicQuestion(answeredQuestions: string[]): string | undefined {
		const answeredSet = new Set(answeredQuestions);
		const unansweredQuestions = islamicQuestions.filter((q) => !answeredSet.has(q.id));

		if (unansweredQuestions.length === 0) {
			return undefined; // All questions answered
		}

		// Sort by ID and return the lowest
		unansweredQuestions.sort((a, b) => a.id.localeCompare(b.id));
		return unansweredQuestions[0].id;
	}

	/**
	 * Update Islamic progress when question is answered
	 */
	static async updateIslamicProgress(
		userId: string,
		questionId: string,
		isCorrect: boolean
	): Promise<void> {
		try {
			const progressDoc = await getDoc(doc(db, 'islamic_identity', userId));
			let progress: IslamicProgress;

			if (progressDoc.exists()) {
				progress = progressDoc.data() as IslamicProgress;
			} else {
				progress = {
					userId,
					answeredQuestions: [],
					totalCorrect: 0,
					streak: 0,
					updatedAt: Timestamp.now()
				};
			}

			// Update progress
			if (!progress.answeredQuestions.includes(questionId)) {
				progress.answeredQuestions.push(questionId);
			}

			if (isCorrect) {
				progress.totalCorrect += 1;
				progress.streak += 1;
			} else {
				progress.streak = 0;
			}

			progress.lastAnsweredAt = serverTimestamp() as Timestamp;
			progress.currentQuestionId = this.getNextIslamicQuestion(progress.answeredQuestions);
			progress.updatedAt = serverTimestamp() as Timestamp;

			await setDoc(doc(db, 'islamic_identity', userId), progress);

			// Check for badge earnings
			await this.checkIslamicBadges(
				userId,
				progress.answeredQuestions.length,
				progress.totalCorrect
			);

			console.log(`[SmartEngine] Updated Islamic progress for user ${userId}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to update Islamic progress:', error);
		}
	}

	/**
	 * Check and award Islamic learning badges
	 */
	static async checkIslamicBadges(
		userId: string,
		totalAnswered: number,
		totalCorrect: number
	): Promise<void> {
		const milestones = [1, 5, 10, 25, 50];

		for (const milestone of milestones) {
			if (totalCorrect >= milestone) {
				const badgeId = `answered_${milestone}_islamic_question${milestone > 1 ? 's' : ''}`;
				await this.awardBadge(userId, badgeId);
			}
		}
	}

	/**
	 * Award badge to user if not already earned
	 */
	static async awardBadge(userId: string, condition: string): Promise<void> {
		try {
			// Find matching badge template
			const badgeTemplate = badgeTemplates.find((b) => b.condition === condition);
			if (!badgeTemplate) return;

			// Check if already earned
			const existingBadgeQuery = query(
				collection(db, 'users', userId, 'badges'),
				where('badgeId', '==', badgeTemplate.id),
				limit(1)
			);

			const existingBadges = await getDocs(existingBadgeQuery);
			if (!existingBadges.empty) {
				return; // Already earned
			}

			// Award badge
			const badge: UserBadge = {
				userId,
				badgeId: badgeTemplate.id,
				earnedAt: serverTimestamp() as Timestamp,
				notificationSent: false
			};

			await addDoc(collection(db, 'users', userId, 'badges'), badge);

			// TODO: Add to Fun Feed
			// TODO: Show Lottie animation

			console.log(`[SmartEngine] Awarded badge ${badgeTemplate.name} to user ${userId}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to award badge:', error);
		}
	}

	/**
	 * Create weekly feedback card (every Sunday)
	 */
	static async createWeeklyFeedback(userId: string): Promise<void> {
		try {
			// Check if feedback already exists for this week
			const now = new Date();
			const startOfWeek = new Date(now);
			startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
			startOfWeek.setHours(0, 0, 0, 0);

			const existingFeedbackQuery = query(
				collection(db, 'users', userId, 'feedback'),
				where('weekStart', '==', Timestamp.fromDate(startOfWeek)),
				limit(1)
			);

			const existingFeedback = await getDocs(existingFeedbackQuery);
			if (!existingFeedback.empty) {
				return; // Already exists for this week
			}

			// Create new feedback card
			const feedback: WeeklyFeedback = {
				userId,
				weekStart: Timestamp.fromDate(startOfWeek),
				questions: [
					{
						text: 'What made you happiest this week?',
						type: 'gratitude'
					},
					{
						text: 'What new thing did you learn about Islam?',
						type: 'reflection'
					},
					{
						text: 'How did you help your family this week?',
						type: 'reflection'
					},
					{
						text: 'What would you like to do better next week?',
						type: 'goal'
					}
				],
				createdAt: serverTimestamp() as Timestamp,
				isPersistent: true
			};

			await addDoc(collection(db, 'users', userId, 'feedback'), feedback);
			console.log(`[SmartEngine] Created weekly feedback for user ${userId}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to create weekly feedback:', error);
		}
	}

	/**
	 * Generate all daily content for all users
	 */
	static async generateDailyContentForAllUsers(allowedEmails: string[]): Promise<void> {
		console.log('[SmartEngine] Generating daily content for all users...');

		const familyId = await getFamilyId();
		const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		// Initialize daily analytics
		await this.initializeDailyAnalytics(dateString, familyId);

		const promises = allowedEmails.map(async (email) => {
			// Use email as userId for now (should match your auth system)
			const userId = email;

			try {
				// Generate daily nudge
				await this.generateDailyNudge(userId);

				// Create weekly feedback if it's Sunday
				const now = new Date();
				if (now.getDay() === 0) {
					// Sunday
					await this.createWeeklyFeedback(userId);
				}

				// Track analytics
				await this.trackUserAnalytics(userId, 'nudge_generated');
			} catch (error) {
				console.error(`[SmartEngine] Failed to generate content for ${userId}:`, error);
			}
		});

		// Generate daily poll (once per family)
		await this.generateDailyPoll(familyId);

		// Close expired polls and post results
		await this.processExpiredPolls(familyId);

		await Promise.all(promises);
		console.log('[SmartEngine] Daily content generation complete');
	}

	/**
	 * Generate daily poll for the family
	 */
	static async generateDailyPoll(familyId: string): Promise<DailyPoll | null> {
		try {
			// Check if poll already exists for today
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const existingPollQuery = query(
				collection(db, 'daily_polls'),
				where('familyId', '==', familyId),
				where('createdAt', '>=', Timestamp.fromDate(today)),
				where('createdAt', '<', Timestamp.fromDate(tomorrow)),
				limit(1)
			);

			const existingPolls = await getDocs(existingPollQuery);
			if (!existingPolls.empty) {
				console.log('[SmartEngine] Daily poll already exists for today');
				return null;
			}

			// Select random poll template
			const template = this.selectPollTemplate();
			if (!template) {
				console.error('[SmartEngine] No poll template found');
				return null;
			}

			// Create poll
			const now = new Date();
			const closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

			const poll: DailyPoll = {
				question: template.question,
				options: template.options,
				votes: {},
				createdAt: serverTimestamp() as Timestamp,
				closesAt: Timestamp.fromDate(closesAt),
				isClosed: false,
				resultsPosted: false,
				familyId
			};

			const pollRef = await addDoc(collection(db, 'daily_polls'), poll);
			console.log(`[SmartEngine] Generated daily poll: ${pollRef.id}`);

			// Track analytics
			await this.trackFamilyAnalytics(familyId, 'poll_generated');

			return { ...poll, id: pollRef.id };
		} catch (error) {
			console.error('[SmartEngine] Failed to generate daily poll:', error);
			return null;
		}
	}

	/**
	 * Select poll template with weighted random selection
	 */
	static selectPollTemplate(): PollTemplate | null {
		if (pollTemplates.length === 0) return null;

		// Get seasonal configuration for boosted content
		const seasonalConfig = getCurrentSeasonalConfig();

		// Apply seasonal weights
		let templates = [...pollTemplates];
		if (seasonalConfig) {
			// During special seasons, prefer family and preference polls
			templates = templates.map((template) => ({
				...template,
				weight:
					template.category === 'family' || template.category === 'preferences'
						? template.weight * 1.5
						: template.weight
			}));
		}

		// Weighted random selection
		const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
		let randomWeight = Math.random() * totalWeight;

		for (const template of templates) {
			randomWeight -= template.weight;
			if (randomWeight <= 0) {
				return template;
			}
		}

		return templates[0];
	}

	/**
	 * Process expired polls and post results
	 */
	static async processExpiredPolls(familyId: string): Promise<void> {
		try {
			const now = new Date();

			// Find polls that should be closed
			const expiredPollsQuery = query(
				collection(db, 'daily_polls'),
				where('familyId', '==', familyId),
				where('isClosed', '==', false),
				where('closesAt', '<=', Timestamp.fromDate(now))
			);

			const expiredPolls = await getDocs(expiredPollsQuery);

			for (const pollDoc of expiredPolls.docs) {
				const poll = pollDoc.data() as DailyPoll;

				// Close the poll
				await updateDoc(doc(db, 'daily_polls', pollDoc.id), {
					isClosed: true
				});

				// Post results to Fun Feed if not already posted
				if (!poll.resultsPosted) {
					await this.postPollResultsToFeed(pollDoc.id, poll);

					await updateDoc(doc(db, 'daily_polls', pollDoc.id), {
						resultsPosted: true
					});
				}

				console.log(`[SmartEngine] Processed expired poll: ${pollDoc.id}`);
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to process expired polls:', error);
		}
	}

	/**
	 * Post poll results to Fun Feed
	 */
	static async postPollResultsToFeed(pollId: string, poll: DailyPoll): Promise<void> {
		try {
			// Calculate results
			const optionCounts = poll.options.map(() => 0);
			Object.values(poll.votes).forEach((optionIndex) => {
				const index = parseInt(optionIndex);
				if (index >= 0 && index < optionCounts.length) {
					optionCounts[index]++;
				}
			});

			const totalVotes = optionCounts.reduce((sum, count) => sum + count, 0);

			// Find winning option(s)
			const maxVotes = Math.max(...optionCounts);
			const winners = poll.options.filter((_, index) => optionCounts[index] === maxVotes);

			// Create result text
			let resultText = `📊 Poll Results: "${poll.question}"\n\n`;

			if (totalVotes === 0) {
				resultText += 'No votes received 😔';
			} else {
				poll.options.forEach((option, index) => {
					const count = optionCounts[index];
					const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
					const isWinner = winners.includes(option);
					resultText += `${isWinner ? '🏆' : '📊'} ${option}: ${count} vote${count !== 1 ? 's' : ''} (${percentage}%)\n`;
				});

				if (winners.length === 1) {
					resultText += `\n🎉 Winner: ${winners[0]}!`;
				} else {
					resultText += `\n🤝 It's a tie between: ${winners.join(' and ')}!`;
				}
			}

			// Post to feed as a system post
			await addDoc(collection(db, 'posts'), {
				authorUid: 'system',
				familyId: poll.familyId,
				kind: 'text',
				text: resultText,
				createdAt: serverTimestamp(),
				likes: [],
				comments: []
			});

			console.log(`[SmartEngine] Posted poll results to feed for poll ${pollId}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to post poll results to feed:', error);
		}
	}

	/**
	 * Get current seasonal banners
	 */
	static getCurrentSeasonalBanners(): SeasonalBanner[] {
		return getCurrentSeasonalBanners();
	}

	/**
	 * Initialize daily analytics
	 */
	static async initializeDailyAnalytics(dateString: string, familyId: string): Promise<void> {
		try {
			const analyticsDoc = await getDoc(doc(db, 'analytics', dateString));

			if (!analyticsDoc.exists()) {
				const analytics = AnalyticsEngine.initializeDailyAnalytics(dateString, familyId);
				await setDoc(doc(db, 'analytics', dateString), analytics);
				console.log(`[SmartEngine] Initialized daily analytics for ${dateString}`);
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to initialize daily analytics:', error);
		}
	}

	/**
	 * Track user analytics event
	 */
	static async trackUserAnalytics(userId: string, event: string, data?: any): Promise<void> {
		try {
			const dateString = new Date().toISOString().split('T')[0];
			const analyticsRef = doc(db, 'analytics', dateString);
			const analyticsDoc = await getDoc(analyticsRef);

			if (analyticsDoc.exists()) {
				const analytics = analyticsDoc.data() as DailyAnalytics;

				// Initialize user metrics if not exists
				if (!analytics.userMetrics[userId]) {
					analytics.userMetrics[userId] = AnalyticsEngine.initializeUserMetrics(userId);
				}

				// Update metrics based on event
				switch (event) {
					case 'nudge_generated':
						analytics.metrics.nudgesGenerated++;
						break;
					case 'nudge_shown':
						analytics.metrics.nudgesShown++;
						analytics.userMetrics[userId].nudgeShown = true;
						break;
					case 'nudge_answered':
						analytics.metrics.nudgesAnswered++;
						analytics.userMetrics[userId].nudgeAnswered = true;
						break;
					case 'nudge_skipped':
						analytics.metrics.nudgesSkipped++;
						analytics.userMetrics[userId].nudgeSkipped = true;
						break;
					case 'feedback_completed':
						analytics.metrics.feedbackCompleted++;
						analytics.userMetrics[userId].feedbackCompleted = true;
						break;
					case 'poll_voted':
						analytics.metrics.pollVotes++;
						analytics.userMetrics[userId].pollVoted = true;
						break;
					case 'islamic_question_answered':
						analytics.metrics.islamicQuestionsAnswered++;
						analytics.userMetrics[userId].islamicQuestionsAnswered++;
						if (data?.isCorrect) {
							analytics.metrics.islamicQuestionsCorrect++;
							analytics.userMetrics[userId].islamicQuestionsCorrect++;
						}
						break;
					case 'badge_earned':
						analytics.metrics.badgesEarned++;
						analytics.userMetrics[userId].badgesEarned++;
						break;
				}

				// Update user last seen
				analytics.userMetrics[userId].lastSeen = new Date();
				analytics.updatedAt = new Date();

				// Recalculate rates
				analytics.metrics.nudgeEngagementRate =
					analytics.metrics.nudgesShown > 0
						? analytics.metrics.nudgesAnswered / analytics.metrics.nudgesShown
						: 0;

				analytics.metrics.feedbackCompletionRate =
					analytics.metrics.feedbackGenerated > 0
						? analytics.metrics.feedbackCompleted / analytics.metrics.feedbackGenerated
						: 0;

				analytics.metrics.pollParticipationRate =
					analytics.metrics.pollsGenerated > 0
						? analytics.metrics.pollVotes / analytics.metrics.pollsGenerated
						: 0;

				analytics.metrics.islamicAccuracyRate =
					analytics.metrics.islamicQuestionsAnswered > 0
						? analytics.metrics.islamicQuestionsCorrect / analytics.metrics.islamicQuestionsAnswered
						: 0;

				// Update active users count
				analytics.metrics.activeUsers = Object.keys(analytics.userMetrics).length;

				await updateDoc(analyticsRef, analytics);
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to track user analytics:', error);
		}
	}

	/**
	 * Track family-level analytics event
	 */
	static async trackFamilyAnalytics(familyId: string, event: string): Promise<void> {
		try {
			const dateString = new Date().toISOString().split('T')[0];
			const analyticsRef = doc(db, 'analytics', dateString);
			const analyticsDoc = await getDoc(analyticsRef);

			if (analyticsDoc.exists()) {
				const analytics = analyticsDoc.data() as DailyAnalytics;

				switch (event) {
					case 'poll_generated':
						analytics.metrics.pollsGenerated++;
						break;
					case 'feedback_generated':
						analytics.metrics.feedbackGenerated++;
						break;
				}

				analytics.updatedAt = new Date();
				await updateDoc(analyticsRef, analytics);
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to track family analytics:', error);
		}
	}

	/**
	 * Enhanced nudge selection with seasonal and analytics optimization
	 */
	static selectNudgeTemplateEnhanced(userTraits: UserTraits, userId: string): NudgeTemplate | null {
		// Get seasonal configuration
		const seasonalConfig = getCurrentSeasonalConfig();

		// Combine regular and seasonal templates
		let candidateTemplates = [...nudgeTemplates];

		if (seasonalConfig) {
			// Add seasonal templates
			const seasonalTemplates = seasonalNudgeTemplates.filter(
				(t) => t.season === seasonalConfig.season
			);
			candidateTemplates.push(...seasonalTemplates);

			// Boost seasonal nudge types
			candidateTemplates = candidateTemplates.map((template) => {
				if (seasonalConfig.nudgeBoosts.includes(template.id)) {
					return { ...template, weight: template.weight * 1.5 };
				}
				return template;
			});
		}

		// Apply basic 80/20 rule
		const random = Math.random();
		let filteredTemplates: NudgeTemplate[];

		if (random < 0.8) {
			// 80% positive/bonding/reflection/islamic/personalized
			filteredTemplates = candidateTemplates.filter((t) => t.type !== 'constructive');
		} else {
			// 20% constructive
			filteredTemplates = candidateTemplates.filter((t) => t.type === 'constructive');
		}

		// Filter by available traits
		const availableTemplates = filteredTemplates.filter((template) => {
			if (!template.requiredTraits) return true;
			if (template.requiredTraits.includes('any')) {
				return userTraits.traits.length > 0;
			}
			return template.requiredTraits.some((trait) => userTraits.traits.includes(trait));
		});

		if (availableTemplates.length === 0) {
			console.warn('[SmartEngine] No available templates found, falling back to all candidates');
			availableTemplates.push(...filteredTemplates);
		}

		// Weighted random selection
		const totalWeight = availableTemplates.reduce((sum, t) => sum + t.weight, 0);
		let randomWeight = Math.random() * totalWeight;

		for (const template of availableTemplates) {
			randomWeight -= template.weight;
			if (randomWeight <= 0) {
				return template;
			}
		}

		return availableTemplates[0] || null;
	}
}
