<script lang="ts">
	import { Trophy, Play, Bot } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	let showGame = $state(false);
</script>

<!-- Tic-Tac-Toe Card -->
<div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-sm">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-3">
			<div class="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
				<Trophy class="w-6 h-6 text-white" />
			</div>
			<div>
				<h3 class="text-lg font-semibold">Tic-Tac-Toe</h3>
				<p class="text-indigo-100 text-sm">Challenge the AI to a classic game</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-3 gap-1 max-w-20 mb-4">
		<!-- Mini preview board -->
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm flex items-center justify-center text-xs">X</div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm"></div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm flex items-center justify-center text-xs">O</div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm"></div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm flex items-center justify-center text-xs">X</div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm"></div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm flex items-center justify-center text-xs">O</div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm"></div>
		<div class="w-6 h-6 bg-white bg-opacity-20 rounded-sm"></div>
	</div>

	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-2 text-sm">
			<Bot class="w-4 h-4" />
			<span class="text-indigo-100">Two difficulty levels</span>
		</div>
		
		<Button 
			variant="outline" 
			size="small"
			onclick={() => showGame = !showGame}
		>
			<Play class="w-4 h-4 mr-1" />
			{showGame ? 'Hide' : 'Play'}
		</Button>
	</div>
</div>

{#if showGame}
	<div class="mt-6">
		{#await import('../routes/playground/TicTacToe.svelte')}
			<div class="bg-white rounded-2xl p-6 shadow-sm">
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				</div>
			</div>
		{:then TicTacToe}
			<TicTacToe.default />
		{/await}
	</div>
{/if}