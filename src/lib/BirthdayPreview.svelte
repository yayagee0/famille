<script lang="ts">
	import { getNextBirthday } from './birthdays';
	import dayjs from 'dayjs';

	// Get the next upcoming birthday
	const nextBirthday = getNextBirthday();
	const formattedDate = dayjs(nextBirthday.nextDate).format('MMMM D');
</script>

<div
	class="rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 p-4 shadow"
>
	<div class="text-center">
		<div class="mb-2 text-2xl">🎂</div>
		<h3 class="mb-1 text-sm font-semibold text-purple-700">Next Birthday</h3>
		<p class="text-lg font-bold text-gray-900">{nextBirthday.name}</p>
		<p class="text-sm text-gray-600">{formattedDate}</p>
		<p class="mt-1 text-xs text-purple-600">
			{#if nextBirthday.daysUntil === 0}
				🎉 Today!
			{:else if nextBirthday.daysUntil === 1}
				🎈 Tomorrow!
			{:else}
				{nextBirthday.daysUntil} days to go
			{/if}
		</p>
	</div>
</div>
