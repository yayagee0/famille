<script lang="ts">
	import PlayCard from '$lib/components/PlayCard.svelte';
	import { toggleSound, soundEnabled } from '$lib/sound';
	import { Volume2, VolumeX } from 'lucide-svelte';
	import AgePlayground from './AgePlayground.svelte';
	import BuildADream from './BuildADream.svelte';
	import TicTacToe from './TicTacToe.svelte';
	import MathGame from './MathGame.svelte';
	import Leaderboard from './Leaderboard.svelte';

	function handleSoundToggle() {
		toggleSound();
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
			title={$soundEnabled ? 'Turn off sound' : 'Turn on sound'}
		>
			{#if $soundEnabled}
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
			<div class="grid gap-6 lg:grid-cols-2">
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
			<div class="grid gap-6 lg:grid-cols-2">
				<PlayCard header="🎮 Tic-Tac-Toe">
					<TicTacToe />
				</PlayCard>

				<PlayCard header="🧮 Math Game">
					<MathGame />
				</PlayCard>

				<PlayCard header="🏆 Family Leaderboard">
					<Leaderboard />
				</PlayCard>
			</div>
		</div>

		<!-- Educational Section -->
		<div>
			<h2 class="mb-4 flex items-center text-xl font-bold text-gray-800">
				<span class="mr-2">📚</span>
				Learning
			</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				<PlayCard header="🕌 Islam – Our Identity">
					<div class="text-center space-y-4">
						<p class="text-gray-600">
							Learn about our beautiful faith through interactive questions and reflections.
						</p>
						<a
							href="/playground/islamic"
							class="inline-block rounded-xl bg-gradient-to-r from-green-600 to-teal-500 px-6 py-3 font-medium text-white shadow-sm transition-all hover:shadow-md hover:from-green-700 hover:to-teal-600"
						>
							Start Learning
						</a>
					</div>
				</PlayCard>
			</div>
		</div>
	</div>
</div>
