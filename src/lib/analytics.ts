import {
	getFirestore,
	collection,
	query,
	where,
	orderBy,
	getDocs,
	limit
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { DailyAnalytics } from '$lib/data/analytics';

/**
 * Analytics query interface for typed results
 */
export interface AnalyticsQueryResult {
	date: string; // YYYY-MM-DD
	nudgesShown: number;
	nudgesAnswered: number;
	nudgesSkipped: number;
	feedbackCompleted: number;
	pollVotes: number;
	// Include other metrics for completeness
	metrics?: {
		nudgesGenerated: number;
		nudgeEngagementRate: number;
		feedbackGenerated: number;
		feedbackCompletionRate: number;
		pollsGenerated: number;
		pollParticipationRate: number;
		islamicQuestionsAnswered: number;
		islamicQuestionsCorrect: number;
		islamicAccuracyRate: number;
		badgesEarned: number;
		activeUsers: number;
		totalInteractions: number;
		averageSessionTime: number;
	};
}

/**
 * Query analytics collection with optional date range filtering
 * @param startDate Optional start date in YYYY-MM-DD format. If not provided, defaults to 30 days ago
 * @param endDate Optional end date in YYYY-MM-DD format. If not provided, defaults to today
 * @returns Promise<AnalyticsQueryResult[]> Array of analytics results sorted by date descending
 */
export async function queryAnalytics(
	startDate?: string,
	endDate?: string
): Promise<AnalyticsQueryResult[]> {
	try {
		// Calculate default date range (last 30 days) if not provided
		let queryStartDate = startDate;
		if (!queryStartDate) {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			queryStartDate = thirtyDaysAgo.toISOString().split('T')[0];
		}

		// Build the query
		let analyticsQuery = query(collection(db, 'analytics'), orderBy('date', 'desc'));

		// Add date filtering if start date is provided
		if (queryStartDate) {
			analyticsQuery = query(
				collection(db, 'analytics'),
				where('date', '>=', queryStartDate),
				orderBy('date', 'desc')
			);
		}

		// Add end date filter if provided
		if (endDate) {
			analyticsQuery = query(
				collection(db, 'analytics'),
				where('date', '>=', queryStartDate || '1970-01-01'),
				where('date', '<=', endDate),
				orderBy('date', 'desc')
			);
		}

		// Execute the query
		const analyticsSnapshot = await getDocs(analyticsQuery);

		// Transform results to typed interface
		const results: AnalyticsQueryResult[] = analyticsSnapshot.docs.map((doc) => {
			const data = doc.data() as DailyAnalytics;

			return {
				date: data.date,
				nudgesShown: data.metrics?.nudgesShown || 0,
				nudgesAnswered: data.metrics?.nudgesAnswered || 0,
				nudgesSkipped: data.metrics?.nudgesSkipped || 0,
				feedbackCompleted: data.metrics?.feedbackCompleted || 0,
				pollVotes: data.metrics?.pollVotes || 0,
				metrics: data.metrics
			};
		});

		return results;
	} catch (error) {
		console.error('Error querying analytics collection:', error);
		throw new Error(`Failed to query analytics: ${error}`);
	}
}

/**
 * Get the most recent analytics documents (last 30 days by default)
 * @param limitCount Maximum number of documents to return
 * @returns Promise<AnalyticsQueryResult[]>
 */
export async function getRecentAnalytics(limitCount: number = 30): Promise<AnalyticsQueryResult[]> {
	try {
		const recentQuery = query(
			collection(db, 'analytics'),
			orderBy('date', 'desc'),
			limit(limitCount)
		);

		const snapshot = await getDocs(recentQuery);

		return snapshot.docs.map((doc) => {
			const data = doc.data() as DailyAnalytics;

			return {
				date: data.date,
				nudgesShown: data.metrics?.nudgesShown || 0,
				nudgesAnswered: data.metrics?.nudgesAnswered || 0,
				nudgesSkipped: data.metrics?.nudgesSkipped || 0,
				feedbackCompleted: data.metrics?.feedbackCompleted || 0,
				pollVotes: data.metrics?.pollVotes || 0,
				metrics: data.metrics
			};
		});
	} catch (error) {
		console.error('Error getting recent analytics:', error);
		throw new Error(`Failed to get recent analytics: ${error}`);
	}
}

/**
 * Get analytics for a specific date range with aggregated totals
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns Promise<{daily: AnalyticsQueryResult[], totals: AnalyticsQueryResult}>
 */
export async function getAnalyticsRange(
	startDate: string,
	endDate: string
): Promise<{ daily: AnalyticsQueryResult[]; totals: AnalyticsQueryResult }> {
	try {
		const daily = await queryAnalytics(startDate, endDate);

		// Calculate aggregated totals
		const totals: AnalyticsQueryResult = {
			date: `${startDate}_to_${endDate}`,
			nudgesShown: daily.reduce((sum, day) => sum + day.nudgesShown, 0),
			nudgesAnswered: daily.reduce((sum, day) => sum + day.nudgesAnswered, 0),
			nudgesSkipped: daily.reduce((sum, day) => sum + day.nudgesSkipped, 0),
			feedbackCompleted: daily.reduce((sum, day) => sum + day.feedbackCompleted, 0),
			pollVotes: daily.reduce((sum, day) => sum + day.pollVotes, 0)
		};

		return { daily, totals };
	} catch (error) {
		console.error('Error getting analytics range:', error);
		throw new Error(`Failed to get analytics range: ${error}`);
	}
}

// Export the type for use in components
export type { AnalyticsQueryResult as AnalyticsResult };
