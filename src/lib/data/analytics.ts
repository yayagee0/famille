/**
 * Analytics System Data
 *
 * Tracks daily engagement and self-optimizes nudge delivery
 * Writes logs to analytics/{date} for monitoring and optimization
 */

export interface DailyAnalytics {
	id?: string; // Format: YYYY-MM-DD
	date: string; // YYYY-MM-DD format
	familyId: string;
	metrics: {
		// Nudges
		nudgesGenerated: number;
		nudgesShown: number;
		nudgesAnswered: number;
		nudgesSkipped: number;
		nudgeEngagementRate: number; // answered / shown

		// Feedback
		feedbackGenerated: number;
		feedbackCompleted: number;
		feedbackCompletionRate: number;

		// Polls
		pollsGenerated: number;
		pollVotes: number;
		pollParticipationRate: number;

		// Islamic Learning
		islamicQuestionsAnswered: number;
		islamicQuestionsCorrect: number;
		islamicAccuracyRate: number;

		// Badges
		badgesEarned: number;

		// Overall Engagement
		activeUsers: number;
		totalInteractions: number;
		averageSessionTime: number;
	};
	userMetrics: Record<string, UserDailyMetrics>; // userId -> metrics
	optimization: {
		recommendedNudgeTypes: string[]; // Based on engagement patterns
		lowEngagementUsers: string[]; // Users who need more playful nudges
		highEngagementUsers: string[]; // Users who can handle more constructive nudges
	};
	createdAt: Date;
	updatedAt: Date;
}

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
	sessionTime: number; // minutes
	lastSeen: Date;
}

export interface EngagementPattern {
	userId: string;
	weeklyTrend: 'increasing' | 'decreasing' | 'stable';
	preferredNudgeTypes: string[];
	bestEngagementTime: string; // hour of day
	streakDays: number;
	riskLevel: 'low' | 'medium' | 'high'; // disengagement risk
}

export interface OptimizationRule {
	id: string;
	condition: string;
	action: string;
	description: string;
	priority: number;
}

// Self-Optimization Rules
export const optimizationRules: OptimizationRule[] = [
	{
		id: 'low_engagement_boost',
		condition: 'user.engagementRate < 0.3 for 3 days',
		action: 'increase playful nudges, reduce constructive ones',
		description: 'Boost engagement with more positive content',
		priority: 10
	},
	{
		id: 'high_engagement_challenge',
		condition: 'user.engagementRate > 0.8 for 7 days',
		action: 'introduce more reflection and constructive nudges',
		description: 'Challenge highly engaged users with deeper content',
		priority: 8
	},
	{
		id: 'islamic_learning_stagnation',
		condition: 'user.islamicQuestionsAnswered == 0 for 5 days',
		action: 'increase islamic nudge frequency',
		description: 'Encourage Islamic learning progression',
		priority: 9
	},
	{
		id: 'poll_avoidance',
		condition: 'user.pollParticipation < 0.2 for 7 days',
		action: 'generate sillier, more appealing poll options',
		description: 'Re-engage users who avoid polls',
		priority: 6
	},
	{
		id: 'feedback_resistance',
		condition: 'user.feedbackCompletion == 0 for 2 weeks',
		action: 'simplify feedback questions, add encouragement',
		description: 'Make feedback more approachable',
		priority: 7
	},
	{
		id: 'seasonal_adjustment',
		condition: 'during ramadan or eid periods',
		action: 'boost islamic content, reduce constructive nudges',
		description: 'Adjust content for seasonal appropriateness',
		priority: 5
	},
	{
		id: 'weekend_pattern',
		condition: 'weekend engagement significantly different',
		action: 'adjust weekend nudge timing and type',
		description: 'Optimize for weekend usage patterns',
		priority: 4
	}
];

// Analytics Collection Functions
export class AnalyticsEngine {
	/**
	 * Initialize daily analytics document
	 */
	static initializeDailyAnalytics(date: string, familyId: string): DailyAnalytics {
		return {
			id: date,
			date,
			familyId,
			metrics: {
				nudgesGenerated: 0,
				nudgesShown: 0,
				nudgesAnswered: 0,
				nudgesSkipped: 0,
				nudgeEngagementRate: 0,
				feedbackGenerated: 0,
				feedbackCompleted: 0,
				feedbackCompletionRate: 0,
				pollsGenerated: 0,
				pollVotes: 0,
				pollParticipationRate: 0,
				islamicQuestionsAnswered: 0,
				islamicQuestionsCorrect: 0,
				islamicAccuracyRate: 0,
				badgesEarned: 0,
				activeUsers: 0,
				totalInteractions: 0,
				averageSessionTime: 0
			},
			userMetrics: {},
			optimization: {
				recommendedNudgeTypes: ['positive', 'bonding'],
				lowEngagementUsers: [],
				highEngagementUsers: []
			},
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	/**
	 * Initialize user daily metrics
	 */
	static initializeUserMetrics(userId: string): UserDailyMetrics {
		return {
			userId,
			nudgeShown: false,
			nudgeAnswered: false,
			nudgeSkipped: false,
			feedbackCompleted: false,
			pollVoted: false,
			islamicQuestionsAnswered: 0,
			islamicQuestionsCorrect: 0,
			badgesEarned: 0,
			sessionTime: 0,
			lastSeen: new Date()
		};
	}

	/**
	 * Analyze engagement patterns and generate optimization recommendations
	 */
	static analyzeEngagementPatterns(
		userMetrics: UserDailyMetrics[],
		historicalData: DailyAnalytics[]
	): EngagementPattern[] {
		const patterns: EngagementPattern[] = [];

		// Group metrics by user
		const userHistories = userMetrics.reduce(
			(acc, metrics) => {
				if (!acc[metrics.userId]) acc[metrics.userId] = [];
				acc[metrics.userId].push(metrics);
				return acc;
			},
			{} as Record<string, UserDailyMetrics[]>
		);

		// Analyze each user's pattern
		Object.entries(userHistories).forEach(([userId, history]) => {
			const pattern = this.analyzeUserPattern(userId, history, historicalData);
			patterns.push(pattern);
		});

		return patterns;
	}

	/**
	 * Analyze individual user engagement pattern
	 */
	private static analyzeUserPattern(
		userId: string,
		history: UserDailyMetrics[],
		historicalData: DailyAnalytics[]
	): EngagementPattern {
		// Calculate engagement rate over time
		const recentEngagement = history.slice(-7); // Last 7 days
		const engagementRates = recentEngagement.map((day) => {
			let interactions = 0;
			let opportunities = 0;

			if (day.nudgeShown) {
				opportunities++;
				if (day.nudgeAnswered) interactions++;
			}

			if (day.feedbackCompleted) {
				interactions++;
				opportunities++;
			}

			if (day.pollVoted) {
				interactions++;
				opportunities++;
			}

			return opportunities > 0 ? interactions / opportunities : 0;
		});

		// Calculate trend
		const earlierRate = engagementRates.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
		const laterRate = engagementRates.slice(-3).reduce((a, b) => a + b, 0) / 3;

		let weeklyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
		if (laterRate > earlierRate + 0.1) weeklyTrend = 'increasing';
		else if (laterRate < earlierRate - 0.1) weeklyTrend = 'decreasing';

		// Determine preferred nudge types
		const preferredNudgeTypes = ['positive', 'bonding']; // Default, could be enhanced

		// Calculate risk level
		const averageEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
		let riskLevel: 'low' | 'medium' | 'high' = 'low';
		if (averageEngagement < 0.3) riskLevel = 'high';
		else if (averageEngagement < 0.6) riskLevel = 'medium';

		// Calculate streak
		let streakDays = 0;
		for (let i = history.length - 1; i >= 0; i--) {
			const day = history[i];
			if (day.nudgeAnswered || day.feedbackCompleted || day.pollVoted) {
				streakDays++;
			} else {
				break;
			}
		}

		return {
			userId,
			weeklyTrend,
			preferredNudgeTypes,
			bestEngagementTime: '10', // Default to 10 AM, could be calculated
			streakDays,
			riskLevel
		};
	}

	/**
	 * Generate optimization recommendations based on patterns
	 */
	static generateOptimizationRecommendations(
		patterns: EngagementPattern[],
		currentAnalytics: DailyAnalytics
	): DailyAnalytics['optimization'] {
		const lowEngagementUsers = patterns.filter((p) => p.riskLevel === 'high').map((p) => p.userId);

		const highEngagementUsers = patterns
			.filter((p) => p.riskLevel === 'low' && p.weeklyTrend === 'increasing')
			.map((p) => p.userId);

		// Determine recommended nudge types based on overall engagement
		let recommendedNudgeTypes = ['positive', 'bonding'];

		const overallEngagement = currentAnalytics.metrics.nudgeEngagementRate;
		if (overallEngagement < 0.4) {
			recommendedNudgeTypes = ['positive', 'bonding', 'personalized'];
		} else if (overallEngagement > 0.7) {
			recommendedNudgeTypes = ['positive', 'bonding', 'reflection', 'constructive'];
		}

		return {
			recommendedNudgeTypes,
			lowEngagementUsers,
			highEngagementUsers
		};
	}
}
