<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Moon, Sun } from 'lucide-svelte';
	import { cacheAyat, getCachedAyat } from '$lib/offline';

	// A simple array of ayat to rotate daily
	const ayat = [
		{
			arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',
			translation: 'And Allah loves the doers of good.',
			reference: 'Quran 3:134'
		},
		{
			arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
			translation: 'Indeed, with hardship comes ease.',
			reference: 'Quran 94:6'
		},
		{
			arabic: 'لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
			translation: 'Do not despair of the mercy of Allah.',
			reference: 'Quran 39:53'
		},
		{
			arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
			translation: 'And whoever fears Allah - He will make for him a way out.',
			reference: 'Quran 65:2'
		},
		{
			arabic: 'وَاللَّهُ خَيْرٌ حَافِظًا',
			translation: 'And Allah is the best guardian.',
			reference: 'Quran 12:64'
		},
		{
			arabic: 'وَهُوَ الْعَزِيزُ الرَّحِيمُ',
			translation: 'And He is the Exalted in Might, the Merciful.',
			reference: 'Quran 59:1'
		},
		{
			arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً',
			translation: 'Our Lord, give us in this world [that which is] good.',
			reference: 'Quran 2:201'
		}
	];

	// Rotate daily using current date
	const index = new Date().getDate() % ayat.length;
	let todayAyah = $state(ayat[index]);

	// Font size state
	let fontSize = $state<'small' | 'medium' | 'large'>('medium');
	
	// Theme state
	let isDarkTheme = $state(false);

	const fontSizeClasses = {
		small: 'text-lg',
		medium: 'text-xl',
		large: 'text-2xl'
	};

	function adjustFontSize(newSize: 'small' | 'medium' | 'large') {
		fontSize = newSize;
	}

	function toggleTheme() {
		isDarkTheme = !isDarkTheme;
		// Save theme preference
		if (browser) {
			localStorage.setItem('daily-ayah-theme', isDarkTheme ? 'dark' : 'light');
		}
	}

	onMount(() => {
		// Load theme preference
		if (browser) {
			const savedTheme = localStorage.getItem('daily-ayah-theme');
			isDarkTheme = savedTheme === 'dark';
		}

		// Cache ayat for offline access
		cacheAyat(ayat);

		// Try to load from cache if needed (for future offline enhancement)
		const cachedAyat = getCachedAyat();
		if (cachedAyat && cachedAyat.length > ayat.length) {
			// Use cached version if it has more ayat
			const cachedIndex = new Date().getDate() % cachedAyat.length;
			todayAyah = cachedAyat[cachedIndex];
		}
	});

	const themeClasses = $derived(isDarkTheme 
		? 'rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 text-center shadow-sm'
		: 'rounded-2xl bg-white p-6 text-center shadow-sm');
</script>

<div class={themeClasses}>
	<div class="flex items-center justify-between mb-2">
		<h3 class="flex items-center justify-center text-lg font-semibold {isDarkTheme ? 'text-green-400' : 'text-green-600'}">
			📖 Daily Ayah
		</h3>
		
		<!-- Controls Row -->
		<div class="flex items-center space-x-4">
			<!-- Theme Toggle -->
			<button
				onclick={toggleTheme}
				class="p-2 rounded-lg transition-all duration-200 {isDarkTheme ? 'bg-white bg-opacity-10 text-yellow-400 hover:bg-opacity-20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
			>
				{#if isDarkTheme}
					<Sun class="w-4 h-4" />
				{:else}
					<Moon class="w-4 h-4" />
				{/if}
			</button>
			
			<!-- Font size controls -->
			<div class="flex items-center space-x-1">
				<button
					onclick={() => adjustFontSize('small')}
					class="px-2 py-1 text-xs rounded transition-colors {fontSize === 'small' ? (isDarkTheme ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700') : (isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700')}"
					aria-label="Small font size"
				>
					A-
				</button>
				<button
					onclick={() => adjustFontSize('medium')}
					class="px-2 py-1 text-sm rounded transition-colors {fontSize === 'medium' ? (isDarkTheme ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700') : (isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700')}"
					aria-label="Medium font size"
				>
					A
				</button>
				<button
					onclick={() => adjustFontSize('large')}
					class="px-2 py-1 text-base rounded transition-colors {fontSize === 'large' ? (isDarkTheme ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700') : (isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700')}"
					aria-label="Large font size"
				>
					A+
				</button>
			</div>
		</div>
	</div>
	
	<p class="font-arabic mb-3 {fontSizeClasses[fontSize]} leading-relaxed {isDarkTheme ? 'text-white' : 'text-gray-900'}">
		{todayAyah.arabic}
	</p>
	<p class="{isDarkTheme ? 'text-gray-200' : 'text-gray-700'} italic">"{todayAyah.translation}"</p>
	<p class="mt-1 text-sm {isDarkTheme ? 'text-gray-400' : 'text-gray-500'}">— {todayAyah.reference}</p>
</div>

<style>
	.font-arabic {
		font-family: 'Amiri', serif; /* add Google font link in app.html if not included */
	}
</style>
