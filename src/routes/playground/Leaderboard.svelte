<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { collection, getDocs } from 'firebase/firestore';
	import { Trophy, Medal, Award, TrendingUp, Target } from 'lucide-svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import { playSound } from '$lib/sound';

	interface GameStats {
		wins: number;
		losses: number;
	}

	interface LeaderboardEntry {
		uid: string;
		displayName: string;
		wins: number;
		losses: number;
		games: {
			tictactoe: GameStats;
			memory: GameStats;
			// Future games can be added here
		};
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
			// Query all leaderboard entries
			const leaderboardQuery = collection(db, 'leaderboard');
			const leaderboardSnapshot = await getDocs(leaderboardQuery);

			// Get all users data to enrich with profile information
			const usersQuery = collection(db, 'users');
			const usersSnapshot = await getDocs(usersQuery);
			const usersMap = new Map<string, any>();
			usersSnapshot.forEach((doc) => {
				usersMap.set(doc.id, doc.data());
			});

			// Process leaderboard entries
			const entries: LeaderboardEntry[] = [];

			leaderboardSnapshot.forEach((doc) => {
				const data = doc.data();
				const userData = usersMap.get(doc.id);

				entries.push({
					uid: doc.id,
					displayName: getDisplayName(userData?.email, { nickname: userData?.nickname }),
					wins: data.wins || 0,
					losses: data.losses || 0,
					games: {
						tictactoe: {
							wins: data.games?.tictactoe?.wins || 0,
							losses: data.games?.tictactoe?.losses || 0
						},
						memory: {
							wins: data.games?.memory?.wins || 0,
							losses: data.games?.memory?.losses || 0
						}
					}
				});
			});

			// Add family members who don't have leaderboard entries yet
			for (const userData of usersMap.values()) {
				if (!entries.find((entry) => entry.uid === userData.uid)) {
					entries.push({
						uid: userData.uid,
						displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
						wins: 0,
						losses: 0,
						games: {
							tictactoe: { wins: 0, losses: 0 },
							memory: { wins: 0, losses: 0 }
						}
					});
				}
			}

			// Sort by total wins (descending)
			leaderboard = entries.sort((a, b) => b.wins - a.wins);
		} catch (error) {
			console.error('Error loading leaderboard:', error);
			// Fallback to empty leaderboard on error
			leaderboard = [];
		}
	}

	function toggleExpanded(uid: string) {
		if (expandedMembers.has(uid)) {
			expandedMembers.delete(uid);
		} else {
			expandedMembers.add(uid);
		}
		expandedMembers = new Set(expandedMembers);
		playSound('/sounds/select.mp3');
	}

	function getRankIcon(index: number) {
		switch (index) {
			case 0:
				return { icon: Trophy, class: 'text-yellow-500', emoji: '🥇' };
			case 1:
				return { icon: Medal, class: 'text-gray-400', emoji: '🥈' };
			case 2:
				return { icon: Award, class: 'text-amber-600', emoji: '🥉' };
			default:
				return { icon: Target, class: 'text-blue-500', emoji: '🎯' };
		}
	}

	function getWinStreak(member: LeaderboardEntry): number {
		// Simplified win streak calculation
		const winRate = member.wins / (member.wins + member.losses || 1);
		return winRate > 0.7 ? Math.floor(winRate * 10) : 0;
	}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
		</div>
	{:else}
		<!-- Leaderboard entries -->
		<div class="space-y-3">
			{#each leaderboard as member, index (member.uid)}
				{@const rank = getRankIcon(index)}
				{@const winStreak = getWinStreak(member)}
				{@const isExpanded = expandedMembers.has(member.uid)}

				<div
					class="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
				>
					<!-- Main row -->
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<!-- Rank icon -->
							<div class="flex items-center space-x-2">
								<span class="text-2xl">{rank.emoji}</span>
								<div class="text-sm font-medium text-gray-500">#{index + 1}</div>
							</div>

							<!-- Member info -->
							<div>
								<div class="font-bold text-gray-900">{member.displayName}</div>
								<div class="flex items-center space-x-4 text-sm text-gray-600">
									<span class="flex items-center space-x-1">
										<span>🏆</span>
										<span>{member.wins} Wins</span>
									</span>
									<span class="flex items-center space-x-1">
										<span>💔</span>
										<span>{member.losses} Losses</span>
									</span>
									{#if winStreak > 0}
										<span class="flex items-center space-x-1 text-orange-600">
											<span>🔥</span>
											<span>Streak {winStreak}</span>
										</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Expand button -->
						<button
							onclick={() => toggleExpanded(member.uid)}
							class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
						>
							<TrendingUp class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" />
						</button>
					</div>

					<!-- Expanded game breakdown -->
					{#if isExpanded}
						<div class="mt-4 space-y-2 border-t border-gray-100 pt-4">
							<h5 class="text-sm font-medium text-gray-700">Game Breakdown</h5>

							<div class="grid grid-cols-2 gap-3">
								<!-- Tic-Tac-Toe stats -->
								<div class="rounded-lg bg-indigo-50 p-3 text-center">
									<div class="text-lg">🎮</div>
									<div class="text-sm font-medium text-indigo-700">Tic-Tac-Toe</div>
									<div class="text-xs text-indigo-600">
										{member.games.tictactoe.wins}W / {member.games.tictactoe.losses}L
									</div>
								</div>

								<!-- Memory Game stats -->
								<div class="rounded-lg bg-purple-50 p-3 text-center">
									<div class="text-lg">🧠</div>
									<div class="text-sm font-medium text-purple-700">Memory</div>
									<div class="text-xs text-purple-600">
										{member.games.memory.wins}W / {member.games.memory.losses}L
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Fun family message -->
		<div class="rounded-xl bg-gradient-to-r from-yellow-100 to-orange-100 p-4 text-center">
			<div class="mb-2 text-2xl">🎉</div>
			<p class="text-sm font-medium text-gray-700">
				Keep playing together! Every game makes our family stronger! 💪
			</p>
		</div>
	{/if}
</div>
