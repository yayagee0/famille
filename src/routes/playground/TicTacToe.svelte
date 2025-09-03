<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import Button from '$lib/components/Button.svelte';
	import { RotateCcw, Trophy, Bot, User } from 'lucide-svelte';

	type Player = 'X' | 'O' | null;
	type Board = Player[];
	type GameResult = 'win' | 'lose' | 'draw' | null;
	type Difficulty = 'easy' | 'hard';

	let board = $state<Board>(Array(9).fill(null));
	let currentPlayer = $state<Player>('X');
	let gameResult = $state<GameResult>(null);
	let isPlayerTurn = $state(true);
	let difficulty = $state<Difficulty>('hard');
	let isThinking = $state(false);

	const user = $state(auth.currentUser);

	function resetGame() {
		board = Array(9).fill(null);
		currentPlayer = 'X';
		gameResult = null;
		isPlayerTurn = true;
		isThinking = false;
	}

	function checkWinner(board: Board): Player {
		const winPatterns = [
			[0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
			[0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
			[0, 4, 8], [2, 4, 6] // diagonals
		];

		for (const pattern of winPatterns) {
			const [a, b, c] = pattern;
			if (board[a] && board[a] === board[b] && board[a] === board[c]) {
				return board[a];
			}
		}
		return null;
	}

	function isBoardFull(board: Board): boolean {
		return board.every(cell => cell !== null);
	}

	function getAvailableMoves(board: Board): number[] {
		return board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1);
	}

	// Minimax algorithm for hard AI
	function minimax(board: Board, depth: number, isMaximizing: boolean): number {
		const winner = checkWinner(board);
		
		if (winner === 'O') return 10 - depth; // AI wins
		if (winner === 'X') return depth - 10; // Player wins
		if (isBoardFull(board)) return 0; // Draw

		if (isMaximizing) {
			let maxEval = -Infinity;
			for (const move of getAvailableMoves(board)) {
				board[move] = 'O';
				const eval_ = minimax(board, depth + 1, false);
				board[move] = null;
				maxEval = Math.max(maxEval, eval_);
			}
			return maxEval;
		} else {
			let minEval = Infinity;
			for (const move of getAvailableMoves(board)) {
				board[move] = 'X';
				const eval_ = minimax(board, depth + 1, true);
				board[move] = null;
				minEval = Math.min(minEval, eval_);
			}
			return minEval;
		}
	}

	function getBestMove(board: Board): number {
		if (difficulty === 'easy') {
			// Random move for easy difficulty
			const availableMoves = getAvailableMoves(board);
			return availableMoves[Math.floor(Math.random() * availableMoves.length)];
		} else {
			// Minimax for hard difficulty
			let bestMove = -1;
			let bestValue = -Infinity;

			for (const move of getAvailableMoves(board)) {
				board[move] = 'O';
				const moveValue = minimax(board, 0, false);
				board[move] = null;

				if (moveValue > bestValue) {
					bestValue = moveValue;
					bestMove = move;
				}
			}
			return bestMove;
		}
	}

	async function makePlayerMove(index: number) {
		if (board[index] || !isPlayerTurn || gameResult) return;

		// Player move
		board[index] = 'X';
		
		const winner = checkWinner(board);
		if (winner) {
			gameResult = winner === 'X' ? 'win' : 'lose';
			await saveGame();
			return;
		}
		
		if (isBoardFull(board)) {
			gameResult = 'draw';
			await saveGame();
			return;
		}

		// AI turn
		isPlayerTurn = false;
		isThinking = true;
		
		// Add slight delay for better UX
		setTimeout(async () => {
			const aiMove = getBestMove(board);
			board[aiMove] = 'O';
			
			const aiWinner = checkWinner(board);
			if (aiWinner) {
				gameResult = aiWinner === 'X' ? 'win' : 'lose';
				await saveGame();
			} else if (isBoardFull(board)) {
				gameResult = 'draw';
				await saveGame();
			} else {
				isPlayerTurn = true;
			}
			
			isThinking = false;
		}, 500);
	}

	async function saveGame() {
		if (!user?.uid || !gameResult) return;

		try {
			await addDoc(collection(db, 'games', 'tic-tac', 'matches'), {
				playerUid: user.uid,
				playerName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
				result: gameResult,
				difficulty,
				board: board.slice(), // Save final board state
				timestamp: serverTimestamp(),
				moves: board.reduce((moves, cell, index) => cell ? moves + 1 : moves, 0)
			});
		} catch (error) {
			console.error('Error saving game:', error);
		}
	}

	function getCellClass(index: number) {
		const baseClass = 'w-20 h-20 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 hover:border-indigo-400 hover:shadow-md';
		
		if (board[index]) {
			return `${baseClass} ${board[index] === 'X' ? 'text-indigo-600' : 'text-red-500'}`;
		}
		
		return `${baseClass} cursor-pointer hover:bg-gray-50`;
	}

	function getResultMessage() {
		switch (gameResult) {
			case 'win': return '🎉 You won!';
			case 'lose': return '🤖 AI wins!';
			case 'draw': return '🤝 It\'s a draw!';
			default: return '';
		}
	}

	function getResultColor() {
		switch (gameResult) {
			case 'win': return 'text-green-600';
			case 'lose': return 'text-red-600';
			case 'draw': return 'text-yellow-600';
			default: return '';
		}
	}
</script>

<div class="bg-white rounded-2xl p-6 shadow-sm">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center space-x-3">
			<div class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
				<Trophy class="w-5 h-5 text-white" />
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Tic-Tac-Toe</h3>
				<p class="text-sm text-gray-500">Play against AI</p>
			</div>
		</div>
		
		<!-- Difficulty Toggle -->
		<div class="flex items-center space-x-2">
			<button
				onclick={() => difficulty = 'easy'}
				class="px-3 py-1 text-xs rounded-full transition-colors {difficulty === 'easy' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
			>
				Easy
			</button>
			<button
				onclick={() => difficulty = 'hard'}
				class="px-3 py-1 text-xs rounded-full transition-colors {difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
			>
				Hard
			</button>
		</div>
	</div>

	<!-- Game Status -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center space-x-4">
			<div class="flex items-center space-x-2">
				<User class="w-4 h-4 text-indigo-600" />
				<span class="text-sm text-gray-600">You: X</span>
			</div>
			<div class="flex items-center space-x-2">
				<Bot class="w-4 h-4 text-red-500" />
				<span class="text-sm text-gray-600">AI: O ({difficulty})</span>
			</div>
		</div>
		
		{#if gameResult}
			<div class="text-sm font-medium {getResultColor()}">
				{getResultMessage()}
			</div>
		{:else if isThinking}
			<div class="text-sm text-gray-500 flex items-center space-x-2">
				<div class="w-3 h-3 animate-spin rounded-full border-b-2 border-red-500"></div>
				<span>AI thinking...</span>
			</div>
		{:else if isPlayerTurn}
			<div class="text-sm text-indigo-600 font-medium">Your turn</div>
		{/if}
	</div>

	<!-- Game Board -->
	<div class="grid grid-cols-3 gap-2 mb-6 max-w-xs mx-auto">
		{#each board as cell, index}
			<button
				class={getCellClass(index)}
				onclick={() => makePlayerMove(index)}
				disabled={!isPlayerTurn || !!gameResult || isThinking}
			>
				{cell || ''}
			</button>
		{/each}
	</div>

	<!-- Controls -->
	<div class="flex justify-center">
		<Button variant="outline" size="medium" onclick={resetGame}>
			<RotateCcw class="w-4 h-4 mr-2" />
			New Game
		</Button>
	</div>
</div>