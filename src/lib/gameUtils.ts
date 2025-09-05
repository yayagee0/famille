/**
 * Shared utility for recording game results
 * Uses the unified schema: games/{gameId}/results/{uid}
 */

import { auth, db } from '$lib/firebase';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

export interface GameResult {
	score?: number; // Points scored (for point-based games like Math Game)
	wins?: number; // Wins increment (for win/loss games like Tic-Tac-Toe)
	losses?: number; // Losses increment (for win/loss games like Tic-Tac-Toe)
}

/**
 * Record a game result to Firestore using the unified schema
 * @param userId - The user's UID
 * @param gameId - The game identifier (e.g., 'tictactoe', 'math')
 * @param result - The game result to record
 */
export async function recordGameResult(
	userId: string,
	gameId: string,
	result: GameResult
): Promise<void> {
	if (!userId || !gameId) {
		throw new Error('User ID and Game ID are required');
	}

	try {
		const resultRef = doc(db, 'games', gameId, 'results', userId);

		// Build the update object
		const updateData: any = {
			updatedAt: serverTimestamp()
		};

		// Add score increment if provided
		if (typeof result.score === 'number' && result.score >= 0) {
			updateData.score = increment(result.score);
		}

		// Add wins increment if provided
		if (typeof result.wins === 'number' && result.wins > 0) {
			updateData.wins = increment(result.wins);
		}

		// Add losses increment if provided
		if (typeof result.losses === 'number' && result.losses > 0) {
			updateData.losses = increment(result.losses);
		}

		// Save to Firestore with merge to handle missing documents
		await setDoc(resultRef, updateData, { merge: true });
	} catch (error) {
		console.error('Error recording game result:', error);
		throw error;
	}
}

/**
 * Helper function to record a win for win/loss based games
 * @param userId - The user's UID
 * @param gameId - The game identifier
 */
export async function recordWin(userId: string, gameId: string): Promise<void> {
	return recordGameResult(userId, gameId, { wins: 1 });
}

/**
 * Helper function to record a loss for win/loss based games
 * @param userId - The user's UID
 * @param gameId - The game identifier
 */
export async function recordLoss(userId: string, gameId: string): Promise<void> {
	return recordGameResult(userId, gameId, { losses: 1 });
}

/**
 * Helper function to record a score for point-based games
 * @param userId - The user's UID
 * @param gameId - The game identifier
 * @param score - The points to add
 */
export async function recordScore(userId: string, gameId: string, score: number): Promise<void> {
	return recordGameResult(userId, gameId, { score });
}
