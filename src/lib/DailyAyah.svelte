<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Moon, Sun, Volume2 } from 'lucide-svelte';
	import { cacheAyat, getCachedAyat } from '$lib/offline';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import { playSound } from '$lib/sound';

	// Extended array of ayat with simplified kids meanings
	const ayat = [
		{
			arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',
			translation: 'And Allah loves the doers of good.',
			kids: 'Allah is happy when we are kind and do good things.',
			reference: 'Quran 3:134'
		},
		{
			arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
			translation: 'Indeed, with hardship comes ease.',
			kids: 'When life is hard, Allah will make it easier soon.',
			reference: 'Quran 94:6'
		},
		{
			arabic: 'لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
			translation: 'Do not despair of the mercy of Allah.',
			kids: 'Never give up — Allah’s love and help are always there.',
			reference: 'Quran 39:53'
		},
		{
			arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
			translation: 'And whoever fears Allah - He will make for him a way out.',
			kids: 'If we obey Allah, He will help us out of problems.',
			reference: 'Quran 65:2'
		},
		{
			arabic: 'وَاللَّهُ خَيْرٌ حَافِظًا',
			translation: 'And Allah is the best guardian.',
			kids: 'Allah protects us better than anyone else.',
			reference: 'Quran 12:64'
		},
		{
			arabic: 'وَهُوَ الْعَزِيزُ الرَّحِيمُ',
			translation: 'And He is the Exalted in Might, the Merciful.',
			kids: 'Allah is strong and also very kind.',
			reference: 'Quran 59:1'
		},
		{
			arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً',
			translation: 'Our Lord, give us in this world [that which is] good.',
			kids: 'We ask Allah to give us good things in this life.',
			reference: 'Quran 2:201'
		},
		{
			arabic: 'وَقُولُوا لِلنَّاسِ حُسْنًا',
			translation: 'And speak to people good words.',
			kids: 'Always talk nicely to everyone.',
			reference: 'Quran 2:83'
		},
		{
			arabic: 'وَاعْبُدُوا اللَّهَ وَلَا تُشْرِكُوا بِهِ شَيْئًا',
			translation: 'Worship Allah and do not associate anything with Him.',
			kids: 'Pray only to Allah, not anyone else.',
			reference: 'Quran 4:36'
		},
		{
			arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
			translation: 'Indeed, Allah is with the patient.',
			kids: 'Allah is close to us when we wait calmly.',
			reference: 'Quran 2:153'
		},
		{
			arabic: 'وَأَقِيمُوا الصَّلَاةَ',
			translation: 'And establish prayer.',
			kids: 'Never forget to pray to Allah every day.',
			reference: 'Quran 2:43'
		},
		{
			arabic: 'وَبِالْوَالِدَيْنِ إِحْسَانًا',
			translation: 'And be good to parents.',
			kids: 'Always respect and listen to mom and dad.',
			reference: 'Quran 4:36'
		},
		{
			arabic: 'إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ',
			translation: 'Indeed, Allah is Forgiving and Merciful.',
			kids: 'If we say sorry, Allah forgives us.',
			reference: 'Quran 2:173'
		},
		{
			arabic: 'إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ',
			translation: 'Indeed, Allah loves those who rely upon Him.',
			kids: 'Trust Allah and He will take care of you.',
			reference: 'Quran 3:159'
		},
		{
			arabic: 'وَإِذَا حُيِّيْتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا',
			translation: 'When you are greeted with a greeting, respond with one better.',
			kids: 'When someone says salaam, answer kindly back.',
			reference: 'Quran 4:86'
		}
	];

	// Rotate daily using current date
	const index = new Date().getDate() % ayat.length;
	let todayAyah = $state(ayat[index]);

	// Font size state
	let fontSize = $state<'small' | 'medium' | 'large'>('medium');

	// Theme state
	let isDarkTheme = $state(false);

	function adjustFontSize(newSize: 'small' | 'medium' | 'large') {
		fontSize = newSize;
	}

	function toggleTheme() {
		isDarkTheme = !isDarkTheme;
		if (browser) {
			localStorage.setItem('daily-ayah-theme', isDarkTheme ? 'dark' : 'light');
		}
	}

	function playAyahSound() {
		playSound('/static/sounds/ayah.mp3');
	}

	onMount(() => {
		if (browser) {
			const savedTheme = localStorage.getItem('daily-ayah-theme');
			isDarkTheme = savedTheme === 'dark';
		}
		cacheAyat(ayat);
		const cachedAyat = getCachedAyat();
		if (cachedAyat && cachedAyat.length > ayat.length) {
			const cachedIndex = new Date().getDate() % cachedAyat.length;
			todayAyah = cachedAyat[cachedIndex];
		}
	});

	const themeClasses = $derived(
		isDarkTheme
			? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white text-center'
			: 'text-center'
	);
</script>

<PlayCard header="📖 Daily Ayah">
	<div class={themeClasses}>
		<div class="mb-4 flex items-center justify-between">
			<!-- Sound Button -->
			<button
				onclick={playAyahSound}
				class="rounded-lg p-2 transition-all duration-200 {isDarkTheme
					? 'bg-opacity-10 hover:bg-opacity-20 bg-white text-blue-400'
					: 'bg-blue-100 text-blue-600 hover:bg-blue-200'}"
				aria-label="Play Ayah sound"
				title="Play peaceful sound"
			>
				<Volume2 class="h-4 w-4" />
			</button>

			<!-- Controls Row -->
			<div class="flex items-center space-x-4">
				<!-- Theme Toggle -->
				<button
					onclick={toggleTheme}
					class="rounded-lg p-2 transition-all duration-200 {isDarkTheme
						? 'bg-opacity-10 hover:bg-opacity-20 bg-white text-yellow-400'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
				>
					{#if isDarkTheme}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</button>

				<!-- Font size controls -->
				<div class="flex items-center space-x-1">
					<button
						onclick={() => adjustFontSize('small')}
						class="rounded px-2 py-1 text-xs transition-colors {fontSize === 'small'
							? isDarkTheme
								? 'bg-green-600 text-white'
								: 'bg-green-100 text-green-700'
							: isDarkTheme
								? 'text-gray-300 hover:text-white'
								: 'text-gray-500 hover:text-gray-700'}"
						aria-label="Small font size"
					>
						A-
					</button>
					<button
						onclick={() => adjustFontSize('medium')}
						class="rounded px-2 py-1 text-sm transition-colors {fontSize === 'medium'
							? isDarkTheme
								? 'bg-green-600 text-white'
								: 'bg-green-100 text-green-700'
							: isDarkTheme
								? 'text-gray-300 hover:text-white'
								: 'text-gray-500 hover:text-gray-700'}"
						aria-label="Medium font size"
					>
						A
					</button>
					<button
						onclick={() => adjustFontSize('large')}
						class="rounded px-2 py-1 text-base transition-colors {fontSize === 'large'
							? isDarkTheme
								? 'bg-green-600 text-white'
								: 'bg-green-100 text-green-700'
							: isDarkTheme
								? 'text-gray-300 hover:text-white'
								: 'text-gray-500 hover:text-gray-700'}"
						aria-label="Large font size"
					>
						A+
					</button>
				</div>
			</div>
		</div>

		<p
			class="font-arabic mb-3 text-2xl leading-relaxed md:text-3xl {isDarkTheme
				? 'text-white'
				: 'text-gray-900'}"
		>
			{todayAyah.arabic}
		</p>
		<p class="mb-2 text-gray-600 italic">
			"{todayAyah.translation}"
		</p>
		<p class="mt-1 text-sm {isDarkTheme ? 'text-green-300' : 'text-green-600'}">
			👶 {todayAyah.kids}
		</p>
		<p class="mt-1 text-sm {isDarkTheme ? 'text-gray-400' : 'text-gray-500'}">
			— {todayAyah.reference}
		</p>
	</div>
</PlayCard>

<style>
	.font-arabic {
		font-family: 'Amiri', serif;
	}
</style>
