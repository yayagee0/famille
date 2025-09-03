<script lang="ts">
	import AgePlaygroundCard from '$lib/AgePlaygroundCard.svelte';
	import DreamBuilderPlaygroundCard from '$lib/DreamBuilderPlaygroundCard.svelte';
	import TicTacToeCard from '$lib/TicTacToeCard.svelte';
	import TicTacToeLeaderboard from './TicTacToeLeaderboard.svelte';
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">🎮 Play Area</h1>
		<p class="mt-1 text-sm text-gray-500">
			Fun simulations and activities for everyone in the family
		</p>
	</div>

	<!-- Main playground widgets stacked vertically -->
	<div class="space-y-6">
		<TicTacToeCard />
		<AgePlaygroundCard />
		<DreamBuilderPlaygroundCard />
		<TicTacToeLeaderboard />
	</div>
</div>
