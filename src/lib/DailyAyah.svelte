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
</script>

<div class="rounded-2xl bg-white p-6 text-center shadow-sm">
	<h3 class="mb-2 flex items-center justify-center text-lg font-semibold text-green-600">
		📖 Daily Ayah
	</h3>
	<p class="font-arabic mb-3 text-xl leading-relaxed text-gray-900">
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
