<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Sun, Moon } from 'lucide-svelte';

	// Extended array of ayat with more verses
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
			arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ',
			translation: 'And He is with you wherever you are.',
			reference: 'Quran 57:4'
		},
		{
			arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
			translation: 'So remember Me; I will remember you.',
			reference: 'Quran 2:152'
		},
		{
			arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ',
			translation: 'And do not despair of the mercy of Allah.',
			reference: 'Quran 12:87'
		},
		{
			arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
			translation: 'Indeed, Allah is with the patient.',
			reference: 'Quran 2:153'
		}
	];

	// Rotate daily using current date
	const index = new Date().getDate() % ayat.length;
	
	// State for UI controls
	let fontSize = $state<'small' | 'medium' | 'large'>('medium');
	let theme = $state<'light' | 'dark'>('light');
	let todayAyah = $state(ayat[index]);
	let cachedAyat = $state<typeof ayat>([]);

	// Font size and theme classes
	const fontSizeClasses = {
		small: 'text-lg',
		medium: 'text-xl',
		large: 'text-2xl'
	};

	const themeClasses = {
		light: 'bg-white text-gray-900',
		dark: 'bg-gray-800 text-white'
	};

	const headerClasses = {
		light: 'text-green-600',
		dark: 'text-green-400'
	};

	// Offline caching functions
	function saveCachedAyat(ayatToCache: typeof ayat) {
		if (!browser) return;
		
		try {
			const cacheData = {
				ayat: ayatToCache,
				timestamp: Date.now(),
				lastUpdated: new Date().toISOString()
			};
			localStorage.setItem('famille-daily-ayat-cache', JSON.stringify(cacheData));
		} catch (error) {
			console.error('Failed to cache ayat:', error);
		}
	}

	function loadCachedAyat(): typeof ayat | null {
		if (!browser) return null;
		
		try {
			const cached = localStorage.getItem('famille-daily-ayat-cache');
			if (!cached) return null;

			const cacheData = JSON.parse(cached);
			const cacheAge = Date.now() - cacheData.timestamp;
			const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

			// Return cached data if less than 7 days old
			if (cacheAge < maxAge && cacheData.ayat) {
				return cacheData.ayat;
			}
		} catch (error) {
			console.error('Failed to load cached ayat:', error);
		}
		
		return null;
	}

	function saveUserPreferences() {
		if (!browser) return;
		
		try {
			const preferences = { fontSize, theme };
			localStorage.setItem('famille-ayah-preferences', JSON.stringify(preferences));
		} catch (error) {
			console.error('Failed to save preferences:', error);
		}
	}

	function loadUserPreferences() {
		if (!browser) return;
		
		try {
			const saved = localStorage.getItem('famille-ayah-preferences');
			if (saved) {
				const preferences = JSON.parse(saved);
				fontSize = preferences.fontSize || 'medium';
				theme = preferences.theme || 'light';
			}
		} catch (error) {
			console.error('Failed to load preferences:', error);
		}
	}

	// Control functions
	function adjustFontSize(newSize: 'small' | 'medium' | 'large') {
		fontSize = newSize;
		saveUserPreferences();
	}

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		saveUserPreferences();
	}

	// Initialize component
	onMount(() => {
		loadUserPreferences();
		
		// Load cached ayat if available
		const cached = loadCachedAyat();
		if (cached) {
			cachedAyat = cached;
			// Use cached ayat if available, fall back to built-in
			const dayIndex = new Date().getDate() % cached.length;
			todayAyah = cached[dayIndex];
		} else {
			// Cache the built-in ayat
			cachedAyat = ayat;
			saveCachedAyat(ayat);
		}
	});
</script>

<div class="rounded-2xl p-6 text-center shadow-sm transition-colors duration-200 {themeClasses[theme]}">
	<div class="mb-2 flex items-center justify-between">
		<h3 class="flex items-center justify-center text-lg font-semibold {headerClasses[theme]}">
			📖 Daily Ayah
		</h3>

		<!-- Controls -->
		<div class="flex items-center space-x-3">
			<!-- Theme toggle -->
			<button
				onclick={toggleTheme}
				class="rounded-lg p-2 transition-colors {theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}"
				aria-label="Toggle theme"
				title="Toggle light/dark theme"
			>
				{#if theme === 'light'}
					<Moon class="h-4 w-4 text-gray-600" />
				{:else}
					<Sun class="h-4 w-4 text-yellow-400" />
				{/if}
			</button>

			<!-- Font size controls -->
			<div class="flex items-center space-x-1">
				<button
					onclick={() => adjustFontSize('small')}
					class="rounded px-2 py-1 text-xs transition-colors {fontSize === 'small'
						? theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900 text-green-300'
						: theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}"
					aria-label="Small font size"
				>
					A-
				</button>
				<button
					onclick={() => adjustFontSize('medium')}
					class="rounded px-2 py-1 text-sm transition-colors {fontSize === 'medium'
						? theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900 text-green-300'
						: theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}"
					aria-label="Medium font size"
				>
					A
				</button>
				<button
					onclick={() => adjustFontSize('large')}
					class="rounded px-2 py-1 text-base transition-colors {fontSize === 'large'
						? theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900 text-green-300'
						: theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}"
					aria-label="Large font size"
				>
					A+
				</button>
			</div>
		</div>
	</div>

	<p class="font-arabic mb-3 {fontSizeClasses[fontSize]} leading-relaxed {theme === 'light' ? 'text-gray-900' : 'text-white'}">
		{todayAyah.arabic}
	</p>
	<p class="{theme === 'light' ? 'text-gray-700' : 'text-gray-300'} italic">"{todayAyah.translation}"</p>
	<p class="mt-1 text-sm {theme === 'light' ? 'text-gray-500' : 'text-gray-400'}">— {todayAyah.reference}</p>
	
	{#if cachedAyat.length > ayat.length}
		<p class="mt-2 text-xs {theme === 'light' ? 'text-green-600' : 'text-green-400'}">
			✓ Enhanced collection cached offline
		</p>
	{/if}
</div>

<style>
	.font-arabic {
		font-family: 'Amiri', serif; /* add Google font link in app.html if not included */
	}
</style>
