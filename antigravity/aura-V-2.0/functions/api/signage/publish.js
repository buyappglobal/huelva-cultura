export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const targetUrl = `${env.GOOGLE_CLOUD_URL}/api/signage/publish`;
    
    // Copy incoming headers, bypass Host
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    }
    // Set Authorization header for authentication
    headers.set("Authorization", `Bearer ${env.AURA_SECRET_KEY}`);

    const apiResponse = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: request.body
    });

    const responseText = await apiResponse.text();
    return new Response(responseText, {
      status: apiResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Signage publish proxy failed", 
      details: err.message 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
