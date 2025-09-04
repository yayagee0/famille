<script lang="ts">
	import { members } from './widget-context';
	import { ageOn } from './users';
	import dayjs from 'dayjs';

	// Get widget context for family members
	// members store now provides reactive access

	// Member emojis for fun visual representation
	const memberEmojis: Record<string, string> = {
		'nilezat@gmail.com': '👨‍💼',
		'abdessamia.mariem@gmail.com': '👩‍💼',
		'yazidgeemail@gmail.com': '👦',
		'yahyageemail@gmail.com': '🧒'
	};

	// Get members who have birthdays as an array
	const membersWithBirthdays = $derived(
		Object.values($members).filter((member) => member.birthday)
	);

	// State for the selected family member and target age - initialize with first member when available
	let selectedMember = $state(null as (typeof membersWithBirthdays)[0] | null);
	let targetAge = $state(10);
	let showExactOffsets = $state(false);

	// Initialize selectedMember when members are available
	$effect(() => {
		if (membersWithBirthdays.length > 0 && !selectedMember) {
			selectedMember = membersWithBirthdays[0];
		}
	});

	// Calculate how old everyone would be when the selected member reaches target age
	const futureAges = $derived.by(() => {
		if (!selectedMember?.birthday) return [];

		const selectedCurrentAge = ageOn(selectedMember.birthday);
		const yearsToAdd = targetAge - selectedCurrentAge;

		return membersWithBirthdays
			.filter((member) => member.email !== selectedMember!.email)
			.map((member) => {
				const memberCurrentAge = ageOn(member.birthday!);
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

	function selectMember(member: any) {
		selectedMember = member;
	}
</script>

<div
	class="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 p-6 shadow-lg"
>
	<h2 class="mb-6 text-center text-2xl font-bold text-purple-700">🌟 Age Playground 🌟</h2>

	<!-- Family member selection with clickable avatar chips -->
	<div class="mb-6">
		<p class="mb-3 text-center text-lg font-semibold text-purple-600">Pick a family member:</p>
		<div class="grid grid-cols-2 gap-3">
			{#each membersWithBirthdays as member (member.email)}
				<button
					onclick={() => selectMember(member)}
					class="flex flex-col items-center space-y-2 rounded-2xl p-4 transition-all duration-200
					{selectedMember?.email === member.email
						? 'scale-105 border-2 border-purple-400 bg-purple-200 shadow-lg'
						: 'border-2 border-transparent bg-white shadow-md hover:scale-102 hover:bg-purple-100'}"
				>
					<div class="text-3xl">{memberEmojis[member.email] || '👤'}</div>
					<span class="text-sm font-bold text-gray-800">{member.displayName}</span>
					{#if selectedMember?.email === member.email}
						<div class="text-xs font-medium text-purple-600">Selected! ✨</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Target age control with fun styling -->
	<div class="mb-6 rounded-2xl border-2 border-blue-200 bg-white p-4">
		<p class="mb-3 text-center text-lg font-semibold text-blue-600">🎯 Set the age:</p>

		<!-- Age control row with animated buttons and slider -->
		<div class="mb-4 flex items-center space-x-3">
			<button
				onclick={decreaseAge}
				class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-red-100 to-pink-100 text-xl font-bold text-red-600 shadow-md transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
				disabled={targetAge <= 1}
			>
				−
			</button>

			<div class="flex-1 px-2">
				<input
					type="range"
					min="1"
					max="70"
					bind:value={targetAge}
					class="slider h-3 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-blue-200 to-purple-200"
				/>
			</div>

			<button
				onclick={increaseAge}
				class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-100 to-blue-100 text-xl font-bold text-green-600 shadow-md transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
				disabled={targetAge >= 70}
			>
				+
			</button>
		</div>

		<!-- Age display -->
		<div class="text-center">
			<div
				class="inline-flex items-center space-x-2 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2"
			>
				<span class="text-2xl">🎂</span>
				<span class="text-xl font-bold text-orange-600">{targetAge} years old</span>
			</div>
		</div>
	</div>

	<!-- Show exact offsets checkbox with fun styling -->
	<div class="mb-6 flex justify-center">
		<label
			class="flex cursor-pointer items-center space-x-3 rounded-xl border-2 border-gray-200 bg-white p-3 shadow-md transition-colors hover:border-indigo-300"
		>
			<input
				type="checkbox"
				bind:checked={showExactOffsets}
				class="scale-125 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
			/>
			<span class="text-sm font-medium text-gray-700">Show exact age differences ➕➖</span>
		</label>
	</div>

	<!-- Results with colorful styling -->
	<div
		class="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4"
	>
		{#if selectedMember}
			<p class="mb-4 text-center text-lg font-bold text-indigo-800">
				✨ If {selectedMember.displayName} is {targetAge} years old: ✨
			</p>

			<div class="space-y-3">
				{#each futureAges as member (member.email)}
					<div
						class="flex items-center space-x-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
					>
						<div class="text-2xl">{memberEmojis[member.email] || '👤'}</div>
						<div class="flex-1">
							<p class="text-sm font-bold text-gray-800">
								<span class="text-indigo-600">{member.displayName}</span> will be
								<span class="text-lg text-purple-600">{member.futureAge}</span> years old
							</p>
							{#if showExactOffsets}
								<p class="mt-1 text-xs text-gray-500">
									({member.isOlder ? '+' : '-'}{member.ageDifference}
									{member.ageDifference === 1 ? 'year' : 'years'}
									{member.isOlder ? 'older' : 'younger'})
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-center text-gray-600">Select a family member to see age calculations</p>
		{/if}
	</div>
</div>

<style>
	/* Custom animated slider styling */
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 24px;
		width: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.slider::-moz-range-thumb {
		height: 24px;
		width: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	}

	.hover\:scale-102:hover {
		transform: scale(1.02);
	}
</style>
