<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
	import { Trophy, Medal, Award, User, Bot } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	let leaderboard = $state<any[]>([]);
	let userStats = $state<any>(null);
	let loading = $state(true);

	const user = $state(auth.currentUser);

	onMount(async () => {
		await loadLeaderboard();
		await loadUserStats();
		loading = false;
	});

	async function loadLeaderboard() {
		try {
			// Get recent games for leaderboard
			const gamesQuery = query(
				collection(db, 'games', 'tic-tac', 'matches'),
				orderBy('timestamp', 'desc'),
				limit(20)
			);

			const gamesSnapshot = await getDocs(gamesQuery);
			const games = gamesSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));

			// Calculate stats per player
			const playerStats = new Map();

			games.forEach((game: any) => {
				const playerId = game.playerUid;
				const playerName = game.playerName;

				if (!playerStats.has(playerId)) {
					playerStats.set(playerId, {
						playerId,
						playerName,
						games: 0,
						wins: 0,
						draws: 0,
						losses: 0,
						winRate: 0,
						lastPlayed: null
					});
				}

				const stats = playerStats.get(playerId);
				stats.games++;

				if (game.result === 'win') stats.wins++;
				else if (game.result === 'draw') stats.draws++;
				else if (game.result === 'lose') stats.losses++;

				if (!stats.lastPlayed || game.timestamp > stats.lastPlayed) {
					stats.lastPlayed = game.timestamp;
				}
			});

			// Calculate win rates and sort
			const sortedStats = Array.from(playerStats.values())
				.map((stats) => ({
					...stats,
					winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0
				}))
				.sort((a, b) => {
					// Sort by win rate, then by total games
					if (b.winRate !== a.winRate) return b.winRate - a.winRate;
					return b.games - a.games;
				})
				.slice(0, 10); // Top 10

			leaderboard = sortedStats;
		} catch (error) {
			console.error('Error loading leaderboard:', error);
		}
	}

	async function loadUserStats() {
		if (!user?.uid) return;

		try {
			const userGamesQuery = query(
				collection(db, 'games', 'tic-tac', 'matches'),
				where('playerUid', '==', user.uid),
				orderBy('timestamp', 'desc'),
				limit(10)
			);

			const userGamesSnapshot = await getDocs(userGamesQuery);
			const games = userGamesSnapshot.docs.map((doc) => doc.data());

			if (games.length === 0) {
				userStats = null;
				return;
			}

			const stats = {
				games: games.length,
				wins: games.filter((g) => g.result === 'win').length,
				draws: games.filter((g) => g.result === 'draw').length,
				losses: games.filter((g) => g.result === 'lose').length,
				recentGames: games.slice(0, 5)
			};

			stats.winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
			userStats = stats;
		} catch (error) {
			console.error('Error loading user stats:', error);
		}
	}

	function getRankIcon(index: number) {
		switch (index) {
			case 0:
				return { icon: Trophy, class: 'text-yellow-500' };
			case 1:
				return { icon: Medal, class: 'text-gray-400' };
			case 2:
				return { icon: Award, class: 'text-orange-500' };
			default:
				return { icon: User, class: 'text-gray-400' };
		}
	}

	function getResultIcon(result: string) {
		switch (result) {
			case 'win':
				return '🎉';
			case 'lose':
				return '😔';
			case 'draw':
				return '🤝';
			default:
				return '❓';
		}
	}
</script>

<div class="rounded-2xl bg-white p-6 shadow-sm">
	<!-- Header -->
	<div class="mb-6 flex items-center space-x-3">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600"
		>
			<Trophy class="h-5 w-5 text-white" />
		</div>
		<div>
			<h3 class="text-lg font-semibold text-gray-900">Tic-Tac-Toe Leaderboard</h3>
			<p class="text-sm text-gray-500">Top players and recent games</p>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
		</div>
	{:else}
		<!-- User Stats -->
		{#if userStats}
			<div class="mb-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
				<h4 class="mb-3 text-sm font-medium text-gray-900">Your Stats</h4>
				<div class="grid grid-cols-4 gap-4 text-center">
					<div>
						<div class="text-lg font-bold text-indigo-600">{userStats.games}</div>
						<div class="text-xs text-gray-500">Games</div>
					</div>
					<div>
						<div class="text-lg font-bold text-green-600">{userStats.wins}</div>
						<div class="text-xs text-gray-500">Wins</div>
					</div>
					<div>
						<div class="text-lg font-bold text-yellow-600">{userStats.draws}</div>
						<div class="text-xs text-gray-500">Draws</div>
					</div>
					<div>
						<div class="text-lg font-bold text-gray-600">{userStats.winRate}%</div>
						<div class="text-xs text-gray-500">Win Rate</div>
					</div>
				</div>

				<!-- Recent Games -->
				{#if userStats.recentGames.length > 0}
					<div class="mt-4">
						<h5 class="mb-2 text-xs font-medium text-gray-700">Recent Games</h5>
						<div class="flex space-x-2">
							{#each userStats.recentGames as game}
								<div class="flex items-center space-x-1 rounded-lg bg-white px-2 py-1 text-xs">
									<span>{getResultIcon(game.result)}</span>
									<span class="text-gray-500">{game.difficulty}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Leaderboard -->
		{#if leaderboard.length > 0}
			<div class="space-y-3">
				{#each leaderboard as player, index}
					<div class="flex items-center justify-between rounded-xl bg-gray-50 p-3">
						<div class="flex items-center space-x-3">
							<div class="flex h-6 w-6 items-center justify-center">
								{#if index === 0}
									<Trophy class="h-4 w-4 text-yellow-500" />
								{:else if index === 1}
									<Medal class="h-4 w-4 text-gray-400" />
								{:else if index === 2}
									<Award class="h-4 w-4 text-orange-500" />
								{:else}
									<User class="h-4 w-4 text-gray-400" />
								{/if}
							</div>
							<div>
								<div class="text-sm font-medium text-gray-900">
									{player.playerName}
									{#if player.playerId === user?.uid}
										<span class="text-xs text-indigo-600">(You)</span>
									{/if}
								</div>
								<div class="text-xs text-gray-500">
									{player.games} games • Last played {dayjs(player.lastPlayed?.toDate()).fromNow()}
								</div>
							</div>
						</div>
						<div class="text-right">
							<div class="text-sm font-bold text-gray-900">{player.winRate}%</div>
							<div class="text-xs text-gray-500">
								{player.wins}W {player.draws}D {player.losses}L
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-8 text-center">
				<Bot class="mx-auto mb-3 h-12 w-12 text-gray-300" />
				<p class="text-sm text-gray-500">No games played yet!</p>
				<p class="text-xs text-gray-400">Be the first to challenge the AI</p>
			</div>
		{/if}
	{/if}
</div>
