<script lang="ts">
	import { birthdays } from './birthdays';
	import dayjs from 'dayjs';

	// State for the selected family member and target age
	let selectedMember = $state(birthdays[0]);
	let targetAge = $state(10);
	let showExactOffsets = $state(false);

	// Calculate how old everyone would be when the selected member reaches target age
	const futureAges = $derived(() => {
		const selectedBirthDate = dayjs(selectedMember.date);
		const selectedCurrentAge = dayjs().diff(selectedBirthDate, 'year');
		const yearsToAdd = targetAge - selectedCurrentAge;

		return birthdays
			.filter((member) => member.email !== selectedMember.email)
			.map((member) => {
				const memberBirthDate = dayjs(member.date);
				const memberCurrentAge = dayjs().diff(memberBirthDate, 'year');
				const memberFutureAge = memberCurrentAge + yearsToAdd;
				const ageDifference = selectedCurrentAge - memberCurrentAge;

				return {
					...member,
					futureAge: memberFutureAge,
					ageDifference: Math.abs(ageDifference),
					isOlder: ageDifference < 0
				};
			});
	});

	function decreaseAge() {
		if (targetAge > 1) targetAge--;
	}

	function increaseAge() {
		if (targetAge < 70) targetAge++;
	}
</script>

<div class="rounded-xl bg-white p-4 shadow">
	<h2 class="mb-4 text-lg font-bold text-indigo-700">👶➡️👴 Age Playground</h2>

	<!-- Family member selection -->
	<div class="mb-4">
		<label for="family-member-select" class="mb-2 block text-sm font-medium text-gray-700"
			>Pick a family member:</label
		>
		<select
			id="family-member-select"
			bind:value={selectedMember}
			class="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
		>
			{#each birthdays as member (member.email)}
				<option value={member}>{member.name}</option>
			{/each}
		</select>
	</div>

	<!-- Target age control -->
	<div class="mb-4">
		<label for="target-age-slider" class="mb-2 block text-sm font-medium text-gray-700"
			>Target age:</label
		>

		<!-- Age control row with buttons and slider -->
		<div class="mb-2 flex items-center space-x-3">
			<button
				onclick={decreaseAge}
				class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 hover:bg-indigo-200"
				disabled={targetAge <= 1}
			>
				−
			</button>

			<input
				id="target-age-slider"
				type="range"
				min="1"
				max="70"
				bind:value={targetAge}
				class="slider h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
			/>

			<button
				onclick={increaseAge}
				class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 hover:bg-indigo-200"
				disabled={targetAge >= 70}
			>
				+
			</button>
		</div>

		<!-- Number input that syncs with slider -->
		<input
			type="number"
			min="1"
			max="70"
			bind:value={targetAge}
			class="w-20 rounded-lg border border-gray-300 p-2 text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
		/>
	</div>

	<!-- Show exact offsets checkbox -->
	<div class="mb-4">
		<label class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={showExactOffsets}
				class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
			/>
			<span class="text-sm text-gray-700">Show exact offsets</span>
		</label>
	</div>

	<!-- Results -->
	<div class="rounded-lg bg-indigo-50 p-3">
		<p class="mb-2 text-sm font-medium text-indigo-900">
			If {selectedMember.name} is {targetAge} years old:
		</p>

		<div class="space-y-1">
			{#each futureAges as member (member.email)}
				<p class="text-sm text-gray-700">
					<span class="font-medium">{member.name}</span> will be
					<span class="font-bold text-indigo-600">{member.futureAge}</span>
					{#if showExactOffsets}
						<span class="text-xs text-gray-500">
							({member.ageDifference}
							{member.ageDifference === 1 ? 'year' : 'years'}
							{member.isOlder ? 'older' : 'younger'})
						</span>
					{/if}
				</p>
			{/each}
		</div>
	</div>
</div>

<style>
	/* Custom slider styling */
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 20px;
		width: 20px;
		border-radius: 50%;
		background: #4f46e5;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		height: 20px;
		width: 20px;
		border-radius: 50%;
		background: #4f46e5;
		cursor: pointer;
		border: none;
	}
</style>
