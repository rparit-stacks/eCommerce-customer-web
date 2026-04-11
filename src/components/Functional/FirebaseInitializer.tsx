import { useEffect, useState } from "react";
import { FirebaseInstance, initializeFirebase } from "@/lib/firebase";
import { setFirebaseInstance } from "@/lib/analytics";
import { RecaptchaVerifier } from "firebase/auth";
import {
  firebaseConfigType,
  NotificationSettings,
  Settings,
} from "@/types/ApiResponse";
import { addToast, Avatar, closeToast } from "@heroui/react";
import { getFirebaseConfig, getSpecificSettings } from "@/helpers/getters";
import { safeImageSrc } from "@/lib/safeImageSrc";
import { getMessaging, getToken } from "firebase/messaging";
import { Bell } from "lucide-react";

interface FirebaseInitializerProps {
  settings: Settings;
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    firebaseInstance?: FirebaseInstance;
  }
}

const getNotificationUrl = (data: { type?: string; order_slug?: string }) => {
  if (data?.type == "order" || data?.type == "delivery") {
    return `/my-account/orders/${data?.order_slug}`;
  }
  return "/";
};

const playNotificationSound = () => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("Sound blocked by browser:", e));
  } catch (error) {
    console.error("Audio play failed:", error);
  }
};

const showNotification = (payload: {
  notification: { title: string; body: string; image: string; icon: string };
  data: Record<string, any>;
}) => {
  if (payload.notification) {
    playNotificationSound();
    const { title, body, image } = payload.notification;
    const url = getNotificationUrl(payload.data);

    // generate unique ID if you still want one for CSS purpose
    const toastClass = `toast-clickable-${Date.now()}`;

    // Create the toast and capture its key
    const toastKey = addToast({
      title: title || "New Notification",
      description: body || "You have a new message",
      color: "default",
      timeout: 10000,
      classNames: { wrapper: toastClass },
      icon:
        image && String(image).trim().length > 0 ? (
          <Avatar size="md" src={safeImageSrc(image)} />
        ) : (
          <Bell className="w-6 h-6" />
        ),
    });

    // Attach click listener after slight delay to ensure DOM mounting
    setTimeout(() => {
      const toastEl = document.querySelector(
        `.${toastClass}`,
      ) as HTMLElement | null;
      if (toastEl && url) {
        toastEl.style.cursor = "pointer";
        toastEl.addEventListener("click", () => {
          // open the url
          window.open(url, "_blank", "noopener,noreferrer");
          // close the toast
          if (toastKey) closeToast(toastKey);
        });
      }
    }, 100);
  }
};

const initializeMessaging = async (
  firebaseInstance: FirebaseInstance,
  vapIdKey: string,
  firebaseConfig: firebaseConfigType,
) => {
  try {
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const readyReg = await navigator.serviceWorker.ready;
    readyReg.active?.postMessage({
      type: "INIT_FIREBASE",
      config: firebaseConfig,
    });

    const messaging = getMessaging(firebaseInstance.app);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: vapIdKey });
      if (token) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[FCM] Token obtained (dev log suppressed length)");
        }
        try {
          localStorage.setItem("fcm-token", token);
        } catch {
          /* storage blocked */
        }
      }
    }
  } catch (error) {
    const err = error as Error;
    const benign =
      err?.name === "AbortError" ||
      /push service|registration failed|not supported/i.test(err?.message || "");
    if (process.env.NODE_ENV === "development" && benign) {
      console.debug(
        "[FCM] Web push not available in this environment (normal on some localhost/browser setups).",
      );
      return;
    }
    console.error("Failed to initialize messaging:", error);
  }
};

export default function FirebaseInitializer({
  settings,
}: FirebaseInitializerProps) {
  const [firebase, setFirebase] = useState<FirebaseInstance | null>(null);

  useEffect(() => {
    try {
      const firebaseConfig = getFirebaseConfig(settings);
      const notificationSettings = getSpecificSettings(
        settings,
        "notification",
      ) as NotificationSettings | undefined;

      const { vapIdKey = "" } = notificationSettings || {};

      if (firebaseConfig && !firebase) {
        const firebaseInstance = initializeFirebase(firebaseConfig);

        if (!firebaseInstance) {
          const errorMsg = "Failed to initialize Firebase instance";
          console.error(errorMsg);
          addToast({
            title: "Firebase Error",
            description: errorMsg,
            color: "danger",
          });
          return;
        }

        // 👇 defer setState to next microtask to avoid cascading render
        queueMicrotask(() => {
          setFirebase(firebaseInstance);
          window.firebaseInstance = firebaseInstance;
          // Set Firebase instance for analytics
          setFirebaseInstance(firebaseInstance);
        });

        if (typeof window !== "undefined") {
          try {
            const auth = firebaseInstance.auth;
            auth.settings.appVerificationDisabledForTesting = false;

            console.log("Firebase initialized successfully");

            if (
              vapIdKey &&
              "serviceWorker" in navigator &&
              "Notification" in window
            ) {
              initializeMessaging(firebaseInstance, vapIdKey, firebaseConfig);
            }
          } catch (authError) {
            const errorMsg = `Failed to configure Firebase Auth: ${
              authError instanceof Error ? authError.message : "Unknown error"
            }`;
            console.error(errorMsg);
            addToast({
              title: "Firebase Auth Error",
              description: errorMsg,
              color: "danger",
            });
          }
        }
      }
    } catch (error) {
      const errorMsg = `Error processing Firebase initialization: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.error(errorMsg);
      addToast({
        title: "Firebase Initialization Error",
        description: errorMsg,
        color: "danger",
      });
    }
  }, [settings, firebase]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "PUSH_EVENT") {
          showNotification(event.data.payload);
        }
      });
    }
  }, []);

  return null;
}
