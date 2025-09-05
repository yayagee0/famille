// Particle effects for Neo theme

export interface Particle {
	id: string;
	emoji: string;
	x: number;
	y: number;
	speed: number;
	rotation: number;
	element?: HTMLElement;
}

export class ParticleSystem {
	private particles: Particle[] = [];
	private container: HTMLElement | null = null;
	private animationId: number | null = null;
	private isRunning = false;

	constructor(containerId = 'neo-particles-container') {
		this.createContainer(containerId);
	}

	private createContainer(id: string) {
		this.container = document.getElementById(id);
		if (!this.container) {
			this.container = document.createElement('div');
			this.container.id = id;
			this.container.className = 'neo-particles';
			document.body.appendChild(this.container);
		}
	}

	private createParticle(): Particle {
		const emojis = ['🌙', '⭐', '🕌', '✨', '💫'];
		const emoji = emojis[Math.floor(Math.random() * emojis.length)];

		return {
			id: `particle-${Date.now()}-${Math.random()}`,
			emoji,
			x: Math.random() * window.innerWidth,
			y: -50,
			speed: 1 + Math.random() * 2, // 1-3 speed
			rotation: 0
		};
	}

	private createParticleElement(particle: Particle): HTMLElement {
		const element = document.createElement('div');
		element.className = 'neo-particle';
		element.textContent = particle.emoji;
		element.style.left = `${particle.x}px`;
		element.style.top = `${particle.y}px`;
		element.style.animationDuration = `${8 + Math.random() * 4}s`; // 8-12s
		element.style.animationDelay = `${Math.random() * 2}s`; // 0-2s delay

		return element;
	}

	private updateParticle(particle: Particle) {
		if (!particle.element) return;

		particle.y += particle.speed;
		particle.rotation += 1;

		// Remove particle if it's off screen
		if (particle.y > window.innerHeight + 100) {
			this.removeParticle(particle);
			return false;
		}

		return true;
	}

	private removeParticle(particle: Particle) {
		if (particle.element && this.container) {
			this.container.removeChild(particle.element);
		}
		const index = this.particles.findIndex((p) => p.id === particle.id);
		if (index > -1) {
			this.particles.splice(index, 1);
		}
	}

	private animate = () => {
		if (!this.isRunning) return;

		// Add new particles occasionally
		if (Math.random() < 0.02 && this.particles.length < 20) {
			this.addParticle();
		}

		// Update existing particles
		this.particles = this.particles.filter((particle) => this.updateParticle(particle));

		this.animationId = requestAnimationFrame(this.animate);
	};

	private addParticle() {
		if (!this.container) return;

		const particle = this.createParticle();
		const element = this.createParticleElement(particle);

		particle.element = element;
		this.particles.push(particle);
		this.container.appendChild(element);
	}

	start() {
		if (this.isRunning) return;

		this.isRunning = true;
		this.animate();
	}

	stop() {
		this.isRunning = false;
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	clear() {
		this.stop();
		if (this.container) {
			this.container.innerHTML = '';
		}
		this.particles = [];
	}

	destroy() {
		this.clear();
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
			this.container = null;
		}
	}
}

// Singleton instance for global use
let globalParticleSystem: ParticleSystem | null = null;

export function getParticleSystem(): ParticleSystem {
	if (!globalParticleSystem) {
		globalParticleSystem = new ParticleSystem();
	}
	return globalParticleSystem;
}

export function startParticles() {
	const system = getParticleSystem();
	system.start();
}

export function stopParticles() {
	const system = getParticleSystem();
	system.stop();
}

export function clearParticles() {
	const system = getParticleSystem();
	system.clear();
}

// Achievement particle burst
export function triggerAchievementParticles(x: number, y: number) {
	if (!document.querySelector('.neo-particles')) return;

	const container = document.querySelector('.neo-particles') as HTMLElement;
	const emojis = ['🌙', '⭐', '🕌', '✨', '💫', '🎉'];

	for (let i = 0; i < 15; i++) {
		const element = document.createElement('div');
		element.className = 'neo-particle';
		element.textContent = emojis[Math.floor(Math.random() * emojis.length)];

		const offsetX = (Math.random() - 0.5) * 200;
		const offsetY = (Math.random() - 0.5) * 200;

		element.style.left = `${x + offsetX}px`;
		element.style.top = `${y + offsetY}px`;
		element.style.fontSize = `${16 + Math.random() * 8}px`;
		element.style.animation = `particleFall ${2 + Math.random() * 2}s ease-out forwards`;

		container.appendChild(element);

		// Remove after animation
		setTimeout(() => {
			if (element.parentNode) {
				element.parentNode.removeChild(element);
			}
		}, 4000);
	}
}
