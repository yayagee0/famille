<script lang="ts">
	import { Trophy, Play, Bot } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	let showGame = $state(false);
</script>

<!-- Tic-Tac-Toe Card -->
<div class="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<div class="bg-opacity-20 flex h-12 w-12 items-center justify-center rounded-xl bg-white">
				<Trophy class="h-6 w-6 text-white" />
			</div>
			<div>
				<h3 class="text-lg font-semibold">Tic-Tac-Toe</h3>
				<p class="text-sm text-indigo-100">Challenge the AI to a classic game</p>
			</div>
		</div>
	</div>

	<div class="mb-4 grid max-w-20 grid-cols-3 gap-1">
		<!-- Mini preview board -->
		<div class="bg-opacity-20 flex h-6 w-6 items-center justify-center rounded-sm bg-white text-xs">
			X
		</div>
		<div class="bg-opacity-20 h-6 w-6 rounded-sm bg-white"></div>
		<div class="bg-opacity-20 flex h-6 w-6 items-center justify-center rounded-sm bg-white text-xs">
			O
		</div>
		<div class="bg-opacity-20 h-6 w-6 rounded-sm bg-white"></div>
		<div class="bg-opacity-20 flex h-6 w-6 items-center justify-center rounded-sm bg-white text-xs">
			X
		</div>
		<div class="bg-opacity-20 h-6 w-6 rounded-sm bg-white"></div>
		<div class="bg-opacity-20 flex h-6 w-6 items-center justify-center rounded-sm bg-white text-xs">
			O
		</div>
		<div class="bg-opacity-20 h-6 w-6 rounded-sm bg-white"></div>
		<div class="bg-opacity-20 h-6 w-6 rounded-sm bg-white"></div>
	</div>

	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-2 text-sm">
			<Bot class="h-4 w-4" />
			<span class="text-indigo-100">Two difficulty levels</span>
		</div>

		<Button variant="outline" size="small" onclick={() => (showGame = !showGame)}>
			<Play class="mr-1 h-4 w-4" />
			{showGame ? 'Hide' : 'Play'}
		</Button>
	</div>
</div>

{#if showGame}
	<div class="mt-6">
		{#await import('../routes/playground/TicTacToe.svelte')}
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<div class="flex items-center justify-center py-8">
					<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
				</div>
			</div>
		{:then TicTacToe}
			<TicTacToe.default />
		{/await}
	</div>
{/if}
