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
		<!-- Confetti animation for today's birthday -->
		<div class="pointer-events-none absolute inset-0">
			{#each Array(20) as _, i}
				<div
					class="absolute animate-bounce text-xl"
					style="left: {Math.random() * 100}%; top: {Math.random() *
						100}%; animation-delay: {Math.random() * 2}s; animation-duration: {1 + Math.random()}s;"
				>
					🎉
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
