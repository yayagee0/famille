<script lang="ts">
	import { fade } from 'svelte/transition';

	type Dream = {
		name: string;
		icon: string;
		facts: string[];
	};

	const dreams: Dream[] = [
		{
			name: 'Engineer',
			icon: '🛠️',
			facts: [
				'Most people become this at 24 years old.',
				'Engineers design and build things like bridges, cars, and phones.',
				'They solve problems and make life easier for everyone.',
				"It's fun to create and see your ideas come alive!",
				'Sometimes projects fail, but you learn and try again.',
				'Engineers change how people live every day.'
			]
		},
		{
			name: 'Doctor',
			icon: '🩺',
			facts: [
				'Doctors usually finish training around 26 years old.',
				'They help sick people get better and save lives.',
				'Doctors bring hope to families everywhere.',
				'It takes years of learning and practice.',
				'Doctors make the world healthier.'
			]
		},
		{
			name: 'Teacher',
			icon: '📚',
			facts: [
				'Teachers start working in their 20s.',
				'They help kids learn reading, math, and more.',
				'Teachers inspire children to dream big.',
				'They work hard every day to explain and guide.',
				'Teachers shape the future by teaching the next generation.'
			]
		},
		{
			name: 'Pilot',
			icon: '✈️',
			facts: [
				'Pilots often start flying in their 20s.',
				'They fly planes across the world.',
				'Pilots keep passengers safe in the sky.',
				'It takes focus, training, and courage.',
				'Pilots make the world connected.'
			]
		},
		{
			name: 'Astronaut',
			icon: '🚀',
			facts: [
				'Astronauts train for many years before going to space.',
				'They explore the stars and planets.',
				'Astronauts do science that helps everyone on Earth.',
				'Space travel is risky, but also exciting.',
				'Astronauts show us how big the universe is.'
			]
		},
		{
			name: 'Game Designer',
			icon: '🎮',
			facts: [
				'Many game designers start in their 20s.',
				'They make video games kids and adults enjoy.',
				"It's creative work mixing art, music, and coding.",
				'It can be long hours of testing and fixing bugs.',
				'Game designers bring fun and adventure to life.'
			]
		},
		{
			name: 'Singer',
			icon: '🎤',
			facts: [
				'Some singers start very young.',
				'They perform songs that make people happy.',
				'Singers can become famous and loved by fans.',
				'It takes practice and courage to sing on stage.',
				'Songs can stay in hearts for many years.'
			]
		},
		{
			name: 'Actor',
			icon: '🎭',
			facts: [
				'Actors often start acting in their teens or 20s.',
				'They tell stories in movies and shows.',
				'Actors can be famous and earn money.',
				'But acting takes practice and sometimes rejection.',
				'Actors entertain and inspire people everywhere.'
			]
		},
		{
			name: 'Youtuber',
			icon: '📹',
			facts: [
				'Some Youtubers start as teenagers.',
				'They share videos and get many fans.',
				'They can make money and become famous.',
				'But it can be stressful to always be online.',
				'Fame can fade, but memories of videos last.'
			]
		},
		{
			name: 'Entrepreneur',
			icon: '💼',
			facts: [
				'Entrepreneurs start businesses, often in their 20s or 30s.',
				'They bring new ideas to life.',
				'It can be risky, but also exciting.',
				'They create jobs for others.',
				'Entrepreneurs can change whole communities.'
			]
		},
		{
			name: 'Lawyer',
			icon: '⚖️',
			facts: [
				'Lawyers finish school in their mid-20s.',
				'They help people with laws and rules.',
				'Lawyers can defend the innocent or fight for fairness.',
				'It takes years of reading and study.',
				'Lawyers protect justice in society.'
			]
		}
	];

	let selected: Dream | null = $state(null);
	let step = $state(0);

	function chooseDream(d: Dream) {
		selected = d;
		step = 0;
	}

	function nextStep() {
		if (selected && step < selected.facts.length - 1) {
			step++;
		}
	}

	function restart() {
		selected = null;
		step = 0;
	}
</script>

<div class="rounded-xl bg-white p-4 shadow">
	<h2 class="mb-2 text-lg font-bold">🌟 Build a Dream</h2>

	{#if !selected}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each dreams as dream (dream.name)}
				<button
					class="flex flex-col items-center rounded-lg bg-indigo-50 p-3 transition-colors hover:bg-indigo-100"
					onclick={() => chooseDream(dream)}
				>
					<span class="text-2xl">{dream.icon}</span>
					<div class="text-sm font-medium">{dream.name}</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="space-y-3">
			<h3 class="text-md flex items-center font-semibold">
				<span class="mr-2 text-2xl">{selected.icon}</span>
				{selected.name}
			</h3>
			<p transition:fade class="rounded-lg bg-indigo-50 p-3">
				{selected.facts[step]}
			</p>

			{#if step < selected.facts.length - 1}
				<button
					class="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
					onclick={nextStep}
				>
					Next
				</button>
			{:else}
				<p class="text-sm text-green-600">✨ You finished this dream journey!</p>
				<p class="mt-2 text-sm text-indigo-700">
					Some jobs bring <strong>fame</strong> or <strong>money</strong>, other jobs bring
					<strong>change</strong> to the world. Both are good, but making life better for people lasts
					forever.
				</p>
			{/if}

			<button
				class="rounded-lg bg-gray-200 px-4 py-2 transition-colors hover:bg-gray-300"
				onclick={restart}
			>
				Restart
			</button>
		</div>
	{/if}
</div>
