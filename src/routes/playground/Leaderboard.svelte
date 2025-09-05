<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase';
	import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
	import { Trophy, Medal, Award, TrendingUp, Target, Brain, Gamepad2 } from 'lucide-svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import { playSound } from '$lib/sound';
	import { getAllGameIds, getGameConfig } from '$lib/gamesConfig';

	interface GameResult {
		wins: number;
		losses: number;
		score: number;
		updatedAt: any;
	}

	interface UserGameStats {
		[gameId: string]: GameResult;
	}

	interface LeaderboardEntry {
		uid: string;
		displayName: string;
		avatarUrl: string | null;
		totalScore: number;
		gameStats: UserGameStats;
		lastUpdated: any;
	}

	let leaderboard = $state<LeaderboardEntry[]>([]);
	let loading = $state(true);
	let expandedMembers = $state<Set<string>>(new Set());

	onMount(async () => {
		await loadLeaderboard();
		loading = false;
		playSound('/sounds/chime.mp3');
	});

	async function loadLeaderboard() {
		try {
			// Get all family members from users collection
			const usersQuery = collection(db, 'users');
			const usersSnapshot = await getDocs(usersQuery);
			
			const entries: LeaderboardEntry[] = [];
			const gameIds = getAllGameIds();

			// Process each user
			for (const userDoc of usersSnapshot.docs) {
				const userData = userDoc.data();
				const userUid = userDoc.id;

				const entry: LeaderboardEntry = {
					uid: userUid,
					displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
					avatarUrl: userData.avatarUrl || userData.photoURL || null,
					totalScore: 0,
					gameStats: {},
					lastUpdated: null
				};

				let hasAnyGameData = false;
				let mostRecentUpdate: any = null;

				// Load game results for each game
				for (const gameId of gameIds) {
					try {
						const gameResultDoc = await getDoc(doc(db, 'games', gameId, 'results', userUid));
						
						if (gameResultDoc.exists()) {
							const gameData = gameResultDoc.data();
							entry.gameStats[gameId] = {
								wins: gameData.wins || 0,
								losses: gameData.losses || 0,
								score: gameData.score || 0,
								updatedAt: gameData.updatedAt
							};

							// Track most recent update for tie-breaking
							if (!mostRecentUpdate || (gameData.updatedAt && gameData.updatedAt.toDate() > mostRecentUpdate.toDate())) {
								mostRecentUpdate = gameData.updatedAt;
							}

							hasAnyGameData = true;
						} else {
							// Default empty stats
							entry.gameStats[gameId] = {
								wins: 0,
								losses: 0,
								score: 0,
								updatedAt: null
							};
						}
					} catch (error) {
						console.error(`Error loading ${gameId} results for user ${userUid}:`, error);
						entry.gameStats[gameId] = {
							wins: 0,
							losses: 0,
							score: 0,
							updatedAt: null
						};
					}
				}

				// Calculate total score using unified formula: sum(score) + (wins × 10)
				let totalScore = 0;
				for (const gameId of gameIds) {
					const gameData = entry.gameStats[gameId];
					totalScore += (gameData.score || 0) + (gameData.wins || 0) * 10;
				}

				entry.totalScore = totalScore;
				entry.lastUpdated = mostRecentUpdate;

				// Only include users with some game data OR all family members (show everyone)
				entries.push(entry);
			}

			// Sort by total score descending, then by most recent update for ties
			entries.sort((a, b) => {
				if (a.totalScore !== b.totalScore) {
					return b.totalScore - a.totalScore;
				}
				
				// Tie-breaker: most recent update wins
				if (a.lastUpdated && b.lastUpdated) {
					return b.lastUpdated.toDate() - a.lastUpdated.toDate();
				} else if (a.lastUpdated) {
					return -1;
				} else if (b.lastUpdated) {
					return 1;
				}
				
				return 0;
			});

			leaderboard = entries;
		} catch (error) {
			console.error('Error loading leaderboard:', error);
		}
	}

	function toggleExpanded(uid: string) {
		if (expandedMembers.has(uid)) {
			expandedMembers.delete(uid);
		} else {
			expandedMembers.add(uid);
		}
		expandedMembers = new Set(expandedMembers);
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
				return { icon: Target, class: 'text-gray-400' };
		}
	}

	function getGameIcon(gameId: string) {
		switch (gameId) {
			case 'tictactoe':
				return { icon: Gamepad2, class: 'text-indigo-600', bg: 'bg-indigo-50' };
			case 'math':
				return { icon: Brain, class: 'text-purple-600', bg: 'bg-purple-50' };
			default:
				return { icon: Target, class: 'text-gray-600', bg: 'bg-gray-50' };
		}
	}

	function getGameDisplayName(gameId: string): string {
		const config = getGameConfig(gameId);
		return config?.title || gameId;
	}
</script>

<div class="rounded-2xl bg-white p-6 shadow-sm">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
			>
				<Trophy class="h-5 w-5 text-white" />
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Family Leaderboard</h3>
				<p class="text-sm text-gray-500">Combined scores across all games</p>
			</div>
		</div>

		<div class="flex items-center space-x-2">
			<TrendingUp class="h-4 w-4 text-indigo-600" />
			<span class="text-sm text-indigo-600 font-medium">Live Rankings</span>
		</div>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
		</div>
	{:else if leaderboard.length === 0}
		<!-- Empty State -->
		<div class="py-8 text-center">
			<Trophy class="mx-auto h-12 w-12 text-gray-400 mb-4" />
			<h4 class="text-lg font-medium text-gray-900 mb-2">No games played yet</h4>
			<p class="text-gray-500">Start playing games to see rankings!</p>
		</div>
	{:else}
		<!-- Leaderboard -->
		<div class="space-y-3">
			{#each leaderboard as member, index (member.uid)}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
					<!-- Main Entry -->
					<button
						class="w-full p-4 text-left transition-colors hover:bg-gray-100"
						onclick={() => toggleExpanded(member.uid)}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<!-- Rank -->
								<div class="flex h-8 w-8 items-center justify-center">
									{#if index < 3}
										{@const rankInfo = getRankIcon(index)}
										{@const RankIcon = rankInfo.icon}
										<RankIcon class="h-5 w-5 {rankInfo.class}" />
									{:else}
										<span class="text-sm font-semibold text-gray-500">#{index + 1}</span>
									{/if}
								</div>

								<!-- Avatar and Name -->
								<div class="flex items-center space-x-3">
									{#if member.avatarUrl}
										<img
											class="h-10 w-10 rounded-full object-cover"
											src={member.avatarUrl}
											alt={member.displayName}
										/>
									{:else}
										<div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
											<span class="text-sm font-medium text-gray-600">
												{member.displayName.charAt(0).toUpperCase()}
											</span>
										</div>
									{/if}
									<div>
										<div class="font-semibold text-gray-900">{member.displayName}</div>
										<div class="text-sm text-gray-500">
											Tap to see game breakdown
										</div>
									</div>
								</div>
							</div>

							<!-- Total Score -->
							<div class="text-right">
								<div class="text-xl font-bold text-indigo-600">
									🏆 {member.totalScore}
								</div>
								<div class="text-xs text-gray-500">Total Score</div>
							</div>
						</div>
					</button>

					<!-- Expanded Game Details -->
					{#if expandedMembers.has(member.uid)}
						<div class="border-t border-gray-200 bg-white p-4">
							<div class="mb-3 text-sm font-medium text-gray-700">Game Breakdown:</div>
							<div class="grid gap-3 sm:grid-cols-2">
								{#each getAllGameIds() as gameId (gameId)}
									{@const gameData = member.gameStats[gameId]}
									{@const gameIcon = getGameIcon(gameId)}
									<div class="rounded-lg {gameIcon.bg} p-3">
										<div class="mb-2 flex items-center space-x-2">
											{@const GameIcon = gameIcon.icon}
											<GameIcon class="h-4 w-4 {gameIcon.class}" />
											<span class="text-sm font-medium {gameIcon.class}">
												{getGameDisplayName(gameId)}
											</span>
										</div>
										<div class="text-xs text-gray-600">
											{#if gameId === 'math'}
												{gameData.score || 0} points
											{:else}
												{gameData.wins || 0}W / {gameData.losses || 0}L
											{/if}
											<span class="text-gray-400">
												(+{((gameData.score || 0) + (gameData.wins || 0) * 10)} total)
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Scoring Info -->
		<div class="mt-6 rounded-lg bg-indigo-50 p-4">
			<div class="flex items-start space-x-2">
				<TrendingUp class="h-5 w-5 text-indigo-600 mt-0.5" />
				<div>
					<h4 class="text-sm font-medium text-indigo-900">How Scoring Works</h4>
					<p class="mt-1 text-xs text-indigo-700">
						Total Score = Points Earned + (Wins × 10). Ties broken by most recent game activity.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>