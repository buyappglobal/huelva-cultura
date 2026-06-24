/**
 * Aura Sentinel Client for Error Reporting
 */

const SENTINEL_URL = "https://aura-sentinel.holasolonet.workers.dev/api/events";
const SENTINEL_TOKEN = "crm-token-456";

interface ErrorPayload {
  service: string;
  environment: string;
  error: {
    message: string;
    stack?: string;
    name?: string;
  };
  context?: Record<string, any>;
  timestamp: number;
}

export async function reportErrorToSentinel(error: Error | any, extraContext: Record<string, any> = {}) {
  try {
    const payload: ErrorPayload = {
      service: "aura-erp-frontend",
      environment: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "development" : "production",
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name || "Error",
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        userToken: localStorage.getItem("aura_erp_token") ? "logged_in" : "anonymous",
        ...extraContext
      },
      timestamp: Date.now(),
    };

    await fetch(SENTINEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SENTINEL_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to send error report to Aura Sentinel:", err);
  }
}

/**
 * Initializes global event listeners to capture unhandled errors and rejections
 */
export function initSentinel() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportErrorToSentinel(event.error || { message: event.message }, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportErrorToSentinel(event.reason || "Unhandled Promise Rejection");
  });

  console.log("🔒 Aura Sentinel initialized for ERP Frontend.");
}
