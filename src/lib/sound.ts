// Sound effects helper for playground widgets
let soundEnabled = $state(true);

// Initialize sound preference from localStorage
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('famille-sound-enabled');
	soundEnabled = stored !== null ? JSON.parse(stored) : true;
}

export function toggleSound() {
	soundEnabled = !soundEnabled;
	if (typeof window !== 'undefined') {
		localStorage.setItem('famille-sound-enabled', JSON.stringify(soundEnabled));
	}
}

export function getSoundEnabled() {
	return soundEnabled;
}

export function playSound(src: string) {
	if (!soundEnabled) return;
	
	try {
		const audio = new Audio(src);
		audio.volume = 0.4;
		audio.play().catch(() => {
			// Silently fail if audio can't play (e.g., user hasn't interacted with page yet)
		});
	} catch (error) {
		// Silently fail if audio creation fails
	}
}