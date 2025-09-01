<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	type Dream = {
		name: string;
		icon: string;
		background: string;
		facts: {
			role: string;
			description: string;
			emoji: string;
		}[];
	};

	const dreams: Dream[] = [
		{
			name: 'Engineer',
			icon: '🛠️',
			background: 'from-blue-100 to-cyan-100',
			facts: [
				{ role: 'The Builder', description: 'Engineers design and build things like bridges, cars, and phones.', emoji: '🏗️' },
				{ role: 'The Problem Solver', description: 'They solve problems and make life easier for everyone.', emoji: '🧩' },
				{ role: 'The Creator', description: "It's fun to create and see your ideas come alive!", emoji: '💡' },
				{ role: 'The Learner', description: 'Sometimes projects fail, but you learn and try again.', emoji: '📚' },
				{ role: 'The World Changer', description: 'Engineers change how people live every day.', emoji: '🌍' }
			]
		},
		{
			name: 'Doctor',
			icon: '🩺',
			background: 'from-green-100 to-emerald-100',
			facts: [
				{ role: 'The Healer', description: 'Doctors help sick people get better and save lives.', emoji: '❤️' },
				{ role: 'The Hope Bringer', description: 'Doctors bring hope to families everywhere.', emoji: '🌟' },
				{ role: 'The Student', description: 'It takes years of learning and practice.', emoji: '🎓' },
				{ role: 'The Scientist', description: 'They study the human body and medicine.', emoji: '🔬' },
				{ role: 'The Life Saver', description: 'Doctors make the world healthier and safer.', emoji: '🏥' }
			]
		},
		{
			name: 'Teacher',
			icon: '📚',
			background: 'from-purple-100 to-pink-100',
			facts: [
				{ role: 'The Guide', description: 'They help kids learn reading, math, and more.', emoji: '🧭' },
				{ role: 'The Inspirer', description: 'Teachers inspire children to dream big.', emoji: '✨' },
				{ role: 'The Patient Helper', description: 'They work hard every day to explain and guide.', emoji: '🤝' },
				{ role: 'The Future Shaper', description: 'Teachers shape the future by teaching the next generation.', emoji: '🌱' },
				{ role: 'The Knowledge Giver', description: 'They share wisdom that lasts a lifetime.', emoji: '📖' }
			]
		},
		{
			name: 'Pilot',
			icon: '✈️',
			background: 'from-sky-100 to-blue-100',
			facts: [
				{ role: 'The Sky Navigator', description: 'They fly planes across the world.', emoji: '🌍' },
				{ role: 'The Safety Guardian', description: 'Pilots keep passengers safe in the sky.', emoji: '🛡️' },
				{ role: 'The Focused One', description: 'It takes focus, training, and courage.', emoji: '🎯' },
				{ role: 'The World Connector', description: 'Pilots make the world connected.', emoji: '🌐' },
				{ role: 'The Adventure Seeker', description: 'They see the world from above every day.', emoji: '🏔️' }
			]
		},
		{
			name: 'Astronaut',
			icon: '🚀',
			background: 'from-indigo-100 to-purple-100',
			facts: [
				{ role: 'The Space Explorer', description: 'They explore the stars and planets.', emoji: '🌌' },
				{ role: 'The Brave Pioneer', description: 'Space travel is risky, but also exciting.', emoji: '⭐' },
				{ role: 'The Scientist', description: 'Astronauts do science that helps everyone on Earth.', emoji: '🔬' },
				{ role: 'The Dedicated Trainer', description: 'They train for many years before going to space.', emoji: '💪' },
				{ role: 'The Wonder Shower', description: 'Astronauts show us how big the universe is.', emoji: '🌠' }
			]
		},
		{
			name: 'Artist',
			icon: '🎨',
			background: 'from-rose-100 to-orange-100',
			facts: [
				{ role: 'The Creator', description: 'Artists make beautiful paintings, drawings, and sculptures.', emoji: '🖌️' },
				{ role: 'The Emotion Speaker', description: 'Art can make people feel happy, sad, or amazed.', emoji: '😊' },
				{ role: 'The Imagination User', description: 'They turn ideas in their mind into real things.', emoji: '💭' },
				{ role: 'The Patient Worker', description: 'Art takes time, practice, and lots of tries.', emoji: '⏰' },
				{ role: 'The Beauty Maker', description: 'Artists fill the world with color and beauty.', emoji: '🌈' }
			]
		}
	];

	let selected: Dream | null = $state(null);
	let step = $state(0);
	let isCompleted = $state(false);

	function chooseDream(d: Dream) {
		selected = d;
		step = 0;
		isCompleted = false;
	}

	function nextStep() {
		if (selected && step < selected.facts.length - 1) {
			step++;
		} else if (selected && step === selected.facts.length - 1) {
			isCompleted = true;
		}
	}

	function restart() {
		selected = null;
		step = 0;
		isCompleted = false;
	}
</script>

<div class="rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-lg border-2 border-yellow-200">
	<h2 class="mb-6 text-2xl font-bold text-center text-orange-700">🌟 Build a Dream 🌟</h2>

	{#if !selected}
		<div class="text-center mb-4">
			<p class="text-lg text-orange-600 font-medium">Choose a career to explore!</p>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each dreams as dream (dream.name)}
				<button
					class="flex flex-col items-center rounded-2xl bg-gradient-to-br {dream.background} p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 border-transparent hover:border-white"
					onclick={() => chooseDream(dream)}
				>
					<span class="text-3xl mb-2">{dream.icon}</span>
					<div class="text-sm font-bold text-gray-800">{dream.name}</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Career header with background -->
			<div class="rounded-2xl bg-gradient-to-br {selected.background} p-4 text-center border-2 border-white">
				<h3 class="text-xl flex items-center justify-center font-bold text-gray-800">
					<span class="mr-3 text-3xl">{selected.icon}</span>
					{selected.name}
				</h3>
			</div>

			<!-- Progress indicators -->
			<div class="flex justify-center space-x-2 mb-4">
				{#each selected.facts as _, i}
					<div 
						class="w-3 h-3 rounded-full transition-all duration-300 {i <= step ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-110' : 'bg-gray-300'}"
					></div>
				{/each}
			</div>

			{#if !isCompleted}
				<!-- Current step content -->
				<div 
					class="rounded-2xl bg-white p-4 shadow-md border-2 border-gray-200"
					in:fly={{ y: 20, duration: 300 }}
				>
					<div class="text-center mb-3">
						<div class="text-2xl mb-2">{selected.facts[step].emoji}</div>
						<h4 class="text-lg font-bold text-purple-700">{selected.facts[step].role}</h4>
					</div>
					<p class="text-gray-700 text-center">{selected.facts[step].description}</p>
				</div>

				<div class="flex justify-center">
					<button
						class="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-white font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
						onclick={nextStep}
					>
						{step < selected.facts.length - 1 ? 'Next Role →' : 'Complete Journey! ✨'}
					</button>
				</div>
			{:else}
				<!-- Completion celebration -->
				<div 
					class="rounded-2xl bg-gradient-to-br from-yellow-100 to-green-100 p-6 text-center border-2 border-yellow-300"
					in:fly={{ y: 20, duration: 500 }}
				>
					<!-- Celebration animation -->
					<div class="text-4xl mb-4 animate-bounce">🎉</div>
					<h4 class="text-xl font-bold text-green-700 mb-3">Dream Journey Complete!</h4>
					<p class="text-green-600 mb-4">You explored all the amazing roles of a {selected.name}!</p>
					
					<!-- Floating celebration emojis -->
					<div class="relative overflow-hidden h-16 mb-4">
						{#each ['⭐', '🌟', '✨', '🎊', '🎈'] as emoji, i}
							<div 
								class="absolute text-2xl animate-pulse"
								style="left: {20 + i * 15}%; animation-delay: {i * 0.2}s;"
							>
								{emoji}
							</div>
						{/each}
					</div>
					
					<p class="text-sm text-gray-700 italic">
						Every career has different roles - from learning and growing to making a difference in the world!
					</p>
				</div>
			{/if}

			<div class="flex justify-center">
				<button
					class="rounded-xl bg-gray-200 px-4 py-2 transition-all duration-200 hover:bg-gray-300 hover:scale-105"
					onclick={restart}
				>
					🔄 Explore Another Dream
				</button>
			</div>
		</div>
	{/if}
</div>
