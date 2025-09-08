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
	Timestamp,
	increment
} from 'firebase/firestore';
import { db, auth } from '$lib/firebase';
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
import { 
	seasonalNudgeTemplates, 
	getCurrentSeasonalConfig,
	getCurrentSeasonalBanners,
	type SeasonalBanner
} from '$lib/data/seasonal';
import { pollTemplates, type PollTemplate } from '$lib/data/polls';
import { AnalyticsEngine, type DailyAnalytics, type UserDailyMetrics } from '$lib/data/analytics';
import { type FunFeedEntry, type DailyPoll } from '$lib/schema';

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
	completedAt?: Timestamp;
}

export interface UserBadgeCounters {
	userId: string;
	pollsCreated: number;
	storiesRead: number;
	feedbackSubmitted: number;
	pollVotes: number;
	islamicStoriesRead: number;
	consecutiveDays: number;
	lastInteractionDate: string; // YYYY-MM-DD format
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export interface UserBadge {
	id?: string;
	userId: string;
	badgeId: string;
	earnedAt: Timestamp;
	notificationSent: boolean;
	reason?: string; // Forward-only: short explanation of why badge was earned
}

// ============================================================================
// SMART ENGINE CORE
// ============================================================================

export class SmartEngine {
	/**
	 * Mark today's nudge as read
	 */
	static async markTodaysNudgeAsRead(userId: string): Promise<void> {
		try {
			const today = new Date();
			const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format
			const nudgeRef = doc(db, 'users', userId, 'nudges', dateKey);
			
			await updateDoc(nudgeRef, {
				readAt: serverTimestamp()
			});
			
			console.log(`[SmartEngine] Marked today's nudge as read for user ${userId}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to mark nudge as read:', error);
		}
	}

	/**
	 * Get today's nudge if it exists
	 */
	static async getTodaysNudge(userId: string): Promise<UserNudge | null> {
		try {
			const today = new Date();
			const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format
			
			const nudgeDoc = await getDoc(doc(db, 'users', userId, 'nudges', dateKey));
			
			if (nudgeDoc.exists()) {
				return { ...nudgeDoc.data(), id: nudgeDoc.id } as UserNudge;
			}
			
			return null;
		} catch (error) {
			console.error('[SmartEngine] Failed to get today\'s nudge:', error);
			return null;
		}
	}

	/**
	 * Generate exactly one daily nudge for a user
	 */
	static async generateDailyNudge(userId: string): Promise<UserNudge | null> {
		try {
			// Check if user already has a nudge for today using date-based document ID
			const today = new Date();
			const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format
			
			const existingNudge = await this.getTodaysNudge(userId);
			if (existingNudge) {
				console.log(`[SmartEngine] User ${userId} already has a nudge for today`);
				return existingNudge; // Return existing nudge
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
				// Save to Firestore using date-based document ID
				const today = new Date();
				const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format
				const nudgeRef = doc(db, 'users', userId, 'nudges', dateKey);
				await setDoc(nudgeRef, nudge);
				console.log(`[SmartEngine] Generated daily nudge for user ${userId} on ${dateKey}`);

				// Update trait rotation if needed
				await this.updateTraitRotation(userId, userTraits);

				return { ...nudge, id: dateKey };
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
	 * Generate meaningful reason text for badge awarding
	 */
	private static getBadgeReason(condition: string, badgeTemplate: any): string {
		// Islamic Q&A badges
		if (condition.includes('answered_') && condition.includes('islamic_question')) {
			const match = condition.match(/answered_(\d+)_islamic_question/);
			if (match) {
				const count = parseInt(match[1]);
				if (count === 1) return "Answered your first Islamic question";
				return `Answered ${count} Islamic questions correctly`;
			}
		}
		
		// Login streak badges
		if (condition.includes('login_streak')) {
			const match = condition.match(/login_streak_(\d+)/);
			if (match) {
				const days = parseInt(match[1]);
				return `Logged in ${days} days in a row`;
			}
		}
		
		// Social engagement badges
		if (condition.includes('first_post')) return "Shared your first post";
		if (condition.includes('first_comment')) return "Left your first comment";
		if (condition.includes('first_like')) return "Liked your first post";
		
		// Photo/media badges
		if (condition.includes('first_photo')) return "Uploaded your first photo";
		if (condition.includes('first_video')) return "Shared your first video";
		
		// Weekly engagement badges
		if (condition.includes('weekly_feedback')) return "Completed weekly reflection";
		if (condition.includes('daily_nudge_streak')) return "Consistently engaged with daily nudges";
		
		// Poll participation
		if (condition.includes('poll_participation')) return "Participated in family polls";
		
		// Seasonal badges
		if (condition.includes('ramadan')) return "Active during Ramadan";
		if (condition.includes('eid')) return "Celebrated Eid with the family";
		
		// Fallback to badge template description or generic reason
		return badgeTemplate?.description || "Achieved a special milestone";
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

			// Generate meaningful reason
			const reason = this.getBadgeReason(condition, badgeTemplate);

			// Award badge
			const badge: UserBadge = {
				userId,
				badgeId: badgeTemplate.id,
				earnedAt: serverTimestamp() as Timestamp,
				notificationSent: false,
				reason: reason
			};

			await addDoc(collection(db, 'users', userId, 'badges'), badge);

			// Track badge earning in analytics
			await this.trackUserAnalytics(userId, 'badge_earned');

			console.log(`[SmartEngine] Awarded badge ${badgeTemplate.name} to user ${userId}: ${reason}`);
		} catch (error) {
			console.error('[SmartEngine] Failed to award badge:', error);
		}
	}

	/**
	 * Milestone Badge System - Track and award progression badges
	 */
	
	// Milestone badge definitions
	static MILESTONE_BADGES = {
		// Common badges (original tier)
		explorer_10: { name: "Explorer", icon: "🧭", threshold: 10, counter: "pollsCreated", rarity: "common" },
		storyteller_10: { name: "Storyteller", icon: "📖", threshold: 10, counter: "storiesRead", rarity: "common" },
		feedback_hero_5: { name: "Feedback Hero", icon: "💡", threshold: 5, counter: "feedbackSubmitted", rarity: "common" },
		helper_20: { name: "Family Helper", icon: "🤝", threshold: 20, counter: "pollVotes", rarity: "common" },
		seeker_10: { name: "Knowledge Seeker", icon: "🌙", threshold: 10, counter: "islamicStoriesRead", rarity: "common" },
		streak_7: { name: "Streak Master", icon: "🔥", threshold: 7, counter: "consecutiveDays", rarity: "common" },
		
		// Legendary badges (Phase 6)
		explorer_master: { name: "Explorer Master", icon: "🌍", threshold: 50, counter: "pollsCreated", rarity: "legendary" },
		storyteller_epic: { name: "Epic Storyteller", icon: "📚", threshold: 100, counter: "storiesRead", rarity: "legendary" },
		feedback_champion: { name: "Feedback Champion", icon: "🏆", threshold: 25, counter: "feedbackSubmitted", rarity: "legendary" },
		family_leader: { name: "Family Leader", icon: "👑", threshold: 100, counter: "pollVotes", rarity: "legendary" },
		knowledge_guardian: { name: "Knowledge Guardian", icon: "🌌", threshold: 50, counter: "islamicStoriesRead", rarity: "legendary" },
		streak_30: { name: "Eternal Flame", icon: "🔥✨", threshold: 30, counter: "consecutiveDays", rarity: "legendary" }
	} as const;

	/**
	 * Update user milestone counters and check for badge awards
	 */
	static async updateMilestoneProgress(
		userId: string, 
		action: 'poll_created' | 'story_read' | 'feedback_submitted' | 'poll_voted' | 'islamic_story_read' | 'daily_interaction'
	): Promise<void> {
		try {
			const countersRef = doc(db, 'user_badge_counters', userId);
			const countersDoc = await getDoc(countersRef);
			
			let counters: UserBadgeCounters;
			
			if (!countersDoc.exists()) {
				// Initialize counters for new user
				counters = {
					userId,
					pollsCreated: 0,
					storiesRead: 0,
					feedbackSubmitted: 0,
					pollVotes: 0,
					islamicStoriesRead: 0,
					consecutiveDays: 0,
					lastInteractionDate: '',
					createdAt: serverTimestamp() as Timestamp,
					updatedAt: serverTimestamp() as Timestamp
				};
			} else {
				counters = countersDoc.data() as UserBadgeCounters;
			}

			// Update counters based on action
			const today = new Date().toISOString().split('T')[0];
			
			switch (action) {
				case 'poll_created':
					counters.pollsCreated++;
					break;
				case 'story_read':
					counters.storiesRead++;
					break;
				case 'feedback_submitted':
					counters.feedbackSubmitted++;
					break;
				case 'poll_voted':
					counters.pollVotes++;
					break;
				case 'islamic_story_read':
					counters.islamicStoriesRead++;
					break;
				case 'daily_interaction':
					// Handle streak tracking
					if (counters.lastInteractionDate === today) {
						// Already interacted today, no change
						break;
					}
					
					const yesterday = new Date();
					yesterday.setDate(yesterday.getDate() - 1);
					const yesterdayStr = yesterday.toISOString().split('T')[0];
					
					if (counters.lastInteractionDate === yesterdayStr) {
						// Consecutive day
						counters.consecutiveDays++;
					} else if (counters.lastInteractionDate !== today) {
						// Reset streak (missed days)
						counters.consecutiveDays = 1;
					}
					
					counters.lastInteractionDate = today;
					break;
			}

			counters.updatedAt = serverTimestamp() as Timestamp;

			// Save updated counters
			await setDoc(countersRef, counters);

			// Check for milestone badge awards
			await this.checkMilestoneBadges(userId, counters);

		} catch (error) {
			console.error('[SmartEngine] Failed to update milestone progress:', error);
		}
	}

	/**
	 * Check and award milestone badges based on current counters
	 */
	static async checkMilestoneBadges(userId: string, counters: UserBadgeCounters): Promise<void> {
		try {
			for (const [badgeId, badgeInfo] of Object.entries(this.MILESTONE_BADGES)) {
				const counterValue = counters[badgeInfo.counter as keyof UserBadgeCounters] as number;
				
				if (counterValue >= badgeInfo.threshold) {
					// Check if badge already earned
					const existingBadgeQuery = query(
						collection(db, 'users', userId, 'badges'),
						where('badgeId', '==', badgeId),
						limit(1)
					);

					const existingBadges = await getDocs(existingBadgeQuery);
					if (!existingBadges.empty) {
						continue; // Already earned
					}

					// Award the badge
					const badge = {
						userId,
						badgeId,
						name: badgeInfo.name,
						description: `${badgeInfo.icon} Earned by reaching ${badgeInfo.threshold} ${this.getCounterDisplayName(badgeInfo.counter)}`,
						category: this.getBadgeCategory(badgeId),
						rarity: badgeInfo.rarity, // Phase 6: Include rarity
						earnedAt: serverTimestamp() as Timestamp,
						notificationSent: false,
						reason: `Reached ${badgeInfo.threshold} ${this.getCounterDisplayName(badgeInfo.counter)}`
					};

					await addDoc(collection(db, 'users', userId, 'badges'), badge);

					// Phase 6: Check if legendary badge for special handling
					if (badgeInfo.rarity === 'legendary') {
						await this.handleLegendaryBadgeUnlock(userId, badgeInfo, badge);
					}

					// Track in analytics
					await this.trackUserAnalytics(userId, 'badge_earned');

					console.log(`[SmartEngine] Awarded milestone badge ${badgeInfo.name} to user ${userId}!`);
				}
			}
		} catch (error) {
			console.error('[SmartEngine] Failed to check milestone badges:', error);
		}
	}

	/**
	 * Get display name for counter types
	 */
	static getCounterDisplayName(counter: string): string {
		switch (counter) {
			case 'pollsCreated': return 'polls created';
			case 'storiesRead': return 'stories read';
			case 'feedbackSubmitted': return 'feedback submissions';
			case 'pollVotes': return 'poll votes';
			case 'islamicStoriesRead': return 'Islamic stories read';
			case 'consecutiveDays': return 'consecutive days';
			default: return counter;
		}
	}

	/**
	 * Get badge category for milestone badges
	 */
	static getBadgeCategory(badgeId: string): 'social' | 'learning' | 'consistency' | 'special' {
		switch (badgeId) {
			case 'explorer_10':
			case 'helper_20':
			case 'explorer_master':
			case 'family_leader':
				return 'social';
			case 'storyteller_10':
			case 'seeker_10':
			case 'storyteller_epic':
			case 'knowledge_guardian':
				return 'learning';
			case 'streak_7':
			case 'streak_30':
				return 'consistency';
			case 'feedback_hero_5':
			case 'feedback_champion':
				return 'special';
			default:
				return 'special';
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

	/**
	 * Phase 6: Handle legendary badge unlock with special effects
	 */
	static async handleLegendaryBadgeUnlock(userId: string, badgeInfo: any, badge: any): Promise<void> {
		try {
			const nickname = await this.getUserDisplayName(userId);
			
			// Create enhanced Fun Feed entry for legendary badge
			await this.addEnhancedFunFeedEntry('badge', {
				text: `🌟 ${nickname} unlocked Legendary Badge: ${badgeInfo.name} ${badgeInfo.icon} — ${badge.reason}`,
				createdBy: userId,
				rarity: 'legendary',
				metadata: {
					badgeIcon: badgeInfo.icon
				}
			});

			console.log(`[SmartEngine] 🌟 Legendary badge ${badgeInfo.name} unlocked by ${nickname}!`);
		} catch (error) {
			console.error('[SmartEngine] Failed to handle legendary badge unlock:', error);
		}
	}

	/**
	 * Phase 6: Enhanced Fun Feed with metadata support
	 */
	static async addEnhancedFunFeedEntry(
		type: 'poll' | 'story' | 'feedback' | 'badge' | 'pollSuggestion' | 'feedbackSuggestion',
		options: {
			text: string;
			createdBy: string;
			rarity?: 'common' | 'rare' | 'legendary';
			metadata?: {
				pollQuestion?: string;
				storyPreview?: string;
				feedbackTopic?: string;
				badgeIcon?: string;
				suggestedBy?: string;
				suggestedAt?: string;
				content?: string;
			};
		}
	): Promise<void> {
		try {
			const familyId = getFamilyId();
			
			const feedEntry = {
				type,
				text: options.text,
				createdBy: options.createdBy,
				familyId,
				createdAt: serverTimestamp(),
				...(options.rarity && { rarity: options.rarity }),
				...(options.metadata && { metadata: options.metadata })
			};
			
			await addDoc(collection(db, 'fun_feed'), feedEntry);
			console.log(`[FunFeed] Added enhanced ${type} entry with metadata`);
			
		} catch (error) {
			console.error('[FunFeed] Failed to add enhanced entry:', error);
		}
	}

	/**
	 * Phase 6: Generate motivational nudges based on analytics
	 */
	static async generateAnalyticsBasedNudge(userId: string): Promise<string | null> {
		try {
			const counters = await this.getMilestoneCounters(userId);
			
			// Streak motivation
			if (counters.consecutiveDays >= 5 && counters.consecutiveDays < 7) {
				return `🔥 Keep it up, you're on a ${counters.consecutiveDays}-day streak!`;
			}
			
			// Close to milestones
			if (counters.storiesRead === 9) {
				return "📖 Only 1 more story to unlock Storyteller badge!";
			}
			
			if (counters.pollsCreated >= 8 && counters.pollsCreated < 10) {
				return `🧭 Just ${10 - counters.pollsCreated} more poll${10 - counters.pollsCreated > 1 ? 's' : ''} to become an Explorer!`;
			}
			
			if (counters.feedbackSubmitted === 4) {
				return "💡 One more feedback to earn Feedback Hero!";
			}
			
			// Legendary tier motivation
			if (counters.pollsCreated >= 45 && counters.pollsCreated < 50) {
				return `🌍 Amazing! Only ${50 - counters.pollsCreated} more polls for Explorer Master!`;
			}
			
			if (counters.storiesRead >= 95 && counters.storiesRead < 100) {
				return `📚 Incredible! ${100 - counters.storiesRead} more stories for Epic Storyteller!`;
			}
			
			return null;
		} catch (error) {
			console.error('[SmartEngine] Failed to generate analytics nudge:', error);
			return null;
		}
	}

	/**
	 * Get user display name for messages
	 */
	static async getUserDisplayName(userId: string): Promise<string> {
		try {
			const userDoc = await getDoc(doc(db, 'users', userId));
			if (userDoc.exists()) {
				const userData = userDoc.data();
				// Use same logic as getDisplayName helper
				return userData.nickname || userData.displayName || userData.email?.split('@')[0] || 'Friend';
			}
			return 'Friend';
		} catch (error) {
			console.error('[SmartEngine] Failed to get user display name:', error);
			return 'Friend';
		}
	}

	/**
	 * Get milestone counters for a user
	 */
	static async getMilestoneCounters(userId: string): Promise<UserBadgeCounters> {
		try {
			const countersRef = doc(db, 'user_badge_counters', userId);
			const countersDoc = await getDoc(countersRef);
			
			if (countersDoc.exists()) {
				return countersDoc.data() as UserBadgeCounters;
			}
			
			// Return default counters
			return {
				userId,
				pollsCreated: 0,
				storiesRead: 0,
				feedbackSubmitted: 0,
				pollVotes: 0,
				islamicStoriesRead: 0,
				consecutiveDays: 0,
				lastInteractionDate: new Date().toISOString().split('T')[0],
				createdAt: serverTimestamp() as Timestamp,
				updatedAt: serverTimestamp() as Timestamp
			};
		} catch (error) {
			console.error('[SmartEngine] Failed to get milestone counters:', error);
			throw error;
		}
	}
}

// ============================================================================
// FamilyBot Fairness System
// ============================================================================

export interface BotTurnTracker {
	global: Record<string, number>; // uid -> turn count
	lastAssigned: string | null;
	totalTurns: number;
	lastUpdated: Timestamp;
}

/**
 * Assign bot turn fairly across users
 * @param uid User requesting interaction
 * @returns UID of user who should get the interaction (for fairness)
 */
export async function assignBotTurn(uid: string): Promise<string> {
	try {
		const botTurnsRef = doc(db, 'bot_turns', 'global');
		const botTurnsDoc = await getDoc(botTurnsRef);

		let tracker: BotTurnTracker;

		if (!botTurnsDoc.exists()) {
			// Initialize tracker
			tracker = {
				global: {},
				lastAssigned: null,
				totalTurns: 0,
				lastUpdated: serverTimestamp() as Timestamp
			};
			await setDoc(botTurnsRef, tracker);
		} else {
			tracker = botTurnsDoc.data() as BotTurnTracker;
		}

		// Initialize user count if not exists
		if (!tracker.global[uid]) {
			tracker.global[uid] = 0;
		}

		// Find user with lowest turn count
		let lowestCount = Infinity;
		let fairestUid = uid; // Default to requesting user

		for (const [userId, count] of Object.entries(tracker.global)) {
			if (count < lowestCount) {
				lowestCount = count;
				fairestUid = userId;
			}
		}

		// If requesting user has lowest count (or tied), they get the turn
		const requestingUserCount = tracker.global[uid] || 0;
		if (requestingUserCount <= lowestCount) {
			fairestUid = uid;
		}

		// Update the assigned user's count
		tracker.global[fairestUid] = (tracker.global[fairestUid] || 0) + 1;
		tracker.lastAssigned = fairestUid;
		tracker.totalTurns += 1;
		tracker.lastUpdated = serverTimestamp() as Timestamp;

		// Save updated tracker
		await updateDoc(botTurnsRef, tracker);

		console.log(`[FamilyBot] Assigned turn to ${fairestUid} (requesting: ${uid})`);
		return fairestUid;

	} catch (error) {
		console.error('[FamilyBot] Failed to assign bot turn:', error);
		return uid; // Fallback to requesting user
	}
}

/**
 * Get bot turn statistics for monitoring fairness
 */
export async function getBotTurnStats(): Promise<BotTurnTracker | null> {
	try {
		const botTurnsDoc = await getDoc(doc(db, 'bot_turns', 'global'));
		
		if (botTurnsDoc.exists()) {
			return botTurnsDoc.data() as BotTurnTracker;
		}
		
		return null;
	} catch (error) {
		console.error('[FamilyBot] Failed to get bot turn stats:', error);
		return null;
	}
}

// ============================================================================
// FamilyBot Helper Functions
// ============================================================================

/**
 * Create a poll for FamilyBot
 */
export async function createPoll({ question, options }: { question: string; options: string[] }) {
	const familyId = getFamilyId();
	const ref = collection(db, "daily_polls");
	
	// Create the poll
	const pollDoc = await addDoc(ref, {
		question,
		options: options.map(text => ({ text, votes: [] })),
		familyId,
		createdAt: serverTimestamp(),
		expiresAt: Date.now() + 24 * 60 * 60 * 1000,
		totalVotes: 0
	});

	// Track milestone progress for poll creation
	const currentUser = auth.currentUser;
	if (currentUser?.uid) {
		await SmartEngine.updateMilestoneProgress(currentUser.uid, 'poll_created');
		await SmartEngine.updateMilestoneProgress(currentUser.uid, 'daily_interaction');
	}

	return pollDoc;
}

/**
 * Send feedback from FamilyBot with topic categorization
 */
export async function sendFeedback(uid: string, message: string, topic: string = 'General') {
	const ref = collection(db, `users/${uid}/feedback`);
	await addDoc(ref, {
		message,
		topic,
		source: 'FamilyBot',
		userId: uid,
		createdAt: serverTimestamp()
	});

	// Track milestone progress for feedback submission
	await SmartEngine.updateMilestoneProgress(uid, 'feedback_submitted');
	await SmartEngine.updateMilestoneProgress(uid, 'daily_interaction');
}

// Fallback stories for when Firestore is unavailable
const sampleStories = [
	"Once upon a time, a brave explorer set out on an adventure 🌍.",
	"A curious cat 🐱 discovered hidden wisdom in the forest.",
	"Two brothers set out to find a treasure, guided by kindness ✨.",
	"A little bird 🐦 learned the importance of helping others.",
	"In a magical garden, flowers taught a young child about patience 🌸.",
	"A wise owl 🦉 shared ancient secrets with a group of friends."
];

/**
 * Get a random story template with placeholder support
 * Now supports Firestore story_templates collection with placeholders:
 * - {trait}: User's current identity trait
 * - {ayah}: Current Quranic verse from progression
 * - {theme}: Seasonal or preference-based theme
 */
export async function getRandomStoryTemplate(): Promise<string> {
	try {
		// Try to get stories from Firestore first
		const storiesQuery = query(
			collection(db, 'story_templates'),
			limit(50) // Get random sample
		);
		
		const storiesSnapshot = await getDocs(storiesQuery);
		
		if (!storiesSnapshot.empty) {
			// Use Firestore stories
			const stories = storiesSnapshot.docs.map(doc => doc.data());
			const randomStory = stories[Math.floor(Math.random() * stories.length)];
			return randomStory.template || randomStory.text || "A wonderful adventure awaits! ✨";
		}
		
		// Fallback to hardcoded stories if Firestore is empty
		const fallbackStories = [
			"Once upon a time, a brave explorer discovered that {trait} was the key to unlocking ancient wisdom. {ayah} 🌍",
			"A curious cat 🐱 learned that being {trait} helps in finding hidden treasures in the enchanted forest.",
			"Two siblings worked together, using their {trait} nature to solve puzzles and help their community. ✨",
			"A little bird 🐦 realized that {trait} people always find the most beautiful songs to share.",
			"In a magical garden, flowers taught a young child that {trait} hearts bloom the brightest. 🌸",
			"A wise owl 🦉 shared that {trait} is the secret ingredient in all the best adventures.",
			"During {theme} season, a family discovered that being {trait} brings extra joy to celebrations. 🎉",
			"The village storyteller said: '{ayah}' - and everyone understood why {trait} matters most.",
			"A young artist painted the most beautiful picture when they embraced their {trait} spirit. 🎨",
			"The mountain guide knew that {trait} travelers always find the most amazing views. ⛰️"
		];
		
		const randomIndex = Math.floor(Math.random() * fallbackStories.length);
		return fallbackStories[randomIndex];
		
	} catch (error) {
		console.error('[Stories] Failed to get story template:', error);
		// Ultimate fallback
		const idx = Math.floor(Math.random() * sampleStories.length);
		return sampleStories[idx];
	}
}

/**
 * Enhanced story template with placeholder replacement
 * @param uid User ID for personalization
 * @param preferences User preferences for theme selection
 * @returns Personalized story with replaced placeholders
 */
export async function getPersonalizedStoryTemplate(
	uid: string, 
	preferences?: any
): Promise<string> {
	try {
		// Get base story template
		let story = await getRandomStoryTemplate();
		
		// Get user's current trait
		const userTraits = await SmartEngine.getUserTraits(uid);
		const currentTrait = SmartEngine.getCurrentTrait(userTraits);
		
		// Get current Islamic progression
		const islamicProgress = await SmartEngine.getIslamicProgress(uid);
		
		// Get seasonal context
		const seasonalConfig = getCurrentSeasonalConfig();
		
		// Replace {trait} placeholder
		if (story.includes('{trait}') && currentTrait) {
			const traitData = identityTraits.find(t => t.id === currentTrait);
			const traitName = traitData?.name.toLowerCase() || 'kind';
			story = story.replace(/\{trait\}/g, traitName);
		}
		
		// Replace {ayah} placeholder
		if (story.includes('{ayah}') && islamicProgress.currentQuestionId) {
			const currentQuestion = islamicQuestions.find(q => q.id === islamicProgress.currentQuestionId);
			if (currentQuestion) {
				const ayahText = currentQuestion.feedback_en.substring(0, 100) + "...";
				story = story.replace(/\{ayah\}/g, ayahText);
			}
		}
		
		// Replace {theme} placeholder
		if (story.includes('{theme}')) {
			let theme = 'wonderful';
			
			if (seasonalConfig) {
				theme = seasonalConfig.season.toLowerCase();
			} else if (preferences) {
				// Use preference-based theme
				const preferredTheme = preferences.storyThemes ? 
					Object.keys(preferences.storyThemes)[0] : 'adventure';
				theme = preferredTheme;
			}
			
			story = story.replace(/\{theme\}/g, theme);
		}
		
		// Clean up any remaining placeholders
		story = story.replace(/\{[^}]+\}/g, '✨');
		
		// Track milestone progress for story reading
		const isIslamicStory = story.includes('Allah') || story.includes('mosque') || story.includes('Quran') || story.includes('islamic');
		await SmartEngine.updateMilestoneProgress(uid, 'story_read');
		if (isIslamicStory) {
			await SmartEngine.updateMilestoneProgress(uid, 'islamic_story_read');
		}
		await SmartEngine.updateMilestoneProgress(uid, 'daily_interaction');
		
		return story;
		
	} catch (error) {
		console.error('[Stories] Failed to get personalized story:', error);
		return await getRandomStoryTemplate();
	}
}

/**
 * Get adaptive engagement suggestions based on analytics
 * @param uid User ID
 * @returns Suggestion bias: 'playful', 'deeper', or 'balanced'
 */
export async function getAdaptiveEngagementBias(uid: string): Promise<'playful' | 'deeper' | 'balanced'> {
	try {
		const dateString = new Date().toISOString().split('T')[0];
		const analyticsDoc = await getDoc(doc(db, 'analytics', dateString));
		
		if (!analyticsDoc.exists()) {
			return 'balanced'; // Default when no analytics available
		}
		
		const analytics = analyticsDoc.data() as DailyAnalytics;
		const userMetrics = analytics.userMetrics[uid];
		
		if (!userMetrics) {
			return 'balanced'; // Default for new users
		}
		
		// Calculate engagement score
		let engagementScore = 0;
		let totalPossible = 0;
		
		// Nudge engagement
		if (userMetrics.nudgeShown) {
			totalPossible += 1;
			if (userMetrics.nudgeAnswered) engagementScore += 1;
		}
		
		// Poll participation
		if (analytics.metrics.pollsGenerated > 0) {
			totalPossible += 1;
			if (userMetrics.pollVoted) engagementScore += 1;
		}
		
		// Islamic questions
		if (userMetrics.islamicQuestionsAnswered > 0) {
			totalPossible += 1;
			engagementScore += Math.min(1, userMetrics.islamicQuestionsAnswered / 3); // Up to 1 point for 3+ questions
		}
		
		// Feedback completion
		if (analytics.metrics.feedbackGenerated > 0) {
			totalPossible += 1;
			if (userMetrics.feedbackCompleted) engagementScore += 1;
		}
		
		const engagementRate = totalPossible > 0 ? engagementScore / totalPossible : 0.5;
		
		// Bias suggestions based on engagement
		if (engagementRate < 0.3) {
			return 'playful'; // Low engagement - suggest fun, light activities
		} else if (engagementRate > 0.7) {
			return 'deeper'; // High engagement - suggest reflection, learning
		} else {
			return 'balanced'; // Moderate engagement - balanced suggestions
		}
		
	} catch (error) {
		console.error('[FamilyBot] Failed to get adaptive engagement bias:', error);
		return 'balanced';
	}
}

/**
 * Check for seasonal content and suggest seasonal activities
 * @returns Seasonal content suggestion or null
 */
export async function getSeasonalSuggestion(): Promise<{ label: string; content: string } | null> {
	try {
		const seasonalConfig = getCurrentSeasonalConfig();
		
		if (!seasonalConfig) return null;
		
		// Get seasonal collection content
		const seasonalQuery = query(
			collection(db, 'seasonal'),
			where('season', '==', seasonalConfig.season),
			where('isActive', '==', true),
			limit(5)
		);
		
		const seasonalSnapshot = await getDocs(seasonalQuery);
		
		if (seasonalSnapshot.empty) return null;
		
		// Pick random seasonal content
		const seasonalContent = seasonalSnapshot.docs.map(doc => doc.data());
		const randomContent = seasonalContent[Math.floor(Math.random() * seasonalContent.length)];
		
		return {
			label: `🎊 ${seasonalConfig.season} Special: ${randomContent.title}`,
			content: randomContent.description || randomContent.content || "Special seasonal content!"
		};
		
	} catch (error) {
		console.error('[FamilyBot] Failed to get seasonal suggestion:', error);
		return null;
	}
}
export async function seedStoryTemplates(): Promise<void> {
	try {
		// Check if collection exists
		const existingQuery = query(collection(db, 'story_templates'), limit(1));
		const existingSnapshot = await getDocs(existingQuery);
		
		if (!existingSnapshot.empty) {
			console.log('[Stories] Story templates already exist, skipping seed');
			return;
		}
		
		const familyId = getFamilyId();
		
		// 50+ story templates by category as requested:
		// Islamic Wisdom: 10, Family Bonding: 10, Adventure: 10, Fantasy: 8, Wisdom & Reflection: 7, Seasonal Specials: 5
		const storyTemplates = [
			
			// ======= ISLAMIC WISDOM (10) =======
			{
				template: "The mosque garden taught everyone that {trait} worship brings the sweetest peace. '{ayah}' echoed in their hearts. 🕌",
				theme: "islamic",
				category: "spiritual",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "During {theme} prayers, a {trait} child learned that gratitude makes every day more beautiful. 🤲",
				theme: "islamic",
				category: "spiritual",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.3,
				familyId
			},
			{
				template: "The Quran teacher smiled when she saw how {trait} students always asked the most thoughtful questions. '{ayah}' 📿",
				theme: "islamic",
				category: "learning",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "Every morning, the {trait} family remembered to say 'Bismillah' and felt Allah's blessings throughout their {theme} day. 🌅",
				theme: "islamic",
				category: "daily",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.3,
				familyId
			},
			{
				template: "The young Muslim learned that being {trait} in all actions pleases Allah. '{ayah}' became their daily guidance. ☪️",
				theme: "islamic",
				category: "character",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "At the Islamic center, children discovered that {trait} hearts understand the Quran's wisdom better. '{ayah}' 📖",
				theme: "islamic",
				category: "learning",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "The call to prayer reminded everyone that {trait} believers find peace in Allah's guidance. 🎵",
				theme: "islamic",
				category: "spiritual",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "During Ramadan, the {trait} family learned that patience and kindness bring the greatest rewards. '{ayah}' 🌙",
				theme: "islamic",
				category: "seasonal",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "The mosque library showed that {trait} students love learning about Prophet Muhammad's (PBUH) teachings. 📚",
				theme: "islamic",
				category: "learning",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			{
				template: "When making dua, the {trait} child remembered that Allah always listens to sincere hearts. '{ayah}' gave them comfort. 🤲",
				theme: "islamic",
				category: "spiritual",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.3,
				familyId
			},
			
			// ======= FAMILY BONDING (10) =======
			{
				template: "Two siblings worked together, using their {trait} nature to solve puzzles and help their community during {theme} season. ✨",
				theme: "family",
				category: "cooperation",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.2,
				familyId
			},
			{
				template: "A grandmother shared with her grandchildren: 'Being {trait} is what makes our family special.' They remembered '{ayah}' together. 👵",
				theme: "family",
				category: "wisdom",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "During family dinner, everyone shared why being {trait} helps them care for each other better. 🍽️",
				theme: "family",
				category: "bonding",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "The family photo showed everyone's {trait} smiles, especially during {theme} celebrations. 📸",
				theme: "family",
				category: "memories",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.2,
				familyId
			},
			{
				template: "A parent taught their child: '{ayah}' - and they both understood why {trait} hearts make the strongest families. 💕",
				theme: "family",
				category: "teaching",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "The family game night was extra fun because everyone used their {trait} skills to help each other win. 🎲",
				theme: "family",
				category: "fun",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "When grandpa told stories, his {trait} voice made every tale feel magical during {theme} evenings. 🌟",
				theme: "family",
				category: "storytelling",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.2,
				familyId
			},
			{
				template: "The family garden flourished because everyone contributed their {trait} efforts. '{ayah}' reminded them of working together. 🌱",
				theme: "family",
				category: "cooperation",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "At the family reunion, cousins discovered they all shared the same {trait} nature from their grandparents. 👨‍👩‍👧‍👦",
				theme: "family",
				category: "heritage",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.2,
				familyId
			},
			{
				template: "The bedtime story tradition continued because {trait} parents know stories bring families closer during {theme} nights. 🌙",
				theme: "family",
				category: "traditions",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.2,
				familyId
			},
			
			// ======= ADVENTURE (10) =======
			{
				template: "Once upon a time, a brave explorer discovered that being {trait} was the key to unlocking ancient wisdom. As the Quran says: '{ayah}' 🌍",
				theme: "adventure",
				category: "exploration",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "A curious cat 🐱 learned that {trait} hearts always find hidden treasures in the enchanted forest during {theme} time.",
				theme: "adventure", 
				category: "animals",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.0,
				familyId
			},
			{
				template: "The mountain guide knew that {trait} travelers always discover the most amazing views. '{ayah}' reminded them why the journey matters. ⛰️",
				theme: "adventure",
				category: "nature",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "A young sailor learned that being {trait} helps navigate both stormy seas and calm waters. The lighthouse keeper shared: '{ayah}' ⛵",
				theme: "adventure",
				category: "journey",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "In the deep forest, a {trait} ranger discovered that every creature has its own special wisdom to share. 🌲",
				theme: "adventure",
				category: "nature",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "The treasure map led to a cave where {trait} explorers found the greatest treasure: friendship during {theme} adventures. 🗺️",
				theme: "adventure",
				category: "treasure",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.0,
				familyId
			},
			{
				template: "A brave knight learned that {trait} courage comes from helping others, not from fighting. '{ayah}' guided their quest. ⚔️",
				theme: "adventure",
				category: "heroism",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "The desert caravan discovered that {trait} travelers always find oases when they help each other. 🐪",
				theme: "adventure",
				category: "journey",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			{
				template: "In the ancient ruins, archaeologists found that {trait} researchers uncover the most amazing discoveries during {theme} expeditions. 🏛️",
				theme: "adventure",
				category: "discovery",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.0,
				familyId
			},
			{
				template: "The space explorer realized that being {trait} helps you make friends even among the stars. '{ayah}' echoed through the cosmos. 🚀",
				theme: "adventure",
				category: "exploration",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.0,
				familyId
			},
			
			// ======= FANTASY (8) =======
			{
				template: "In a magical garden, flowers taught a young child that {trait} hearts bloom the brightest during {theme} season. 🌸",
				theme: "fantasy",
				category: "magic",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 0.9,
				familyId
			},
			{
				template: "A friendly dragon learned that being {trait} makes the best magic of all. The ancient scroll read: '{ayah}' 🐉",
				theme: "fantasy",
				category: "magic",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 0.9,
				familyId
			},
			{
				template: "The magical paintbrush only worked for {trait} artists who painted with love in their hearts. 🎨",
				theme: "fantasy",
				category: "creativity",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 0.9,
				familyId
			},
			{
				template: "In the enchanted forest, all the animals gathered around the {trait} fairy who shared stories during {theme} nights. 🧚‍♀️",
				theme: "fantasy",
				category: "magic",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 0.9,
				familyId
			},
			{
				template: "The crystal castle appeared only to {trait} visitors who understood the meaning of '{ayah}' ✨",
				theme: "fantasy",
				category: "magic",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 0.9,
				familyId
			},
			{
				template: "The wizard's apprentice discovered that {trait} magic users always create the most helpful spells during {theme} seasons. 🧙‍♂️",
				theme: "fantasy",
				category: "magic",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 0.9,
				familyId
			},
			{
				template: "A talking unicorn taught a young rider that {trait} hearts can heal any wound. '{ayah}' sparkled in the moonlight. 🦄",
				theme: "fantasy",
				category: "healing",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 0.9,
				familyId
			},
			{
				template: "The enchanted library revealed its secrets only to {trait} readers who sought wisdom to help others. 📚✨",
				theme: "fantasy",
				category: "knowledge",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 0.9,
				familyId
			},
			
			// ======= WISDOM & REFLECTION (7) =======
			{
				template: "A wise owl 🦉 shared that {trait} is the secret ingredient in all the best adventures and kindest deeds.",
				theme: "wisdom",
				category: "learning",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.1,
				familyId
			},
			{
				template: "The village storyteller said: '{ayah}' - and everyone understood why being {trait} matters most in life. 📚",
				theme: "wisdom",
				category: "teaching",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.1,
				familyId
			},
			{
				template: "An old tree whispered to a young child: 'Growing {trait} roots helps you reach for the highest dreams.' 🌳",
				theme: "wisdom",
				category: "growth",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: false,
				weight: 1.1,
				familyId
			},
			{
				template: "In the library, a {trait} scholar discovered that the most valuable treasures are found in helping others during {theme} time. 📖",
				theme: "wisdom",
				category: "learning",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.1,
				familyId
			},
			{
				template: "The wise gardener knew that {trait} seeds grow into the most beautiful flowers. '{ayah}' reminded them of patience. 🌺",
				theme: "wisdom",
				category: "patience",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.1,
				familyId
			},
			{
				template: "The lighthouse keeper understood that {trait} guidance helps ships find safe harbor during {theme} storms. 🗼",
				theme: "wisdom",
				category: "guidance",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.1,
				familyId
			},
			{
				template: "The master craftsman taught that {trait} hands create the most lasting beauty. '{ayah}' inspired every creation. 🔨",
				theme: "wisdom",
				category: "skill",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: false,
				weight: 1.1,
				familyId
			},
			
			// ======= SEASONAL SPECIALS (5) =======
			{
				template: "During {theme} celebrations, the {trait} family found that giving brings more joy than receiving. 🎁",
				theme: "seasonal",
				category: "celebration",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.4,
				familyId
			},
			{
				template: "The {theme} festival taught everyone that {trait} hearts make the best decorations. '{ayah}' lit up the celebration. 🎊",
				theme: "seasonal",
				category: "festival",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: true,
				weight: 1.4,
				familyId
			},
			{
				template: "When {theme} snow fell, children learned that {trait} friends make the warmest memories together. ❄️",
				theme: "seasonal",
				category: "winter",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.4,
				familyId
			},
			{
				template: "The {theme} garden showed that {trait} gardeners grow the most colorful flowers. '{ayah}' bloomed in every petal. 🌷",
				theme: "seasonal",
				category: "spring",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: true,
				hasThemePlaceholder: true,
				weight: 1.4,
				familyId
			},
			{
				template: "During {theme} vacation, the family discovered that {trait} adventures create the best stories to share. 🏖️",
				theme: "seasonal",
				category: "summer",
				hasTraitPlaceholder: true,
				hasAyahPlaceholder: false,
				hasThemePlaceholder: true,
				weight: 1.4,
				familyId
			}
		];
		
		// Seed the collection
		const batch = [];
		for (const template of storyTemplates) {
			const docRef = doc(collection(db, 'story_templates'));
			batch.push(setDoc(docRef, {
				...template,
				createdAt: serverTimestamp(),
				id: docRef.id
			}));
		}
		
		await Promise.all(batch);
		console.log(`[Stories] Seeded ${storyTemplates.length} story templates with categories:
		- Islamic Wisdom: 10
		- Family Bonding: 10  
		- Adventure: 10
		- Fantasy: 8
		- Wisdom & Reflection: 7
		- Seasonal Specials: 5`);
		
	} catch (error) {
		console.error('[Stories] Failed to seed story templates:', error);
	}
}

/**
 * Add an entry to the Fun Feed collection (Phase 6: Enhanced with metadata)
 * @param type Type of activity (poll, story, feedback)
 * @param text Description text for the feed
 * @param createdBy User ID who performed the action
 * @param metadata Optional metadata for enriched display
 */
export async function addToFunFeed(
	type: 'poll' | 'story' | 'feedback',
	text: string,
	createdBy: string,
	metadata?: {
		pollQuestion?: string;
		storyPreview?: string;
		feedbackTopic?: string;
	}
): Promise<void> {
	try {
		const familyId = getFamilyId();
		
		const feedEntry = {
			type,
			text,
			createdBy,
			familyId,
			createdAt: serverTimestamp(),
			...(metadata && { metadata })
		};
		
		await addDoc(collection(db, 'fun_feed'), feedEntry);
		console.log(`[FunFeed] Added ${type} entry: ${text}`);
		
	} catch (error) {
		console.error('[FunFeed] Failed to add entry:', error);
		throw error;
	}
}

/**
 * Track poll vote for milestone system
 */
export async function trackPollVote(uid: string): Promise<void> {
	try {
		await SmartEngine.updateMilestoneProgress(uid, 'poll_voted');
		await SmartEngine.updateMilestoneProgress(uid, 'daily_interaction');
	} catch (error) {
		console.error('[SmartEngine] Failed to track poll vote:', error);
	}
}

// Throttling state to prevent spam suggestions
const suggestionThrottle = new Map<string, Set<string>>(); // sessionId -> Set of suggestion types

/**
 * Check if a suggestion type can be added (throttling)
 * @param sessionId Session identifier (could be uid + date)
 * @param suggestionType Type of suggestion ('poll' | 'feedback')
 */
function canAddSuggestion(sessionId: string, suggestionType: string): boolean {
	if (!suggestionThrottle.has(sessionId)) {
		suggestionThrottle.set(sessionId, new Set());
	}
	
	const sessionSuggestions = suggestionThrottle.get(sessionId)!;
	return !sessionSuggestions.has(suggestionType);
}

/**
 * Mark a suggestion type as added for this session
 * @param sessionId Session identifier
 * @param suggestionType Type of suggestion
 */
function markSuggestionAdded(sessionId: string, suggestionType: string): void {
	if (!suggestionThrottle.has(sessionId)) {
		suggestionThrottle.set(sessionId, new Set());
	}
	suggestionThrottle.get(sessionId)!.add(suggestionType);
}

/**
 * Add a poll suggestion to Fun Feed (throttled)
 * @param uid User ID who initiated the suggestion
 * @param pollQuestion Suggested poll question
 */
export async function addPollSuggestion(uid: string, pollQuestion: string): Promise<void> {
	try {
		const sessionId = `${uid}-${new Date().toISOString().split('T')[0]}`;
		
		if (!canAddSuggestion(sessionId, 'poll')) {
			console.log('[FamilyBot] Poll suggestion throttled for this session');
			return;
		}

		await SmartEngine.addEnhancedFunFeedEntry('pollSuggestion', {
			text: `📊 FamilyBot suggested a poll: ${pollQuestion}`,
			createdBy: 'bot',
			rarity: 'common',
			metadata: {
				suggestedBy: uid,
				suggestedAt: new Date().toISOString(),
				pollQuestion,
				content: pollQuestion
			}
		});

		markSuggestionAdded(sessionId, 'poll');
		console.log(`[FamilyBot] Added poll suggestion: ${pollQuestion}`);
		
	} catch (error) {
		console.error('[FamilyBot] Failed to add poll suggestion:', error);
	}
}

/**
 * Add a feedback suggestion to Fun Feed (throttled)
 * @param uid User ID who initiated the suggestion
 * @param topic Suggested feedback topic
 */
export async function addFeedbackSuggestion(uid: string, topic: string): Promise<void> {
	try {
		const sessionId = `${uid}-${new Date().toISOString().split('T')[0]}`;
		
		if (!canAddSuggestion(sessionId, 'feedback')) {
			console.log('[FamilyBot] Feedback suggestion throttled for this session');
			return;
		}

		await SmartEngine.addEnhancedFunFeedEntry('feedbackSuggestion', {
			text: `💡 FamilyBot suggested giving feedback about: ${topic}`,
			createdBy: 'bot', 
			rarity: 'common',
			metadata: {
				suggestedBy: uid,
				suggestedAt: new Date().toISOString(),
				feedbackTopic: topic,
				content: `Share your thoughts about ${topic}`
			}
		});

		markSuggestionAdded(sessionId, 'feedback');
		console.log(`[FamilyBot] Added feedback suggestion: ${topic}`);
		
	} catch (error) {
		console.error('[FamilyBot] Failed to add feedback suggestion:', error);
	}
}

/**
 * Create a poll from a FamilyBot suggestion
 * @param question Suggested poll question
 * @param uid User who is converting the suggestion
 */
export async function createPollFromSuggestion(question: string, uid: string): Promise<void> {
	try {
		const familyId = getFamilyId();
		
		// Generate default options based on the question type
		let options: string[];
		if (question.toLowerCase().includes('meal') || question.toLowerCase().includes('food') || question.toLowerCase().includes('dinner') || question.toLowerCase().includes('lunch')) {
			options = ['Pasta 🍝', 'Pizza 🍕', 'Rice 🍚'];
		} else if (question.toLowerCase().includes('activity') || question.toLowerCase().includes('weekend')) {
			options = ['Board games 🎲', 'Watch a movie 🎬', 'Go for a walk 🚶'];
		} else {
			// Generic options
			options = ['Option A 🅰️', 'Option B 🅱️', 'Option C 🅲'];
		}

		// Create the poll document
		const pollDoc = await addDoc(collection(db, 'daily_polls'), {
			question,
			options: options.map(text => ({ text, votes: [] })),
			familyId,
			createdAt: serverTimestamp(),
			expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			totalVotes: 0,
			isClosed: false,
			resultsPosted: false
		});

		// Add a real poll entry to Fun Feed (not a suggestion)
		await SmartEngine.addEnhancedFunFeedEntry('poll', {
			text: `📊 ${await SmartEngine.getUserDisplayName(uid)} created a poll: ${question}`,
			createdBy: uid,
			rarity: 'common',
			metadata: {
				pollQuestion: question
			}
		});

		// Track milestone progress
		await SmartEngine.updateMilestoneProgress(uid, 'poll_created');
		await SmartEngine.updateMilestoneProgress(uid, 'daily_interaction');

		console.log(`[FamilyBot] Created poll from suggestion: ${pollDoc.id}`);
		
	} catch (error) {
		console.error('[FamilyBot] Failed to create poll from suggestion:', error);
		throw error;
	}
}
