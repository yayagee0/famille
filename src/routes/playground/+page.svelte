<script lang="ts">
	import { onMount } from 'svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { toggleSound, soundEnabled } from '$lib/sound';
	import { Volume2, VolumeX } from 'lucide-svelte';
	import { themeStore } from '$lib/themes/neo';
	import { startParticles, stopParticles } from '$lib/themes/neo/utils/particles';
	import AgePlayground from './AgePlayground.svelte';
	import BuildADream from './BuildADream.svelte';
	import TicTacToe from './TicTacToe.svelte';
	import MathGame from './MathGame.svelte';
	import Leaderboard from './Leaderboard.svelte';

	let currentTheme = $state('default');
	let unsubscribe: (() => void) | null = null;

	function handleSoundToggle() {
		toggleSound();
	}

	onMount(() => {
		// Subscribe to theme changes
		unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
			if (theme === 'neo') {
				startParticles();
			} else {
				stopParticles();
			}
		});

		return () => {
			unsubscribe?.();
			stopParticles();
		};
	});
</script>

<div class="space-y-6">
	<!-- Header with sound toggle -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="{currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-2xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-900'}">🎮 Play Area</h1>
			<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}">
				Fun simulations and activities for everyone in the family
			</p>
		</div>

		<!-- Sound toggle -->
		<button
			onclick={handleSoundToggle}
			class="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors {currentTheme === 'neo' 
				? ($soundEnabled ? 'neo-button border border-cyan-400/50 bg-cyan-500/20 text-cyan-400' : 'neo-glass text-slate-400 hover:bg-white/10')
				: 'bg-gray-100 hover:bg-gray-200'}"
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
			<h2 class="mb-4 flex items-center {currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-800'}">
				<span class="mr-2">🎨</span>
				Simulations
			</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				{#if currentTheme === 'neo'}
					<GlassCard header="⏳ Age Simulator" glow={true}>
						<AgePlayground />
					</GlassCard>

					<GlassCard header="🌟 Build a Dream 🌟" glow={true}>
						<BuildADream />
					</GlassCard>
				{:else}
					<PlayCard header="⏳ Age Simulator">
						<AgePlayground />
					</PlayCard>

					<PlayCard header="🌟 Build a Dream 🌟">
						<BuildADream />
					</PlayCard>
				{/if}
			</div>
		</div>

		<!-- Games Section -->
		<div>
			<h2 class="mb-4 flex items-center {currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-800'}">
				<span class="mr-2">🎮</span>
				Games
			</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				{#if currentTheme === 'neo'}
					<GlassCard header="🎮 Tic-Tac-Toe" glow={true}>
						<TicTacToe />
					</GlassCard>

					<GlassCard header="🧮 Math Game" glow={true}>
						<MathGame />
					</GlassCard>

					<GlassCard header="🏆 Family Leaderboard" glow={true}>
						<Leaderboard />
					</GlassCard>
				{:else}
					<PlayCard header="🎮 Tic-Tac-Toe">
						<TicTacToe />
					</PlayCard>

					<PlayCard header="🧮 Math Game">
						<MathGame />
					</PlayCard>

					<PlayCard header="🏆 Family Leaderboard">
						<Leaderboard />
					</PlayCard>
				{/if}
			</div>
		</div>

		<!-- Educational Section -->
		<div>
			<h2 class="mb-4 flex items-center {currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-800'}">
				<span class="mr-2">📚</span>
				Learning
			</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				{#if currentTheme === 'neo'}
					<GlassCard header="🕌 Islam – Our Identity" glow={true} shimmer={true}>
						<div class="text-center space-y-4">
							<p class="text-slate-200">
								Learn about our beautiful faith through interactive questions and reflections.
							</p>
							<a
								href="/playground/islamic"
								class="neo-button inline-block rounded-xl px-6 py-3 font-medium border border-emerald-400/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
							>
								Start Learning
							</a>
						</div>
					</GlassCard>
				{:else}
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
				{/if}
			</div>
		</div>
	</div>
</div>
