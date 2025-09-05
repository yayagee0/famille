<script lang="ts">
	import { members } from './widget-context';
	import { getDisplayName } from './getDisplayName';
	import PlayCard from './components/PlayCard.svelte';
	import { playSound } from './sound';
	import dayjs from 'dayjs';

	// Calculate the next upcoming birthday from widget context members
	const nextBirthday = $derived.by(() => {
		const today = new Date();
		const currentYear = today.getFullYear();

		// Calculate next birthday for each member who has a birthday
		const upcomingBirthdays = Object.values($members)
			.filter((member) => member.birthday)
			.map((member) => {
				const birthDate = new Date(member.birthday!);

				// Try this year first
				let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

				// If birthday already passed this year, use next year
				if (nextBirthday < today) {
					nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
				}

				return {
					email: member.email,
					displayName: getDisplayName(member.email, { nickname: member.nickname }),
					birthday: member.birthday!,
					nextDate: nextBirthday,
					daysUntil: Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
				};
			});

		// Sort by days until and return the closest one
		upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
		return upcomingBirthdays[0];
	});

	const formattedDate = $derived(nextBirthday ? dayjs(nextBirthday.nextDate).format('MMMM D') : '');

	// Calculate the age they will turn
	const ageTheyWillTurn = $derived(() => {
		if (!nextBirthday) return 0;
		const birthYear = dayjs(nextBirthday.birthday).year();
		const birthdayYear = nextBirthday.nextDate.getFullYear();
		return birthdayYear - birthYear;
	});

	const isToday = $derived(nextBirthday?.daysUntil === 0);
	const isUpcoming = $derived(nextBirthday && nextBirthday.daysUntil <= 7);

	// Play birthday sound for upcoming birthdays
	$effect(() => {
		if (isUpcoming && typeof window !== 'undefined') {
			// Small delay to avoid playing sound immediately on load
			setTimeout(() => {
				playSound('/static/sounds/birthday.mp3');
			}, 1000);
		}
	});
</script>

<PlayCard header="🎂 Next Birthday">
	<div class="relative overflow-hidden text-center">
		{#if nextBirthday && isToday}
			<!-- Enhanced confetti animation for today's birthday -->
			<div class="pointer-events-none absolute inset-0 overflow-hidden">
				{#each Array(30) as _, confettiIndex (confettiIndex)}
					<!-- confettiIndex is used, _ is intentionally unused -->
					<div
						class="absolute animate-bounce text-xl"
						style="left: {Math.random() * 100}%; top: {Math.random() *
							100}%; animation-delay: {Math.random() * 3}s; animation-duration: {1.5 +
							Math.random() * 2}s;"
					>
						{#if confettiIndex % 5 === 0}🎊{:else if confettiIndex % 4 === 0}🌟{:else if confettiIndex % 3 === 0}🎈{:else}🎉{/if}
					</div>
				{/each}
				<!-- Floating confetti pieces -->
				{#each Array(15) as _, floatIndex (floatIndex)}
					<!-- floatIndex is used, _ is intentionally unused -->
					<div
						class="absolute animate-pulse"
						style="left: {Math.random() * 100}%; top: {Math.random() *
							100}%; animation-delay: {Math.random() * 2}s; animation-duration: {2 +
							Math.random()}s;"
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
							][floatIndex % 6]};"
						></div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="relative z-10">
			<div class="mb-3 text-4xl {isUpcoming ? 'animate-bounce-slow' : ''}">🎂</div>

			{#if nextBirthday}
				<!-- New format: "{Name} turns {Age} on {Date}" -->
				<p class="mb-2 text-lg font-bold text-gray-900">
					{nextBirthday.displayName} turns {ageTheyWillTurn()} on {formattedDate}
				</p>

				<p class="text-2xl font-bold {isUpcoming ? 'text-pink-600' : 'text-purple-600'}">
					{#if nextBirthday.daysUntil === 0}
						🎉 Today! Happy Birthday! 🎉
					{:else if nextBirthday.daysUntil === 1}
						🎈 Tomorrow!
					{:else}
						{nextBirthday.daysUntil} days to go
					{/if}
				</p>
			{:else}
				<p class="text-gray-600">No upcoming birthdays configured</p>
			{/if}
		</div>
	</div>
</PlayCard>
