<script lang="ts">
	import { auth, db } from '$lib/firebase';
	import { doc, getDoc } from 'firebase/firestore';
	import { Brain, Trophy, Timer, RotateCcw, User } from 'lucide-svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import { playSound } from '$lib/sound';
	import { recordScore } from '$lib/gameUtils';

	type Difficulty = 'easy' | 'medium' | 'hard';
	type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
	type GameState = 'setup' | 'playing' | 'finished';

	interface Question {
		question: string;
		correctAnswer: number;
		options: number[];
		operation: Operation;
	}

	let gameState = $state<GameState>('setup');
	let difficulty = $state<Difficulty>('medium');
	let currentQuestion = $state(0);
	let questions = $state<Question[]>([]);
	let score = $state(0);
	let timeLeft = $state(10);
	let selectedAnswer = $state<number | null>(null);
	let showResult = $state(false);
	let userDisplayName = $state('');
	let userAvatarUrl = $state<string | null>(null);

	let timer: NodeJS.Timeout | null = null;

	// Load user display name and avatar when component mounts
	$effect(() => {
		loadUserData();
	});

	async function loadUserData() {
		if (!auth.currentUser?.uid) return;

		try {
			const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
			const userData = userDoc.data();
			userDisplayName = getDisplayName(userData?.email, { nickname: userData?.nickname });
			userAvatarUrl = userData?.avatarUrl || userData?.photoURL || auth.currentUser?.photoURL || null;
		} catch (error) {
			console.error('Error loading user data:', error);
			userDisplayName = getDisplayName(auth.currentUser?.email, { nickname: undefined });
			userAvatarUrl = auth.currentUser?.photoURL || null;
		}
	}

	function getDifficultyRange(diff: Difficulty): { min: number; max: number } {
		switch (diff) {
			case 'easy':
				return { min: 1, max: 5 };
			case 'medium':
				return { min: 1, max: 12 };
			case 'hard':
				return { min: 1, max: 20 };
		}
	}

	function generateRandomNumber(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function generateQuestion(range: { min: number; max: number }): Question {
		const operations: Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
		const operation = operations[Math.floor(Math.random() * operations.length)];

		let num1: number, num2: number, correctAnswer: number, question: string;

		switch (operation) {
			case 'addition':
				num1 = generateRandomNumber(range.min, range.max);
				num2 = generateRandomNumber(range.min, range.max);
				correctAnswer = num1 + num2;
				question = `${num1} + ${num2} = ?`;
				break;

			case 'subtraction':
				num1 = generateRandomNumber(range.min, range.max);
				num2 = generateRandomNumber(range.min, Math.min(num1, range.max));
				correctAnswer = num1 - num2;
				question = `${num1} - ${num2} = ?`;
				break;

			case 'multiplication':
				num1 = generateRandomNumber(range.min, Math.min(range.max, 10));
				num2 = generateRandomNumber(range.min, Math.min(range.max, 10));
				correctAnswer = num1 * num2;
				question = `${num1} × ${num2} = ?`;
				break;

			case 'division':
				// Ensure division results in whole numbers
				num2 = generateRandomNumber(range.min, Math.min(range.max, 10));
				correctAnswer = generateRandomNumber(range.min, Math.min(range.max, 10));
				num1 = num2 * correctAnswer;
				question = `${num1} ÷ ${num2} = ?`;
				break;
		}

		// Generate 3 incorrect options
		const incorrectOptions: number[] = [];
		while (incorrectOptions.length < 3) {
			let incorrect = correctAnswer + generateRandomNumber(-10, 10);
			if (incorrect !== correctAnswer && incorrect > 0 && !incorrectOptions.includes(incorrect)) {
				incorrectOptions.push(incorrect);
			}
		}

		// Shuffle all options
		const options = [correctAnswer, ...incorrectOptions].sort(() => Math.random() - 0.5);

		return {
			question,
			correctAnswer,
			options,
			operation
		};
	}

	function startGame() {
		gameState = 'playing';
		score = 0;
		currentQuestion = 0;
		questions = [];

		const range = getDifficultyRange(difficulty);

		// Generate 5 questions
		for (let i = 0; i < 5; i++) {
			questions.push(generateQuestion(range));
		}

		startTimer();
		playSound('/sounds/click.mp3');
	}

	function startTimer() {
		timeLeft = 10;
		selectedAnswer = null;
		showResult = false;

		timer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				handleTimeUp();
			}
		}, 1000);
	}

	function handleTimeUp() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		selectedAnswer = null;
		showResult = true;
		playSound('/sounds/draw.mp3');

		setTimeout(() => {
			nextQuestion();
		}, 2000);
	}

	function selectAnswer(answer: number) {
		if (selectedAnswer !== null || showResult) return;

		selectedAnswer = answer;
		showResult = true;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		const isCorrect = answer === questions[currentQuestion].correctAnswer;
		if (isCorrect) {
			score += 10;
			playSound('/sounds/victory.mp3');
		} else {
			playSound('/sounds/draw.mp3');
		}

		setTimeout(() => {
			nextQuestion();
		}, 2000);
	}

	function nextQuestion() {
		currentQuestion++;
		if (currentQuestion >= questions.length) {
			endGame();
		} else {
			startTimer();
		}
	}

	async function endGame() {
		gameState = 'finished';
		showResult = false;

		// Save score to Firestore
		if (auth.currentUser?.uid && score > 0) {
			try {
				await recordScore(auth.currentUser.uid, 'math', score);
			} catch (error) {
				console.error('Error saving game result:', error);
			}
		}

		playSound('/sounds/victory.mp3');
	}

	function resetGame() {
		gameState = 'setup';
		score = 0;
		currentQuestion = 0;
		questions = [];
		selectedAnswer = null;
		showResult = false;
		timeLeft = 10;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function getAnswerClass(option: number): string {
		const baseClass = 'w-full p-4 rounded-xl border-2 transition-all duration-200 text-lg font-semibold';
		
		if (!showResult) {
			return `${baseClass} border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer`;
		}

		const isCorrect = option === questions[currentQuestion].correctAnswer;
		const isSelected = option === selectedAnswer;

		if (isCorrect) {
			return `${baseClass} border-green-500 bg-green-100 text-green-700`;
		} else if (isSelected) {
			return `${baseClass} border-red-500 bg-red-100 text-red-700`;
		} else {
			return `${baseClass} border-gray-300 bg-gray-100 text-gray-500`;
		}
	}

	function getProgressPercentage(): number {
		return (timeLeft / 10) * 100;
	}

	function getDifficultyColor(diff: Difficulty): string {
		switch (diff) {
			case 'easy':
				return 'bg-green-100 text-green-700';
			case 'medium':
				return 'bg-yellow-100 text-yellow-700';
			case 'hard':
				return 'bg-red-100 text-red-700';
		}
	}
</script>

<div class="rounded-2xl bg-white p-6 shadow-sm">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center space-x-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
			>
				<Brain class="h-5 w-5 text-white" />
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Math Game</h3>
				<p class="text-sm text-gray-500">Test your math skills</p>
			</div>
		</div>

		<!-- Difficulty Selector (only in setup) -->
		{#if gameState === 'setup'}
			<div class="flex items-center space-x-2">
				<button
					onclick={() => (difficulty = 'easy')}
					class="rounded-full px-3 py-1 text-xs transition-colors {difficulty === 'easy'
						? getDifficultyColor('easy')
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					Easy (1-5)
				</button>
				<button
					onclick={() => (difficulty = 'medium')}
					class="rounded-full px-3 py-1 text-xs transition-colors {difficulty === 'medium'
						? getDifficultyColor('medium')
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					Medium (1-12)
				</button>
				<button
					onclick={() => (difficulty = 'hard')}
					class="rounded-full px-3 py-1 text-xs transition-colors {difficulty === 'hard'
						? getDifficultyColor('hard')
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					Hard (1-20)
				</button>
			</div>
		{/if}
	</div>

	{#if gameState === 'setup'}
		<!-- Setup Screen -->
		<div class="text-center">
			<div class="mb-6">
				<h4 class="mb-2 text-xl font-bold text-gray-900">Ready to Challenge Your Math Skills?</h4>
				<p class="text-gray-600">
					Answer 5 questions correctly to earn points. You have 10 seconds per question!
				</p>
			</div>

			<div class="mb-6 flex items-center justify-center space-x-8">
				<div class="text-center">
					<div class="mb-1 text-2xl">⏱️</div>
					<div class="text-sm text-gray-600">10 sec/question</div>
				</div>
				<div class="text-center">
					<div class="mb-1 text-2xl">🎯</div>
					<div class="text-sm text-gray-600">5 questions</div>
				</div>
				<div class="text-center">
					<div class="mb-1 text-2xl">⭐</div>
					<div class="text-sm text-gray-600">+10 pts each</div>
				</div>
			</div>

			<button
				class="flex items-center space-x-2 rounded-lg bg-primary px-6 py-3 text-white transition-colors duration-200 hover:bg-primary-dark"
				onclick={startGame}
			>
				<Trophy class="h-5 w-5" />
				<span>Start Game</span>
			</button>
		</div>

	{:else if gameState === 'playing'}
		<!-- Game Screen -->
		<div>
			<!-- Progress and Score -->
			<div class="mb-4 flex items-center justify-between">
				<div class="text-sm text-gray-600">
					Question {currentQuestion + 1} of {questions.length}
				</div>
				<div class="text-sm font-semibold text-indigo-600">
					Score: {score} pts
				</div>
			</div>

			<!-- Timer -->
			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-600">Time Left</span>
					<span class="text-sm font-semibold {timeLeft <= 3 ? 'text-red-600' : 'text-gray-900'}">
						{timeLeft}s
					</span>
				</div>
				<div class="h-2 w-full rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full transition-all duration-1000 {timeLeft <= 3 ? 'bg-red-500' : 'bg-indigo-500'}"
						style="width: {getProgressPercentage()}%"
					></div>
				</div>
			</div>

			<!-- Question -->
			<div class="mb-6 text-center">
				<h3 class="text-3xl font-bold text-gray-900 mb-4">
					{questions[currentQuestion]?.question}
				</h3>
			</div>

			<!-- Answer Options -->
			<div class="grid grid-cols-2 gap-3 mb-4">
				{#each questions[currentQuestion]?.options || [] as option (option)}
					<button
						class={getAnswerClass(option)}
						onclick={() => selectAnswer(option)}
						disabled={selectedAnswer !== null || showResult}
					>
						{option}
					</button>
				{/each}
			</div>

			<!-- Result Message -->
			{#if showResult}
				<div class="text-center">
					{#if selectedAnswer === questions[currentQuestion]?.correctAnswer}
						<div class="text-green-600 font-semibold">✅ Correct! +10 points</div>
					{:else if selectedAnswer === null}
						<div class="text-yellow-600 font-semibold">⏰ Time's up!</div>
						<div class="text-sm text-gray-600">
							Correct answer: {questions[currentQuestion]?.correctAnswer}
						</div>
					{:else}
						<div class="text-red-600 font-semibold">❌ Wrong!</div>
						<div class="text-sm text-gray-600">
							Correct answer: {questions[currentQuestion]?.correctAnswer}
						</div>
					{/if}
				</div>
			{/if}
		</div>

	{:else if gameState === 'finished'}
		<!-- Results Screen -->
		<div class="text-center">
			<div class="mb-4">
				{#if userAvatarUrl}
					<img
						class="mx-auto h-16 w-16 rounded-full object-cover mb-3"
						src={userAvatarUrl}
						alt={userDisplayName}
					/>
				{:else}
					<div class="mx-auto h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center mb-3">
						<User class="h-8 w-8 text-gray-500" />
					</div>
				{/if}
				<div class="text-lg font-semibold text-gray-900">{userDisplayName}</div>
			</div>

			<div class="mb-6">
				<h3 class="mb-2 text-2xl font-bold text-gray-900">Round Complete!</h3>
				<div class="text-4xl font-bold text-indigo-600 mb-2">{score} points</div>
				<div class="text-gray-600">
					{Math.floor(score / 10)} out of {questions.length} correct answers
				</div>
			</div>

			<div class="mb-6 flex justify-center space-x-8">
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-900">{Math.floor(score / 10)}</div>
					<div class="text-sm text-gray-600">Correct</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-900">{questions.length - Math.floor(score / 10)}</div>
					<div class="text-sm text-gray-600">Wrong</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-indigo-600">{score}</div>
					<div class="text-sm text-gray-600">Points</div>
				</div>
			</div>

			<button
				class="flex items-center space-x-2 rounded-lg bg-primary px-6 py-3 text-white transition-colors duration-200 hover:bg-primary-dark"
				onclick={resetGame}
			>
				<RotateCcw class="h-5 w-5" />
				<span>Play Again</span>
			</button>
		</div>
	{/if}
</div>