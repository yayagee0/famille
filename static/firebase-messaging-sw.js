// firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Firebase configuration - these should match your environment variables
// In production, these would be injected during build time
const firebaseConfig = {
	apiKey: self.VITE_FB_API_KEY || "your-api-key",
	authDomain: self.VITE_FB_AUTH_DOMAIN || "your-project.firebaseapp.com", 
	projectId: self.VITE_FB_PROJECT_ID || "your-project-id",
	storageBucket: self.VITE_FB_STORAGE_BUCKET || "your-project.firebasestorage.app",
	messagingSenderId: self.VITE_FB_MESSAGING_SENDER_ID || "123456789",
	appId: self.VITE_FB_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
	console.log('Background message received:', payload);
	
	const notificationTitle = payload.notification?.title || 'Family Hub';
	const notificationOptions = {
		body: payload.notification?.body || 'You have a new notification',
		icon: '/android-chrome-192x192.png',
		badge: '/android-chrome-192x192.png',
		tag: 'family-hub-notification',
		data: payload.data,
		requireInteraction: false, // Auto-dismiss after a few seconds
		actions: [
			{
				action: 'view',
				title: 'View',
				icon: '/android-chrome-192x192.png'
			},
			{
				action: 'dismiss',
				title: 'Dismiss'
			}
		]
	};

	self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	console.log('Notification clicked:', event);
	
	event.notification.close();
	
	if (event.action === 'dismiss') {
		return; // Just close the notification
	}
	
	// Navigate to the app or specific page
	const urlToOpen = event.notification.data?.link || '/dashboard';
	
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				// If a window is already open, focus it and navigate
				for (const client of clientList) {
					if (client.url.includes(self.location.origin) && 'focus' in client) {
						return client.focus().then(() => {
							// Navigate to the specific URL
							if (client.navigate && urlToOpen !== '/dashboard') {
								return client.navigate(self.location.origin + urlToOpen);
							}
						});
					}
				}
				
				// Otherwise, open a new window
				if (clients.openWindow) {
					return clients.openWindow(self.location.origin + urlToOpen);
				}
			})
	);
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
	console.log('Notification closed:', event);
	// Optional: Track notification dismissals for analytics
});