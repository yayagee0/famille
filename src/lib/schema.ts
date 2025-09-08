/**
 * Firestore Schema Enforcement
 * 
 * Strict TypeScript interfaces for all FamilyBot collections.
 * All documents must be created lazily (self-seeding), no manual seed required.
 */

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// ============================================================================
// CORE USER INTERFACES
// ============================================================================

export interface UserProfile {
	uid: string;
	displayName: string | null;
	email: string;
	nickname?: string;
	avatarUrl?: string | null;
	photoURL?: string | null;
	createdAt: Timestamp;
	lastLoginAt: Timestamp;
	lastUpdatedAt: Timestamp;
}

export interface UserFeedback {
	id?: string;
	message: string;
	topic: string; // New field for categorization
	source: 'FamilyBot' | 'Manual' | 'WeeklyReflection';
	createdAt: Timestamp;
	userId: string;
}

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
	type: 'positive' | 'bonding' | 'constructive' | 'reflection' | 'islamic' | 'personalized';
	createdAt: Timestamp;
	readAt?: Timestamp;
}

export interface UserBadge {
	id?: string;
	userId: string;
	badgeId: string;
	name: string;
	description: string;
	category: 'social' | 'learning' | 'consistency' | 'special';
	rarity: 'common' | 'rare' | 'legendary'; // New field for Phase 6
	earnedAt: Timestamp;
	notificationSent: boolean;
	reason: string; // Short explanation why badge was earned
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

// ============================================================================
// FAMILYBOT COLLECTIONS
// ============================================================================

export interface DailyPoll {
	id?: string;
	question: string;
	options: Array<{
		text: string;
		votes: string[]; // Array of user UIDs
	}>;
	familyId: string;
	createdBy?: string; // Phase 8: Track who created the poll
	createdAt: Timestamp;
	expiresAt: number; // Unix timestamp
	totalVotes: number;
	isClosed?: boolean;
	resultsPosted?: boolean;
	isCustom?: boolean; // Phase 8: Mark custom polls
	childCreated?: boolean; // Phase 8: Psychology tracking
}

export interface UserPreferences {
	uid: string;
	pollChoices: Record<string, number>; // option -> count
	storyThemes: Record<string, number>; // theme -> count  
	feedbackSent: number;
	lastUpdated: Timestamp;
	createdAt: Timestamp;
}

export interface BotTurnTracker {
	global: Record<string, number>; // uid -> turn count
	lastAssigned: string | null;
	totalTurns: number;
	lastUpdated: Timestamp;
}

export interface StoryTemplate {
	id?: string;
	template: string; // Story with placeholders {trait}, {ayah}, {theme}
	theme: 'islamic' | 'family' | 'adventure' | 'fantasy' | 'wisdom' | 'seasonal';
	category: string; // Sub-category for organization
	hasTraitPlaceholder: boolean;
	hasAyahPlaceholder: boolean;
	hasThemePlaceholder: boolean;
	weight: number; // Selection probability weight (0.1 to 2.0)
	familyId: string;
	createdAt: Timestamp;
}

export interface SeasonalContent {
	id?: string;
	season: 'ramadan' | 'eid' | 'winter' | 'spring' | 'summer' | 'autumn';
	title: string;
	description: string;
	content: string;
	type: 'banner' | 'activity' | 'story' | 'poll';
	isActive: boolean;
	startDate: Timestamp;
	endDate: Timestamp;
	familyId: string;
	createdAt: Timestamp;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface UserDailyMetrics {
	userId: string;
	nudgeShown: boolean;
	nudgeAnswered: boolean;
	nudgeSkipped: boolean;
	feedbackCompleted: boolean;
	pollVoted: boolean;
	islamicQuestionsAnswered: number;
	islamicQuestionsCorrect: number;
	badgesEarned: number;
	postsCreated: number;
	commentsPosted: number;
	likesGiven: number;
	lastSeen: Date;
}

export interface DailyAnalytics {
	date: string; // YYYY-MM-DD
	familyId: string;
	metrics: {
		// FamilyBot specific metrics
		nudgesGenerated: number;
		nudgesShown: number;
		nudgesAnswered: number;
		nudgesSkipped: number;
		nudgeEngagementRate: number; // answered / shown
		
		// Feedback metrics
		feedbackGenerated: number;
		feedbackCompleted: number;
		feedbackCompletionRate: number; // completed / generated
		
		// Poll metrics
		pollsGenerated: number;
		pollVotes: number;
		pollParticipationRate: number; // votes / polls
		
		// Islamic learning metrics
		islamicQuestionsAnswered: number;
		islamicQuestionsCorrect: number;
		islamicAccuracyRate: number; // correct / answered
		
		// Badge metrics
		badgesEarned: number;
		
		// General engagement metrics
		activeUsers: number;
		postsCreated: number;
		commentsPosted: number;
		likesGiven: number;
	};
	userMetrics: Record<string, UserDailyMetrics>; // uid -> metrics
	createdAt: Timestamp;
	updatedAt: Date;
}

export interface FunFeedEntry {
	id?: string;
	type: 'poll' | 'story' | 'feedback' | 'badge' | 'pollSuggestion' | 'feedbackSuggestion' | 'storySuggestion'; // Added story suggestion type
	text: string;
	createdBy: string; // uid
	familyId: string;
	createdAt: Timestamp;
	// Phase 6 enrichment fields
	rarity?: 'common' | 'rare' | 'legendary'; // For badge entries
	// Phase 7 reactions system
	reactions?: Record<string, string[]>; // emoji -> uid[] mapping
	// Phase 9 comments system
	comments?: FunFeedComment[]; // Comment threads
	metadata?: {
		pollQuestion?: string; // For poll entries and suggestions
		storyPreview?: string; // For story entries  
		feedbackTopic?: string; // For feedback entries and suggestions
		badgeIcon?: string; // For badge entries
		suggestedBy?: string; // For suggestion entries
		suggestedAt?: string; // For suggestion entries
		content?: string; // General content for suggestions
		storyTheme?: string; // For story suggestions
		targetNickname?: string; // For personalized story suggestions
	};
}

export interface FunFeedComment {
	id?: string;
	text: string;
	createdBy: string; // uid
	createdAt: Timestamp;
}

// ============================================================================
// PHASE 8: MEMORY NUDGES AND SEASONAL BADGES
// ============================================================================

export interface MemoryNudge {
	userId: string;
	message: string;
	basedOn: 'story' | 'poll' | 'feedback' | 'interaction';
	lastActivity: string;
	lastActivityDate: string;
	createdAt: Timestamp;
	gentle: boolean; // Always true for children's psychology
}

export interface SeasonalBadge {
	userId: string;
	badgeId: string;
	name: string;
	icon: string;
	rarity: 'seasonal';
	yearEarned: number;
	requirement: string;
	earnedAt: Timestamp;
	reason: string;
}

export interface StoryTemplate {
	id: string;
	title: string;
	category: 'Islamic Wisdom' | 'Family Bonding' | 'Adventure' | 'Fantasy' | 'Wisdom & Reflection' | 'Seasonal Specials';
	chapters: string[]; // Multi-chapter support
	choices?: {
		[chapterIndex: number]: {
			question: string;
			options: Array<{
				text: string;
				nextChapter: number;
				emoji: string;
			}>;
		};
	};
	placeholders: {
		nickname?: boolean;
		trait1?: boolean;
		trait2?: boolean;
		ayah?: boolean;
		theme?: boolean;
	};
	reflection?: {
		question: string;
		ayah: string;
		reference: string;
	};
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const userProfileSchema = z.object({
	uid: z.string().min(1),
	displayName: z.string().nullable(),
	email: z.string().email(),
	nickname: z.string().optional(),
	avatarUrl: z.string().url().nullable().optional(),
	photoURL: z.string().url().nullable().optional(),
	createdAt: z.any(), // Timestamp
	lastLoginAt: z.any(), // Timestamp
	lastUpdatedAt: z.any() // Timestamp
});

export const userFeedbackSchema = z.object({
	message: z.string().min(1),
	topic: z.string().min(1),
	source: z.enum(['FamilyBot', 'Manual', 'WeeklyReflection']),
	createdAt: z.any(), // Timestamp
	userId: z.string().min(1)
});

export const userNudgeSchema = z.object({
	userId: z.string().min(1),
	templateId: z.string().min(1),
	generatedText: z.string().min(1),
	character: z.string().min(1),
	traits: z.array(z.string()),
	islamicContext: z.object({
		ayah: z.string(),
		reference: z.string()
	}).optional(),
	type: z.enum(['positive', 'bonding', 'constructive', 'reflection', 'islamic', 'personalized']),
	createdAt: z.any(), // Timestamp
	readAt: z.any().optional() // Timestamp
});

export const userBadgeSchema = z.object({
	userId: z.string().min(1),
	badgeId: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	category: z.enum(['social', 'learning', 'consistency', 'special']),
	rarity: z.enum(['common', 'rare', 'legendary']), // Added for Phase 6
	earnedAt: z.any(), // Timestamp
	notificationSent: z.boolean(),
	reason: z.string().min(1)
});

export const userBadgeCountersSchema = z.object({
	userId: z.string().min(1),
	pollsCreated: z.number().min(0),
	storiesRead: z.number().min(0),
	feedbackSubmitted: z.number().min(0),
	pollVotes: z.number().min(0),
	islamicStoriesRead: z.number().min(0),
	consecutiveDays: z.number().min(0),
	lastInteractionDate: z.string(),
	createdAt: z.any(), // Timestamp
	updatedAt: z.any() // Timestamp
});

export const dailyPollSchema = z.object({
	question: z.string().min(1),
	options: z.array(z.object({
		text: z.string().min(1),
		votes: z.array(z.string())
	})).min(2),
	familyId: z.string().min(1),
	createdBy: z.string().optional(), // Added for Phase 8 custom polls
	createdAt: z.any(), // Timestamp
	expiresAt: z.number(),
	totalVotes: z.number().min(0),
	isClosed: z.boolean().optional(),
	resultsPosted: z.boolean().optional(),
	isCustom: z.boolean().optional(), // Phase 8: Mark custom polls
	childCreated: z.boolean().optional() // Phase 8: Psychology tracking
});

export const userPreferencesSchema = z.object({
	uid: z.string().min(1),
	pollChoices: z.record(z.string(), z.number().min(0)),
	storyThemes: z.record(z.string(), z.number().min(0)),
	feedbackSent: z.number().min(0),
	lastUpdated: z.any(), // Timestamp
	createdAt: z.any() // Timestamp
});

export const botTurnTrackerSchema = z.object({
	global: z.record(z.string(), z.number().min(0)),
	lastAssigned: z.string().nullable(),
	totalTurns: z.number().min(0),
	lastUpdated: z.any() // Timestamp
});

export const storyTemplateSchema = z.object({
	template: z.string().min(1),
	theme: z.enum(['islamic', 'family', 'adventure', 'fantasy', 'wisdom', 'seasonal']),
	category: z.string().min(1),
	hasTraitPlaceholder: z.boolean(),
	hasAyahPlaceholder: z.boolean(),
	hasThemePlaceholder: z.boolean(),
	weight: z.number().min(0.1).max(2.0),
	familyId: z.string().min(1),
	createdAt: z.any() // Timestamp
});

export const seasonalContentSchema = z.object({
	season: z.enum(['ramadan', 'eid', 'winter', 'spring', 'summer', 'autumn']),
	title: z.string().min(1),
	description: z.string().min(1),
	content: z.string().min(1),
	type: z.enum(['banner', 'activity', 'story', 'poll']),
	isActive: z.boolean(),
	startDate: z.any(), // Timestamp
	endDate: z.any(), // Timestamp
	familyId: z.string().min(1),
	createdAt: z.any() // Timestamp
});

export const userDailyMetricsSchema = z.object({
	userId: z.string().min(1),
	nudgeShown: z.boolean(),
	nudgeAnswered: z.boolean(),
	nudgeSkipped: z.boolean(),
	feedbackCompleted: z.boolean(),
	pollVoted: z.boolean(),
	islamicQuestionsAnswered: z.number().min(0),
	islamicQuestionsCorrect: z.number().min(0),
	badgesEarned: z.number().min(0),
	postsCreated: z.number().min(0),
	commentsPosted: z.number().min(0),
	likesGiven: z.number().min(0),
	lastSeen: z.date()
});

export const dailyAnalyticsSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
	familyId: z.string().min(1),
	metrics: z.object({
		nudgesGenerated: z.number().min(0),
		nudgesShown: z.number().min(0),
		nudgesAnswered: z.number().min(0),
		nudgesSkipped: z.number().min(0),
		nudgeEngagementRate: z.number().min(0).max(1),
		feedbackGenerated: z.number().min(0),
		feedbackCompleted: z.number().min(0),
		feedbackCompletionRate: z.number().min(0).max(1),
		pollsGenerated: z.number().min(0),
		pollVotes: z.number().min(0),
		pollParticipationRate: z.number().min(0),
		islamicQuestionsAnswered: z.number().min(0),
		islamicQuestionsCorrect: z.number().min(0),
		islamicAccuracyRate: z.number().min(0).max(1),
		badgesEarned: z.number().min(0),
		activeUsers: z.number().min(0),
		postsCreated: z.number().min(0),
		commentsPosted: z.number().min(0),
		likesGiven: z.number().min(0)
	}),
	userMetrics: z.record(z.string(), userDailyMetricsSchema),
	createdAt: z.any(), // Timestamp
	updatedAt: z.date()
});

export const funFeedEntrySchema = z.object({
	id: z.string().optional(),
	type: z.enum(['poll', 'story', 'feedback', 'badge', 'pollSuggestion', 'feedbackSuggestion']), // Added suggestion types
	text: z.string().min(1),
	createdBy: z.string().min(1),
	familyId: z.string().min(1),
	createdAt: z.any(), // Timestamp
	rarity: z.enum(['common', 'rare', 'legendary']).optional(),
	metadata: z.object({
		pollQuestion: z.string().optional(),
		storyPreview: z.string().optional(),
		feedbackTopic: z.string().optional(),
		badgeIcon: z.string().optional(),
		suggestedBy: z.string().optional(),
		suggestedAt: z.string().optional(),
		content: z.string().optional()
	}).optional()
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateUserProfile(data: unknown) {
	try {
		return { success: true as const, data: userProfileSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserFeedback(data: unknown) {
	try {
		return { success: true as const, data: userFeedbackSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserNudge(data: unknown) {
	try {
		return { success: true as const, data: userNudgeSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserBadge(data: unknown) {
	try {
		return { success: true as const, data: userBadgeSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserBadgeCounters(data: unknown) {
	try {
		return { success: true as const, data: userBadgeCountersSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateDailyPoll(data: unknown) {
	try {
		return { success: true as const, data: dailyPollSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserPreferences(data: unknown) {
	try {
		return { success: true as const, data: userPreferencesSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateBotTurnTracker(data: unknown) {
	try {
		return { success: true as const, data: botTurnTrackerSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateStoryTemplate(data: unknown) {
	try {
		return { success: true as const, data: storyTemplateSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateSeasonalContent(data: unknown) {
	try {
		return { success: true as const, data: seasonalContentSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateDailyAnalytics(data: unknown) {
	try {
		return { success: true as const, data: dailyAnalyticsSchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateFunFeedEntry(data: unknown) {
	try {
		return { success: true as const, data: funFeedEntrySchema.parse(data) };
	} catch (error) {
		return { success: false as const, error };
	}
}

// ============================================================================
// COLLECTION HELPERS
// ============================================================================

export const COLLECTION_PATHS = {
	// User sub-collections
	USER_PROFILE: (uid: string) => `users/${uid}/profile`,
	USER_FEEDBACK: (uid: string) => `users/${uid}/feedback`,
	USER_NUDGES: (uid: string) => `users/${uid}/nudges`,
	USER_BADGES: (uid: string) => `users/${uid}/badges`,
	
	// FamilyBot collections
	DAILY_POLLS: 'daily_polls',
	PREFERENCES: 'preferences',
	BOT_TURNS: 'bot_turns',
	STORY_TEMPLATES: 'story_templates',
	SEASONAL: 'seasonal',
	ANALYTICS: 'analytics',
	FUN_FEED: 'fun_feed',
	USER_BADGE_COUNTERS: 'user_badge_counters'
} as const;

export const DOCUMENT_IDS = {
	BOT_TURNS_GLOBAL: 'global'
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// All types are exported via the interface declarations above