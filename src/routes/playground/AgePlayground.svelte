<script lang="ts">
	import { members } from '$lib/widget-context';
	import { ageOn } from '$lib/users';
	import { getDisplayName } from '$lib/getDisplayName';
	import { playSound } from '$lib/sound';
	import GlassChip from '$lib/themes/neo/components/GlassChip.svelte';
	import { themeStore } from '$lib/themes/neo';

	// Get widget context for family members
	// members store now provides reactive access

	// Member emojis for fun visual representation
	const memberEmojis: Record<string, string> = {
		'nilezat@gmail.com': '👨‍💼',
		'abdessamia.mariem@gmail.com': '👩‍💼',
		'yazidgeemail@gmail.com': '👦',
		'yahyageemail@gmail.com': '🧒'
	};

	// Theme state
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Get members who have birthdays as an array
	const membersWithBirthdays = $derived(
		Object.values($members).filter((member) => member.birthday)
	);

	// State for the selected family member and target age - initialize with first member when available
	let selectedMember = $state(null as (typeof membersWithBirthdays)[0] | null);
	let targetAge = $state(10);

	// Helper function to format age display
	function formatAge(years: number) {
		if (years < 0) return 'Not born yet 🍼';
		return `${years} years old 🎂`;
	}

	// Update selected member when members become available
	$effect(() => {
		if (membersWithBirthdays.length > 0 && !selectedMember) {
			selectedMember = membersWithBirthdays[0];
		}
	});

	// Calculate age differences for selected member and target age
	let ageCalculations = $state<
		Array<{
			email: string;
			displayName: string;
			nickname?: string;
			birthday?: string;
			avatarUrl?: string;
			ageAtTarget: number;
			ageDifference: number;
		}>
	>([]);

	// Update calculations when selectedMember or targetAge changes
	$effect(() => {
		if (!selectedMember?.birthday) {
			ageCalculations = [];
			return;
		}

		const selectedCurrentAge = ageOn(selectedMember.birthday);
		// memberBirthday variable removed - unused
		const targetDate = new Date();
		targetDate.setFullYear(targetDate.getFullYear() + (targetAge - selectedCurrentAge));

		ageCalculations = membersWithBirthdays
			.map((member) => {
				if (!member.birthday) return null;

				const age = ageOn(member.birthday, targetDate);
				const currentAge = ageOn(member.birthday);
				const ageDiff = age - currentAge;

				return {
					...member,
					ageAtTarget: age,
					ageDifference: ageDiff
				};
			})
			.filter((m): m is NonNullable<typeof m> => m !== null);
	});

	function decreaseAge() {
		if (targetAge > 0) {
			targetAge--;
			playSound('/sounds/select.mp3');
		}
	}

	function increaseAge() {
		if (targetAge < 70) {
			targetAge++;
			playSound('/sounds/select.mp3');
		}
	}

	function selectMember(member: any) {
		selectedMember = member;
		playSound('/sounds/chime.mp3');
	}
</script>

<div class="space-y-6">
	<!-- Member selector -->
	<div class="flex flex-wrap justify-center gap-2">
		{#each membersWithBirthdays as member (member.email)}
			{#if currentTheme === 'neo'}
				<GlassChip
					onclick={() => selectMember(member)}
					variant={selectedMember?.email === member.email ? 'accent' : 'default'}
				>
					<span class="text-lg">{memberEmojis[member.email] || '👤'}</span>
					<span>{getDisplayName(member.email, { nickname: member.nickname })}</span>
				</GlassChip>
			{:else}
				<button
					onclick={() => selectMember(member)}
					class="flex items-center space-x-2 rounded-full border-2 px-4 py-2 transition-all duration-200 hover:scale-105 {selectedMember?.email ===
					member.email
						? 'border-purple-400 bg-purple-100 text-purple-700'
						: 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'}"
				>
					<span class="text-lg">{memberEmojis[member.email] || '👤'}</span>
					<span class="text-sm font-medium"
						>{getDisplayName(member.email, { nickname: member.nickname })}</span
					>
				</button>
			{/if}
		{/each}
	</div>

	{#if selectedMember}
		<!-- Age controls -->
		<div class="flex items-center justify-center space-x-4">
			{#if currentTheme === 'neo'}
				<button
					onclick={decreaseAge}
					class="neo-button flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold transition-all duration-300 disabled:opacity-50"
					style="border-color: var(--neo-magenta); color: var(--neo-magenta);"
					disabled={targetAge <= 0}
				>
					-
				</button>
			{:else}
				<button
					onclick={decreaseAge}
					class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-red-100 to-pink-100 text-xl font-bold text-red-600 shadow-md transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
					disabled={targetAge <= 0}
				>
					-
				</button>
			{/if}

			<!-- Age display -->
			<div class="text-center">
				{#if currentTheme === 'neo'}
					<div class="neo-glass inline-flex items-center space-x-2 rounded-xl border px-4 py-2" style="border-color: var(--neo-lime);">
						<span class="text-2xl">🎂</span>
						<span class="text-xl font-bold" style="color: var(--neo-lime);">{formatAge(targetAge)}</span>
					</div>
				{:else}
					<div
						class="inline-flex items-center space-x-2 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2"
					>
						<span class="text-2xl">🎂</span>
						<span class="text-xl font-bold text-orange-600">{formatAge(targetAge)}</span>
					</div>
				{/if}
			</div>

			{#if currentTheme === 'neo'}
				<button
					onclick={increaseAge}
					class="neo-button flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold transition-all duration-300 disabled:opacity-50"
					style="border-color: var(--neo-cyan); color: var(--neo-cyan);"
					disabled={targetAge >= 70}
				>
					+
				</button>
			{:else}
				<button
					onclick={increaseAge}
					class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-100 to-blue-100 text-xl font-bold text-green-600 shadow-md transition-transform duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
					disabled={targetAge >= 70}
				>
					+
				</button>
			{/if}
		</div>

		<!-- Results display -->
		{#if ageCalculations.length > 0}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each ageCalculations as member (member.email)}
					{#if currentTheme === 'neo'}
						<div class="neo-glass neo-row-hover rounded-xl border p-4 text-center" style="border-color: var(--neo-border);">
							<div class="mb-2 text-2xl">{memberEmojis[member.email] || '👤'}</div>
							<div class="text-sm font-medium" style="color: var(--neo-text-secondary);">
								{getDisplayName(member.email, { nickname: member.nickname })}
							</div>
							<div class="text-lg font-bold" style="color: var(--neo-cyan);">{formatAge(member.ageAtTarget)}</div>
							<div class="text-xs" style="color: var(--neo-text-muted);">
								{member.ageDifference > 0 ? '+' : ''}{member.ageDifference} years from now
							</div>
						</div>
					{:else}
						<div
							class="rounded-xl border-2 border-gray-200 bg-white p-4 text-center shadow-sm transition-transform duration-200 hover:scale-102"
						>
							<div class="mb-2 text-2xl">{memberEmojis[member.email] || '👤'}</div>
							<div class="text-sm font-medium text-gray-700">
								{getDisplayName(member.email, { nickname: member.nickname })}
							</div>
							<div class="text-lg font-bold text-purple-600">{formatAge(member.ageAtTarget)}</div>
							<div class="text-xs text-gray-500">
								{member.ageDifference > 0 ? '+' : ''}{member.ageDifference} years from now
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			<p class="text-center {currentTheme === 'neo' ? '' : 'text-gray-600'}" style="{currentTheme === 'neo' ? 'color: var(--neo-text-secondary);' : ''}">Select a family member to see age calculations</p>
		{/if}
	{/if}
</div>

<style>
	.hover\:scale-102:hover {
		transform: scale(1.02);
	}
</style>
