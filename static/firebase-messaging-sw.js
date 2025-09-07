// firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Firebase configuration (should match your main config)
const firebaseConfig = {
	apiKey: "AIzaSyBcb2nYcdZmOGo-W5t5OqtqPZx5-yJhHDo",
	authDomain: "familie-3daf6.firebaseapp.com", 
	projectId: "familie-3daf6",
	storageBucket: "famille-3daf6.firebasestorage.app",
	messagingSenderId: "123456789",
	appId: "1:123456789:web:abcdef123456"
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
		data: payload.data
	};

	self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	console.log('Notification clicked:', event);
	
	event.notification.close();
	
	// Navigate to the app or specific page
	const urlToOpen = event.notification.data?.link || '/dashboard';
	
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				// If a window is already open, focus it and navigate
				for (const client of clientList) {
					if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
						return client.focus();
					}
				}
				
				// Otherwise, open a new window
				if (clients.openWindow) {
					return clients.openWindow(urlToOpen);
				}
			})
	);
});