/**
 * Reports backend errors in Cloudflare Pages functions to the central Aura Sentinel microservice.
 */
export async function reportBackendError(err, context, extraContext = {}) {
  try {
    const { request, env } = context;
    const cleanUrl = request?.url || "unknown";

    const payload = {
      service: "aura-backend-v2",
      environment: cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1") ? "development" : "production",
      error: {
        message: err?.message || String(err),
        stack: err?.stack || "",
        name: err?.name || "BackendError"
      },
      context: {
        url: cleanUrl,
        method: request?.method || "GET",
        headers: request?.headers ? Object.fromEntries(request.headers.entries()) : {},
        ...extraContext
      },
      timestamp: Date.now()
    };

    // Fire-and-forget report to Sentinel using fetch
    await fetch("https://aura-sentinel.holasolonet.workers.dev/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer crm-token-456"
      },
      body: JSON.stringify(payload)
    });
  } catch (sentinelErr) {
    console.error("Critical: Aura Sentinel reporting failed:", sentinelErr);
  }
}
