// Frontend Push Notification Utility Service
// Path: src/services/notificationService.ts

const VAPID_PUBLIC_KEY = "BPTk7m4Bf4fLq2BskP91Z_9m7B-T2ZfF0zG8J7xJ6wL-t6-cR-uQZ8b-yY5yXn4m9n7p6o-R-wR9O5e8R4_8t_Y";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermissionAndSubscribe(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications are not supported in this browser");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log("Notification permission denied");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe the user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Send the subscription details to the backend D1 database
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save subscription on server");
    }

    console.log("Web Push subscription registered successfully");
    return true;
  } catch (err) {
    console.error("Error subscribing to Web Push:", err);
    return false;
  }
}
