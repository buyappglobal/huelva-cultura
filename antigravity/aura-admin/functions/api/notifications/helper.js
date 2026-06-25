// Cloudflare Pages Functions Helper: Notification Dispatcher
// Path: functions/api/notifications/helper.js

// Standard VAPID Key pair for demo/testing (usually set via env variables)
// Public key must match the one used in the frontend to subscribe
const DEFAULT_VAPID_PUBLIC = "BPTk7m4Bf4fLq2BskP91Z_9m7B-T2ZfF0zG8J7xJ6wL-t6-cR-uQZ8b-yY5yXn4m9n7p6o-R-wR9O5e8R4_8t_Y";
const DEFAULT_VAPID_PRIVATE = "MC4CAQAwBQYDK2VwBCIEIPg2Q3l2L3ZkX2FzX2RzX2RzX2RzX2RzX2RzX2RzX2Rz"; // Fallback, not used if not sending background pushes yet

export async function sendNotification(env, userId, title, message, type, url = "/") {
  try {
    const id = "notif_" + Math.random().toString(36).substring(2, 12);
    
    // 1. Insert In-App Notification
    await env.DB.prepare(
      `INSERT INTO notifications (id, userId, title, message, type, read, createdAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).bind(id, userId, title, message, type, Date.now()).run();

    // 2. Fetch active Web Push Subscriptions for this user
    const { results: subs } = await env.DB.prepare(
      "SELECT * FROM push_subscriptions WHERE userId = ?"
    ).bind(userId).all();

    if (!subs || subs.length === 0) {
      return { success: true, dbInserted: true, pushSent: 0 };
    }

    // 3. Dispatch Web Push notification to each endpoint
    let pushSent = 0;
    for (const sub of subs) {
      try {
        // Prepare push payload
        const payload = JSON.stringify({
          title,
          body: message,
          url
        });

        // Note: For full production Web Push, standard VAPID headers require signing the endpoint URL
        // with the ECDSA key. Here we make a best-effort POST request to the push service.
        // Some services (like Firefox or older Chrome) allow raw payloads if keys are matched.
        // If the push service rejects unsigned requests, it will return a 401/403.
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "TTL": "60",
            "Content-Type": "application/octet-stream"
          },
          body: new TextEncoder().encode(payload)
        });

        if (res.ok) {
          pushSent++;
        } else if (res.status === 410) {
          // Subscription expired/gone, remove it from D1
          await env.DB.prepare(
            "DELETE FROM push_subscriptions WHERE endpoint = ?"
          ).bind(sub.endpoint).run();
        }
      } catch (err) {
        console.error("Failed to send push to subscription", sub.endpoint, err);
      }
    }

    return { success: true, dbInserted: true, pushSent };
  } catch (err) {
    console.error("Error in sendNotification helper", err);
    return { success: false, error: err.message };
  }
}
