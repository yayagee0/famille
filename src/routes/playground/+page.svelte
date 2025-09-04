<script lang="ts">
	import PlayCard from '$lib/components/PlayCard.svelte';
	import { toggleSound, getSoundEnabled } from '$lib/sound';
	import { Volume2, VolumeX } from 'lucide-svelte';
	import AgePlayground from './AgePlayground.svelte';
	import BuildADream from './BuildADream.svelte';
	import TicTacToe from './TicTacToe.svelte';
	import Leaderboard from './Leaderboard.svelte';

	// Sound toggle state
	let soundEnabled = $state(getSoundEnabled());

	function handleSoundToggle() {
		toggleSound();
		soundEnabled = getSoundEnabled();
	}
</script>

<div class="space-y-6">
	<!-- Header with sound toggle -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">🎮 Play Area</h1>
			<p class="mt-1 text-sm text-gray-500">
				Fun simulations and activities for everyone in the family
			</p>
		</div>
		
		<!-- Sound toggle -->
		<button
			onclick={handleSoundToggle}
			class="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2 text-sm transition-colors hover:bg-gray-200"
			title={soundEnabled ? 'Turn off sound' : 'Turn on sound'}
		>
			{#if soundEnabled}
				<Volume2 class="h-4 w-4" />
				<span>🔊</span>
			{:else}
				<VolumeX class="h-4 w-4" />
				<span>🔇</span>
			{/if}
		</button>
	</div>

	<!-- Section headers -->
	<div class="space-y-8">
		<!-- Simulations Section -->
		<div>
			<h2 class="mb-4 flex items-center text-xl font-bold text-gray-800">
				<span class="mr-2">🎨</span>
				Simulations
			</h2>
			<div class="flex flex-wrap gap-6">
				<PlayCard header="⏳ Age Simulator">
					<AgePlayground />
				</PlayCard>
				
				<PlayCard header="🌟 Build a Dream 🌟">
					<BuildADream />
				</PlayCard>
			</div>
		</div>

		<!-- Games Section -->
		<div>
			<h2 class="mb-4 flex items-center text-xl font-bold text-gray-800">
				<span class="mr-2">🎮</span>
				Games
			</h2>
			<div class="flex flex-wrap gap-6">
				<PlayCard header="🎮 Tic-Tac-Toe">
					<TicTacToe />
				</PlayCard>
				
				<PlayCard header="🏆 Family Leaderboard">
					<Leaderboard />
				</PlayCard>
			</div>
		</div>
	</div>
</div>
