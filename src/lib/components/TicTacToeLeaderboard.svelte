<script lang="ts">
	import { onMount } from 'svelte';
	import { db, getFamilyId } from '$lib/firebase';
	import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';

	interface GameResult {
		id: string;
		authorUid: string;
		author: { displayName: string; avatarUrl?: string };
		winner: 'X' | 'O' | null;
		gameMode: 'human' | 'easy' | 'hard';
		result: 'X' | 'O' | 'tie';
		timestamp: Date;
		createdAt: Date;
	}

	interface PlayerStats {
		uid: string;
		displayName: string;
		avatarUrl?: string;
		wins: number;
		losses: number;
		ties: number;
		totalGames: number;
		winRate: number;
	}

	let games = $state<GameResult[]>([]);
	let playerStats = $state<PlayerStats[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadGameHistory() {
		try {
			loading = true;
			error = null;

			const gamesQuery = query(
				collection(db, 'posts'),
				where('familyId', '==', getFamilyId()),
				where('type', '==', 'tic-tac-toe-game'),
				orderBy('createdAt', 'desc'),
				limit(20)
			);

			const snapshot = await getDocs(gamesQuery);
			const rawGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

			// Enrich with author data - simplified for now
			games = rawGames.map(game => ({
				...game,
				author: { displayName: 'Player', avatarUrl: undefined },
				timestamp: game.timestamp?.toDate() || new Date(),
				createdAt: game.createdAt?.toDate() || new Date()
			})) as GameResult[];

			// Calculate player stats
			calculatePlayerStats();
		} catch (err) {
			console.error('Failed to load game history:', err);
			error = 'Failed to load game history';
		} finally {
			loading = false;
		}
	}

	function calculatePlayerStats() {
		const statsMap = new Map<string, PlayerStats>();

		for (const game of games) {
			if (!statsMap.has(game.authorUid)) {
				statsMap.set(game.authorUid, {
					uid: game.authorUid,
					displayName: game.author.displayName,
					avatarUrl: game.author.avatarUrl,
					wins: 0,
					losses: 0,
					ties: 0,
					totalGames: 0,
					winRate: 0
				});
			}

			const stats = statsMap.get(game.authorUid)!;
			stats.totalGames++;

			if (game.result === 'tie') {
				stats.ties++;
			} else if (game.result === 'X') {
				// Assuming human always plays as X
				stats.wins++;
			} else {
				stats.losses++;
			}

			stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
		}

		playerStats = Array.from(statsMap.values())
			.sort((a, b) => b.winRate - a.winRate);
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getGameModeEmoji(mode: string): string {
		switch (mode) {
			case 'human': return '👥';
			case 'easy': return '🤖';
			case 'hard': return '🧠';
			default: return '🎯';
		}
	}

	function getResultEmoji(result: string): string {
		switch (result) {
			case 'X': return '🏆';
			case 'O': return '🤖';
			case 'tie': return '🤝';
			default: return '❓';
		}
	}

	onMount(() => {
		loadGameHistory();
	});
</script>

<div class="rounded-2xl bg-white p-6 shadow-sm">
	<div class="mb-6 text-center">
		<h3 class="text-xl font-bold text-gray-900">🏆 Game Leaderboard</h3>
		<p class="mt-1 text-sm text-gray-500">Recent Tic-Tac-Toe game results</p>
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<LoadingSpinner size="medium" />
		</div>
	{:else if error}
		<div class="rounded-lg bg-red-50 p-4">
			<p class="text-sm text-red-600">{error}</p>
			<button
				class="mt-2 text-sm text-red-800 underline hover:text-red-900"
				onclick={loadGameHistory}
			>
				Try again
			</button>
		</div>
	{:else}
		<!-- Player Stats -->
		{#if playerStats.length > 0}
			<div class="mb-6">
				<h4 class="mb-3 text-lg font-semibold text-gray-900">Player Stats</h4>
				<div class="space-y-2">
					{#each playerStats as stats, index}
						<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
							<div class="flex items-center space-x-3">
								<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
									{index + 1}
								</span>
								<span class="font-medium text-gray-900">{stats.displayName}</span>
							</div>
							<div class="flex items-center space-x-4 text-sm text-gray-600">
								<span>🏆 {stats.wins}</span>
								<span>❌ {stats.losses}</span>
								<span>🤝 {stats.ties}</span>
								<span class="font-semibold text-indigo-600">{stats.winRate.toFixed(1)}%</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recent Games -->
		<div>
			<h4 class="mb-3 text-lg font-semibold text-gray-900">Recent Games</h4>
			{#if games.length === 0}
				<p class="text-center text-gray-500 py-8">No games played yet. Start a game above!</p>
			{:else}
				<div class="space-y-2">
					{#each games as game}
						<div class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
							<div class="flex items-center space-x-3">
								<span class="text-lg">{getGameModeEmoji(game.gameMode)}</span>
								<div>
									<p class="font-medium text-gray-900">{game.author.displayName}</p>
									<p class="text-xs text-gray-500">{formatDate(game.timestamp)}</p>
								</div>
							</div>
							<div class="flex items-center space-x-2">
								<span class="text-lg">{getResultEmoji(game.result)}</span>
								<span class="text-sm text-gray-600">
									{game.result === 'tie' ? 'Tie' : game.result === 'X' ? 'Win' : 'AI Win'}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>