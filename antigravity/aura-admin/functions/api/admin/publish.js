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
      status: 450,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const { clientId, manifest } = await request.json();

    if (!clientId || !manifest) {
      return new Response(JSON.stringify({ error: "Missing clientId or manifest" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Guardar en Cloudflare KV si la base de datos de borde está configurada
    const kv = env.AURA_KV || env.AURA_STATE;
    if (kv) {
      await kv.put(`manifest:${clientId}`, JSON.stringify(manifest));
      console.log(`[KV Publish] Manifest for ${clientId} written to Cloudflare KV Edge.`);
    } else {
      console.warn("[KV Publish] AURA_KV namespace is not bound. Storing locally or bypassing.");
    }

    // Opcionalmente podemos sincronizar también con el backend central (Google Cloud Run/Vercel)
    if (env.GOOGLE_CLOUD_URL) {
      try {
        await fetch(`${env.GOOGLE_CLOUD_URL}/api/admin/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.AURA_SECRET_KEY}`
          },
          body: JSON.stringify({ clientId, manifest })
        });
      } catch (originErr) {
        console.error("[KV Publish] Failed to notify Origin server:", originErr.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Configuración de emisión publicada correctamente en el Edge (Cloudflare KV)." 
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Failed to publish config to Cloudflare Edge", 
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
