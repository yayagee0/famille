<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { createPost, getFamilyId } from '$lib/firebase';
	import { auth } from '$lib/firebase';

	type CellValue = 'X' | 'O' | null;
	type GameMode = 'human' | 'easy' | 'hard';
	type GameState = 'playing' | 'won' | 'tie';

	// Game state
	let board = $state<CellValue[]>(Array(9).fill(null));
	let currentPlayer = $state<'X' | 'O'>('X');
	let gameState = $state<GameState>('playing');
	let winner = $state<'X' | 'O' | null>(null);
	let gameMode = $state<GameMode>('human');
	let isThinking = $state(false);

	// Check for winner
	function checkWinner(board: CellValue[]): 'X' | 'O' | null {
		const winPatterns = [
			[0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
			[0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
			[0, 4, 8], [2, 4, 6] // diagonals
		];

		for (const [a, b, c] of winPatterns) {
			if (board[a] && board[a] === board[b] && board[a] === board[c]) {
				return board[a];
			}
		}
		return null;
	}

	// Check if board is full
	function isBoardFull(board: CellValue[]): boolean {
		return board.every(cell => cell !== null);
	}

	// Get available moves
	function getAvailableMoves(board: CellValue[]): number[] {
		return board.map((cell, index) => cell === null ? index : null)
			.filter(index => index !== null) as number[];
	}

	// Minimax algorithm for hard AI
	function minimax(board: CellValue[], depth: number, isMaximizing: boolean, alpha = -Infinity, beta = Infinity): number {
		const winner = checkWinner(board);
		
		if (winner === 'O') return 10 - depth; // AI wins
		if (winner === 'X') return depth - 10; // Human wins
		if (isBoardFull(board)) return 0; // Tie

		if (isMaximizing) {
			let maxEval = -Infinity;
			for (const move of getAvailableMoves(board)) {
				board[move] = 'O';
				const eval_ = minimax(board, depth + 1, false, alpha, beta);
				board[move] = null;
				maxEval = Math.max(maxEval, eval_);
				alpha = Math.max(alpha, eval_);
				if (beta <= alpha) break; // Alpha-beta pruning
			}
			return maxEval;
		} else {
			let minEval = Infinity;
			for (const move of getAvailableMoves(board)) {
				board[move] = 'X';
				const eval_ = minimax(board, depth + 1, true, alpha, beta);
				board[move] = null;
				minEval = Math.min(minEval, eval_);
				beta = Math.min(beta, eval_);
				if (beta <= alpha) break; // Alpha-beta pruning
			}
			return minEval;
		}
	}

	// Get best move for hard AI
	function getBestMove(board: CellValue[]): number {
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

	// Get random move for easy AI
	function getRandomMove(board: CellValue[]): number {
		const availableMoves = getAvailableMoves(board);
		return availableMoves[Math.floor(Math.random() * availableMoves.length)];
	}

	// Make AI move
	async function makeAIMove() {
		if (gameMode === 'human' || currentPlayer === 'X' || gameState !== 'playing') return;

		isThinking = true;
		
		// Add delay for better UX
		await new Promise(resolve => setTimeout(resolve, 500));

		const move = gameMode === 'hard' ? getBestMove(board) : getRandomMove(board);
		makeMove(move);
		
		isThinking = false;
	}

	// Make a move
	function makeMove(index: number) {
		if (board[index] !== null || gameState !== 'playing') return;

		// Update board
		board[index] = currentPlayer;

		// Check for winner
		const gameWinner = checkWinner(board);
		if (gameWinner) {
			gameState = 'won';
			winner = gameWinner;
			saveGameResult();
			return;
		}

		// Check for tie
		if (isBoardFull(board)) {
			gameState = 'tie';
			saveGameResult();
			return;
		}

		// Switch player
		currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

		// Trigger AI move if needed
		if (gameMode !== 'human' && currentPlayer === 'O') {
			makeAIMove();
		}
	}

	// Save game result to Firestore
	async function saveGameResult() {
		try {
			if (!auth.currentUser) return;

			const gameData = {
				type: 'tic-tac-toe-game' as const,
				familyId: getFamilyId(),
				authorUid: auth.currentUser.uid,
				board: board,
				winner: winner,
				gameMode: gameMode,
				moves: board.map((cell, index) => ({ index, player: cell })).filter(move => move.player !== null),
				result: gameState === 'won' ? winner : 'tie',
				timestamp: new Date(),
				createdAt: new Date()
			};

			await createPost(gameData);
		} catch (error) {
			console.error('Failed to save game result:', error);
		}
	}

	// Reset game
	function resetGame() {
		board = Array(9).fill(null);
		currentPlayer = 'X';
		gameState = 'playing';
		winner = null;
		isThinking = false;
	}

	// Handle cell click
	function handleCellClick(index: number) {
		if (gameMode !== 'human' && currentPlayer === 'O') return; // AI's turn
		makeMove(index);
	}

	// Set game mode
	function setGameMode(mode: GameMode) {
		gameMode = mode;
		resetGame();
	}
</script>

<div class="rounded-2xl bg-white p-6 shadow-sm">
	<div class="mb-6 text-center">
		<h2 class="text-2xl font-bold text-gray-900">🎯 Tic-Tac-Toe</h2>
		<p class="mt-1 text-sm text-gray-500">Challenge the AI or play with family</p>
	</div>

	<!-- Game Mode Selection -->
	<div class="mb-6 flex justify-center space-x-2">
		<Button
			variant={gameMode === 'human' ? 'primary' : 'outline'}
			size="sm"
			onclick={() => setGameMode('human')}
		>
			👥 Human vs Human
		</Button>
		<Button
			variant={gameMode === 'easy' ? 'primary' : 'outline'}
			size="sm"
			onclick={() => setGameMode('easy')}
		>
			🤖 Easy AI
		</Button>
		<Button
			variant={gameMode === 'hard' ? 'primary' : 'outline'}
			size="sm"
			onclick={() => setGameMode('hard')}
		>
			🧠 Hard AI
		</Button>
	</div>

	<!-- Game Status -->
	<div class="mb-4 text-center">
		{#if gameState === 'playing'}
			{#if isThinking}
				<p class="text-lg text-gray-600">🤔 AI is thinking...</p>
			{:else}
				<p class="text-lg text-gray-600">
					{gameMode === 'human' ? `Player ${currentPlayer}'s turn` : currentPlayer === 'X' ? "Your turn" : "AI's turn"}
				</p>
			{/if}
		{:else if gameState === 'won'}
			<p class="text-lg font-semibold text-green-600">
				🎉 {gameMode === 'human' ? `Player ${winner} wins!` : winner === 'X' ? 'You win!' : 'AI wins!'}
			</p>
		{:else if gameState === 'tie'}
			<p class="text-lg font-semibold text-yellow-600">🤝 It's a tie!</p>
		{/if}
	</div>

	<!-- Game Board -->
	<div class="mx-auto mb-6 grid w-64 grid-cols-3 gap-2">
		{#each board as cell, index}
			<button
				class="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 text-2xl font-bold transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 {cell === 'X' ? 'text-blue-600' : 'text-red-600'}"
				onclick={() => handleCellClick(index)}
				disabled={cell !== null || gameState !== 'playing' || isThinking || (gameMode !== 'human' && currentPlayer === 'O')}
			>
				{cell || ''}
			</button>
		{/each}
	</div>

	<!-- Reset Button -->
	<div class="text-center">
		<Button variant="outline" onclick={resetGame}>
			🔄 New Game
		</Button>
	</div>
</div>