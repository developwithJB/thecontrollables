import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY_STORAGE = "vapid_public_key";

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

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

async function getVapidPublicKey(): Promise<string> {
  const cached = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
  if (cached) return cached;

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

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const vapidPublicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });

    const subscriptionJSON = subscription.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Use raw query to avoid type issues with new table
    const { error } = await supabase.rpc("exec_sql" as never, {} as never).then(() => ({ error: null })).catch(() => ({ error: null }));
    
    // Direct upsert via REST
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = (await supabase.auth.getSession()).data.session;
    
    const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${session?.access_token}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint,
        p256dh_key: subscriptionJSON.keys?.p256dh,
        auth_key: subscriptionJSON.keys?.auth,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to save subscription: ${errBody}`);
    }

    return true;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const session = (await supabase.auth.getSession()).data.session;
        
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`,
          {
            method: "DELETE",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${session?.access_token}`,
            },
          }
        );
      }
    }

    return true;
  } catch (err) {
    console.error("[Push] Unsubscribe failed:", err);
    return false;
  }
}
