import { browser } from '$app/environment';

/**
 * Service Worker registration and management
 */
export class ServiceWorkerManager {
	private static instance: ServiceWorkerManager;
	private swRegistration: ServiceWorkerRegistration | null = null;
	private updateAvailable = false;

	static getInstance(): ServiceWorkerManager {
		if (!ServiceWorkerManager.instance) {
			ServiceWorkerManager.instance = new ServiceWorkerManager();
		}
		return ServiceWorkerManager.instance;
	}

	async register(): Promise<void> {
		if (!browser || !('serviceWorker' in navigator)) {
			console.log('Service Worker not supported');
			return;
		}

		try {
			this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
			console.log('Service Worker registered successfully');

			// Listen for updates
			this.swRegistration.addEventListener('updatefound', () => {
				const newWorker = this.swRegistration?.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							this.updateAvailable = true;
							this.notifyUpdateAvailable();
						}
					});
				}
			});

			// Listen for messages from service worker
			navigator.serviceWorker.addEventListener('message', (event) => {
				if (event.data?.type === 'CACHE_UPDATED') {
					console.log('Cache updated for:', event.data.url);
					// Could dispatch custom event here for UI updates
				}
			});

		} catch (error) {
			console.error('Service Worker registration failed:', error);
		}
	}

	async update(): Promise<void> {
		if (this.swRegistration && this.updateAvailable) {
			try {
				await this.swRegistration.update();
				window.location.reload();
			} catch (error) {
				console.error('Service Worker update failed:', error);
			}
		}
	}

	private notifyUpdateAvailable(): void {
		// Dispatch custom event for UI components to listen to
		if (browser) {
			window.dispatchEvent(new CustomEvent('sw-update-available'));
		}
	}
}

/**
 * Network status monitoring
 */
export class NetworkMonitor {
	private static instance: NetworkMonitor;
	private isOnline = true;
	private listeners: Array<(online: boolean) => void> = [];

	static getInstance(): NetworkMonitor {
		if (!NetworkMonitor.instance) {
			NetworkMonitor.instance = new NetworkMonitor();
		}
		return NetworkMonitor.instance;
	}

	constructor() {
		if (browser) {
			this.isOnline = navigator.onLine;
			this.setupEventListeners();
		}
	}

	private setupEventListeners(): void {
		window.addEventListener('online', () => {
			this.isOnline = true;
			this.notifyListeners();
			console.log('Application is now online');
		});

		window.addEventListener('offline', () => {
			this.isOnline = false;
			this.notifyListeners();
			console.log('Application is now offline');
		});
	}

	addListener(callback: (online: boolean) => void): void {
		this.listeners.push(callback);
	}

	removeListener(callback: (online: boolean) => void): void {
		this.listeners = this.listeners.filter(listener => listener !== callback);
	}

	private notifyListeners(): void {
		this.listeners.forEach(listener => listener(this.isOnline));
	}

	getStatus(): boolean {
		return this.isOnline;
	}
}

// Initialize service worker and network monitoring
export async function initializeOfflineSupport(): Promise<void> {
	if (!browser) return;

	const swManager = ServiceWorkerManager.getInstance();
	const networkMonitor = NetworkMonitor.getInstance();

	await swManager.register();
}