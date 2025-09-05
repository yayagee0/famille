<script lang="ts">
	import { fly } from 'svelte/transition';
	import { playSound } from '$lib/sound';

	// Career data with backgrounds and progression facts
	const dreams = [
		{
			name: 'Doctor',
			icon: '👩‍⚕️',
			background: 'from-blue-200 to-green-200',
			facts: [
				{ emoji: '📚', role: 'Medical Student', description: 'Learning about the human body' },
				{ emoji: '🩺', role: 'Intern', description: 'Practicing with real patients' },
				{ emoji: '🏥', role: 'Resident', description: 'Specializing in their field' },
				{ emoji: '👩‍⚕️', role: 'Doctor', description: 'Helping people feel better every day' }
			]
		},
		{
			name: 'Teacher',
			icon: '👩‍🏫',
			background: 'from-yellow-200 to-orange-200',
			facts: [
				{ emoji: '🎓', role: 'Student Teacher', description: 'Learning how to teach others' },
				{ emoji: '📝', role: 'Substitute Teacher', description: 'Helping different classrooms' },
				{ emoji: '🍎', role: 'Class Teacher', description: 'Having their own classroom' },
				{ emoji: '🌟', role: 'Master Teacher', description: 'Inspiring young minds every day' }
			]
		},
		{
			name: 'Engineer',
			icon: '👷‍♀️',
			background: 'from-purple-200 to-pink-200',
			facts: [
				{ emoji: '⚙️', role: 'Engineering Student', description: 'Learning to build and design' },
				{ emoji: '🔧', role: 'Junior Engineer', description: 'Working on small projects' },
				{ emoji: '🏗️', role: 'Project Engineer', description: 'Leading important builds' },
				{ emoji: '🚀', role: 'Senior Engineer', description: 'Creating amazing inventions' }
			]
		},
		{
			name: 'Artist',
			icon: '🎨',
			background: 'from-pink-200 to-purple-200',
			facts: [
				{ emoji: '✏️', role: 'Art Student', description: 'Learning different techniques' },
				{ emoji: '🖌️', role: 'Freelance Artist', description: 'Creating art for others' },
				{ emoji: '🖼️', role: 'Gallery Artist', description: 'Showing art in museums' },
				{ emoji: '🌈', role: 'Master Artist', description: 'Inspiring the world with creativity' }
			]
		},
		{
			name: 'Chef',
			icon: '👩‍🍳',
			background: 'from-red-200 to-yellow-200',
			facts: [
				{ emoji: '🥄', role: 'Kitchen Helper', description: 'Learning basic cooking skills' },
				{ emoji: '👨‍🍳', role: 'Line Cook', description: 'Making specific dishes' },
				{ emoji: '🍽️', role: 'Sous Chef', description: 'Helping run the kitchen' },
				{ emoji: '⭐', role: 'Head Chef', description: 'Creating delicious meals for everyone' }
			]
		},
		{
			name: 'Astronaut',
			icon: '👩‍🚀',
			background: 'from-indigo-200 to-blue-200',
			facts: [
				{ emoji: '🔬', role: 'Space Scientist', description: 'Studying planets and stars' },
				{ emoji: '✈️', role: 'Test Pilot', description: 'Flying experimental aircraft' },
				{ emoji: '🚀', role: 'Astronaut Trainee', description: 'Learning to live in space' },
				{ emoji: '🌌', role: 'Space Explorer', description: 'Discovering new worlds' }
			]
		}
	];

	let selected = $state(null as (typeof dreams)[0] | null);
	let step = $state(0);
	let isCompleted = $state(false);

	// Reset state when selecting a new dream
	function chooseDream(dream: (typeof dreams)[0]) {
		selected = dream;
		step = 0;
		isCompleted = false;
		playSound('/sounds/chime.mp3');
	}

	function nextStep() {
		if (!selected) return;

		if (step < selected.facts.length - 1) {
			step++;
			playSound('/sounds/select.mp3');
		} else {
			isCompleted = true;
			playSound('/sounds/victory.mp3');
		}
	}

	function restart() {
		selected = null;
		step = 0;
		isCompleted = false;
		playSound('/sounds/select.mp3');
	}

	function handleDreamHover() {
		playSound('/sounds/select.mp3');
	}
</script>

<div class="space-y-6">
	{#if !selected}
		<!-- Career selection grid -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each dreams as dream (dream.name)}
				<button
					class="flex flex-col items-center rounded-2xl bg-gradient-to-br {dream.background} animate-bounce-slow border-2 border-transparent p-4 transition-all duration-300 hover:scale-105 hover:border-white hover:shadow-lg"
					onclick={() => chooseDream(dream)}
					onmouseenter={handleDreamHover}
				>
					<span class="hover:animate-wiggle mb-2 text-3xl">{dream.icon}</span>
					<div class="text-sm font-bold text-gray-800">{dream.name}</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Career header with background -->
			<div
				class="rounded-2xl bg-gradient-to-br {selected.background} border-2 border-white p-4 text-center"
			>
				<h3 class="flex items-center justify-center text-xl font-bold text-gray-800">
					<span class="animate-wiggle mr-3 text-3xl">{selected.icon}</span>
					{selected.name}
				</h3>
			</div>

			<!-- Progress indicators -->
			<div class="mb-4 flex justify-center space-x-2">
				{#each selected.facts as _, progressStep (progressStep)}
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					<div
						class="h-3 w-3 rounded-full transition-all duration-300 {progressStep <= step
							? 'scale-110 bg-gradient-to-r from-purple-500 to-pink-500'
							: 'bg-gray-300'}"
					></div>
				{/each}
			</div>

			{#if !isCompleted}
				<!-- Current step content -->
				<div
					class="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-md"
					in:fly={{ y: 20, duration: 300 }}
				>
					<div class="mb-3 text-center">
						<div class="animate-bounce-slow mb-2 text-2xl">{selected.facts[step].emoji}</div>
						<h4 class="text-lg font-bold text-purple-700">{selected.facts[step].role}</h4>
					</div>
					<p class="text-center text-gray-600">{selected.facts[step].description}</p>
				</div>

				<!-- Next button -->
				<div class="flex justify-center">
					<button
						class="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-pink-600"
						onclick={nextStep}
					>
						{step < selected.facts.length - 1 ? 'Next Step' : 'Complete Journey'} ✨
					</button>
				</div>
			{:else}
				<!-- Completion celebration -->
				<div
					class="animate-confetti rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center"
					in:fly={{ y: -20, duration: 500 }}
				>
					<h4 class="mb-3 text-xl font-bold text-green-700">Dream Journey Complete!</h4>
					<p class="mb-4 text-green-600">
						You explored all the amazing roles of a {selected.name}!
					</p>

					<!-- Floating celebration emojis -->
					<div class="relative mb-4 h-16 overflow-hidden">
						{#each ['⭐', '🌟', '✨', '🎊', '🎈'] as emoji, i (emoji)}
							<div
								class="animate-confetti absolute animate-pulse text-2xl"
								style="left: {20 + i * 15}%; animation-delay: {i * 0.2}s;"
							>
								{emoji}
							</div>
						{/each}
					</div>

					<p class="text-sm text-gray-700 italic">
						Every career has different roles - from learning and growing to making a difference in
						the world!
					</p>
				</div>
			{/if}

			<div class="flex justify-center">
				<button
					class="rounded-xl bg-gray-200 px-4 py-2 transition-all duration-200 hover:scale-105 hover:bg-gray-300"
					onclick={restart}
				>
					🔄 Explore Another Dream
				</button>
			</div>
		</div>
	{/if}
</div>
