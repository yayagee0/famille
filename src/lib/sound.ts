// Sound effects helper for playground widgets
import { writable } from 'svelte/store';

// Create a writable store for sound enabled state
const soundEnabledStore = writable(true);

// Initialize sound preference from localStorage (browser only)
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('famille-sound-enabled');
	const initialValue = stored !== null ? JSON.parse(stored) : true;
	soundEnabledStore.set(initialValue);
}

export function toggleSound() {
	soundEnabledStore.update((current) => {
		const newValue = !current;
		if (typeof window !== 'undefined') {
			localStorage.setItem('famille-sound-enabled', JSON.stringify(newValue));
		}
		return newValue;
	});
}

export function getSoundEnabled() {
	let value = true;
	soundEnabledStore.subscribe((val) => (value = val))();
	return value;
}

export const soundEnabled = soundEnabledStore;

export function playSound(src: string) {
	// Get current value from store
	let enabled = true;
	soundEnabledStore.subscribe((val) => (enabled = val))();

	if (!enabled) return;

	try {
		// Create simple beep sounds using Web Audio API for demo
		if (typeof window !== 'undefined' && window.AudioContext) {
			const audioContext = new AudioContext();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			// Different frequencies for different sound types
			const soundMap: Record<string, { frequency: number; duration: number }> = {
				'/sounds/click.mp3': { frequency: 800, duration: 0.1 },
				'/sounds/victory.mp3': { frequency: 523, duration: 0.5 },
				'/sounds/draw.mp3': { frequency: 440, duration: 0.3 },
				'/sounds/select.mp3': { frequency: 660, duration: 0.15 },
				'/sounds/chime.mp3': { frequency: 880, duration: 0.4 }
			};

			const soundConfig = soundMap[src] || { frequency: 440, duration: 0.2 };

			oscillator.frequency.value = soundConfig.frequency;
			oscillator.type = 'sine';

			gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(
				0.01,
				audioContext.currentTime + soundConfig.duration
			);

			oscillator.start(audioContext.currentTime);
			oscillator.stop(audioContext.currentTime + soundConfig.duration);
		}
	} catch (error) {
		// Silently fail if audio creation fails
		console.debug('Sound playback failed:', error);
	}
}
