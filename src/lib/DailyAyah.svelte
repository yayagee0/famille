<script lang="ts">
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
		}
	];

	// Rotate daily using current date
	const index = new Date().getDate() % ayat.length;
	const todayAyah = ayat[index];

	// Font size state
	let fontSize = $state<'small' | 'medium' | 'large'>('medium');

	const fontSizeClasses = {
		small: 'text-lg',
		medium: 'text-xl',
		large: 'text-2xl'
	};

	function adjustFontSize(newSize: 'small' | 'medium' | 'large') {
		fontSize = newSize;
	}
</script>

<div class="rounded-2xl bg-white p-6 text-center shadow-sm">
	<div class="flex items-center justify-between mb-2">
		<h3 class="flex items-center justify-center text-lg font-semibold text-green-600">
			📖 Daily Ayah
		</h3>
		
		<!-- Font size controls -->
		<div class="flex items-center space-x-1">
			<button
				onclick={() => adjustFontSize('small')}
				class="px-2 py-1 text-xs rounded transition-colors {fontSize === 'small' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'}"
				aria-label="Small font size"
			>
				A-
			</button>
			<button
				onclick={() => adjustFontSize('medium')}
				class="px-2 py-1 text-sm rounded transition-colors {fontSize === 'medium' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'}"
				aria-label="Medium font size"
			>
				A
			</button>
			<button
				onclick={() => adjustFontSize('large')}
				class="px-2 py-1 text-base rounded transition-colors {fontSize === 'large' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'}"
				aria-label="Large font size"
			>
				A+
			</button>
		</div>
	</div>
	
	<p class="font-arabic mb-3 {fontSizeClasses[fontSize]} leading-relaxed text-gray-900">
		{todayAyah.arabic}
	</p>
	<p class="text-gray-700 italic">"{todayAyah.translation}"</p>
	<p class="mt-1 text-sm text-gray-500">— {todayAyah.reference}</p>
</div>

<style>
	.font-arabic {
		font-family: 'Amiri', serif; /* add Google font link in app.html if not included */
	}
</style>
