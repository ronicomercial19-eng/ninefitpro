importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "gen-lang-client-0420325366",
  appId: "1:713818632352:web:4800bc6d58ed22591219c5",
  apiKey: "AIzaSyDW2oxpnWo-ZYuYXqxBrcwggEz-egvKazU",
  authDomain: "gen-lang-client-0420325366.firebaseapp.com",
  storageBucket: "gen-lang-client-0420325366.firebasestorage.app",
  messagingSenderId: "713818632352",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  if (!payload.notification) return;

  const notificationTitle = payload.notification.title || '9FIT';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', // Ensure this icon exists
    badge: '/icon-192.png',
    data: { url: payload.data?.url || '/' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});