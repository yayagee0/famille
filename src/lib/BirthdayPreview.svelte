<script lang="ts">
	import { getNextBirthday } from './birthdays';
	import dayjs from 'dayjs';

	// Get the next upcoming birthday
	const nextBirthday = getNextBirthday();
	const formattedDate = dayjs(nextBirthday.nextDate).format('MMMM D');

	// Calculate the age they will turn
	const birthYear = dayjs(nextBirthday.date).year();
	const birthdayYear = nextBirthday.nextDate.getFullYear();
	const ageTheyWillTurn = birthdayYear - birthYear;

	const isToday = nextBirthday.daysUntil === 0;
</script>

<div
	class="relative overflow-hidden rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 p-4 shadow-sm"
>
	{#if isToday}
		<!-- Enhanced confetti animation for today's birthday -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			{#each Array(30) as _, i}
				<div
					class="absolute animate-bounce text-xl"
					style="left: {Math.random() * 100}%; top: {Math.random() *
						100}%; animation-delay: {Math.random() * 3}s; animation-duration: {1.5 +
						Math.random() * 2}s;"
				>
					{#if i % 5 === 0}🎊{:else if i % 4 === 0}🌟{:else if i % 3 === 0}🎈{:else}🎉{/if}
				</div>
			{/each}
			<!-- Floating confetti pieces -->
			{#each Array(15) as _, i}
				<div
					class="absolute animate-pulse"
					style="left: {Math.random() * 100}%; top: {Math.random() *
						100}%; animation-delay: {Math.random() * 2}s; animation-duration: {2 + Math.random()}s;"
				>
					<div
						class="h-2 w-2 rounded-full"
						style="background-color: {[
							'#ff6b6b',
							'#4ecdc4',
							'#45b7d1',
							'#96ceb4',
							'#feca57',
							'#ff9ff3'
						][i % 6]};"
					></div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="relative z-10 text-center">
		<div class="mb-2 text-2xl">🎂</div>
		<h3 class="mb-2 text-sm font-semibold text-purple-700">Next Birthday</h3>

		<!-- New format: "{Name} turns {Age} on {Date}" -->
		<p class="mb-1 text-lg font-bold text-gray-900">
			{nextBirthday.name} turns {ageTheyWillTurn} on {formattedDate}
		</p>

		<p class="mt-1 text-sm font-medium text-purple-600">
			{#if nextBirthday.daysUntil === 0}
				🎉 Today! Happy Birthday! 🎉
			{:else if nextBirthday.daysUntil === 1}
				🎈 Tomorrow!
			{:else}
				{nextBirthday.daysUntil} days to go
			{/if}
		</p>
	</div>
</div>
