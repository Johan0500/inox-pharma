import api from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  // ✅ Fix: cast explicite pour éviter l'erreur Uint8Array<ArrayBufferLike>
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushNotifications(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push non supporté sur cet appareil");
      return false;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Service Worker enregistré");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permission refusée");
      return false;
    }

    const { data } = await api.get("/notifications/vapid-key");
    // ✅ Fix: cast en ArrayBuffer pour satisfaire le type applicationServerKey
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey).buffer as ArrayBuffer;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const subJson = subscription.toJSON();

    await api.post("/notifications/subscribe", {
      endpoint: subJson.endpoint,
      p256dh:   subJson.keys?.p256dh,
      auth:     subJson.keys?.auth,
    });

    console.log("✅ Notifications push activées");
    return true;
  } catch (err) {
    console.error("Erreur activation push:", err);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete("/notifications/unsubscribe", {
        data: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
      console.log("✅ Notifications push désactivées");
    }
  } catch (err) {
    console.error("Erreur désactivation push:", err);
  }
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}