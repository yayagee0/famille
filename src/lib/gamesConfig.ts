/**
 * Centralized game configuration
 * Defines all games, their IDs, titles, icons, and display order
 */

export interface GameConfig {
	id: string;
	title: string;
	icon: string;
	description: string;
	order: number;
}

export const GAMES_CONFIG: GameConfig[] = [
	{
		id: 'tictactoe',
		title: 'Tic-Tac-Toe',
		icon: '🎮',
		description: 'Challenge the AI to a classic game',
		order: 1
	},
	{
		id: 'math',
		title: 'Math Game',
		icon: '🧮',
		description: 'Test your math skills with timed questions',
		order: 2
	}
];

// Get games in display order
export function getGamesInOrder(): GameConfig[] {
	return GAMES_CONFIG.sort((a, b) => a.order - b.order);
}

// Get game config by ID
export function getGameConfig(gameId: string): GameConfig | undefined {
	return GAMES_CONFIG.find(game => game.id === gameId);
}

// Get all game IDs
export function getAllGameIds(): string[] {
	return GAMES_CONFIG.map(game => game.id);
}