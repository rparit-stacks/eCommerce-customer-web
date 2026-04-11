importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
);

let messaging = null;

// Initialize Firebase dynamically when config is received
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "INIT_FIREBASE" && !messaging) {
    try {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();
      console.log("Service Worker: Firebase initialized successfully");
    } catch (error) {
      console.error("Firebase initialization failed:", error);
    }
  }
});

// Handle push events
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.error("No data in push event");
    return;
  }

  const payload = event.data.json();
  const { title, body, icon, image } = payload.notification || {};
  const notificationOptions = {
    body: body || "You have a new message",
    icon: icon || "/favicon.ico",
    image: image || "",
    data: payload.data || {},
    sound: "/sounds/notification.mp3",
  };
  event.waitUntil(
    self.registration.showNotification(
      title || "New Notification",
      notificationOptions,
    ),
  );

  // Send data to React frontend
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        client.postMessage({
          type: "PUSH_EVENT",
          payload,
        });
      }
    })(),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = getNotificationUrl(event?.notification?.data) || "/";
  event.waitUntil(
    clients
      .openWindow(url)
      .catch((err) => console.error("Failed to open window:", err)),
  );
});

function getNotificationUrl(data) {
  if (data?.type == "order" || data?.type == "delivery") {
    return `/my-account/orders/${data?.order_slug}`;
  }
  return "/";
}
