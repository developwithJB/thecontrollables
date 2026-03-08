import { supabase } from "@/integrations/supabase/client";

// VAPID public key - loaded from edge function, cached locally
const VAPID_PUBLIC_KEY_STORAGE = "vapid_public_key";

/**
 * Check if the browser supports Web Push
 */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get the current push subscription state
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Fetch the VAPID public key from the edge function
 */
async function getVapidPublicKey(): Promise<string> {
  // Check local cache first
  const cached = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
  if (cached) return cached;

  // Fetch from edge function
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/send-push-nudge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_vapid_key" }),
    }
  );

  if (!response.ok) throw new Error("Failed to fetch VAPID key");
  const { vapidPublicKey } = await response.json();
  localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, vapidPublicKey);
  return vapidPublicKey;
}

/**
 * Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe the user to push notifications
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const vapidPublicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const subscriptionJSON = subscription.toJSON();

    // Save to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint!,
        p256dh_key: subscriptionJSON.keys!.p256dh!,
        auth_key: subscriptionJSON.keys!.auth!,
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Remove from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }
    }

    return true;
  } catch (err) {
    console.error("[Push] Unsubscribe failed:", err);
    return false;
  }
}
