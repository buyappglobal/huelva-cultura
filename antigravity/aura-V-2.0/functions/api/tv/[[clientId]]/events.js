// Cloudflare Pages Function: SSE Event Stream simulated at the Edge
// Path: functions/api/tv/[[clientId]]/events.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathParts = url.pathname.split('/');
  // URL: /api/tv/:clientId/events
  const clientId = pathParts[pathParts.length - 2];

  let resolvedClientId = clientId;
  if (resolvedClientId !== 'global' && env.DB) {
    try {
      let resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(resolvedClientId).first();
      if (!resolvedUser) {
        resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(resolvedClientId).first();
      }
      if (!resolvedUser) {
        const variations = [
          resolvedClientId.replace(/l/g, 'I'),
          resolvedClientId.replace(/I/g, 'l'),
          resolvedClientId.toLowerCase(),
          resolvedClientId.toUpperCase()
        ];
        for (const variant of variations) {
          if (variant === resolvedClientId) continue;
          resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUser) break;
          resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUser) break;
        }
      }
      if (resolvedUser) {
        resolvedClientId = resolvedUser.id;
      }
    } catch (e) {
      console.error("Slug resolution error in events:", e);
    }
  }

  const kv = env.AURA_KV || env.AURA_STATE;
  if (!kv) {
    return new Response(`event: error\ndata: {"error": "KV storage not bound"}\n\n`, {
      headers: corsHeaders
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let isClosed = false;
  let lastTimestamp = "";

  const updateOnlineStatus = async () => {
    if (isClosed) return;
    try {
      await kv.put(`online:${resolvedClientId}`, Date.now().toString(), { expirationTtl: 60 });
    } catch (e) {
      console.error("Failed to update online status in KV:", e);
    }
  };

  // Start checking for updates in KV
  const checkUpdates = async () => {
    if (isClosed) return;
    try {
      // Check for config updates
      const current = await kv.get(`update:${resolvedClientId}`);
      if (current && current !== lastTimestamp) {
        lastTimestamp = current;
        
        // Fetch fresh display configs
        let displayData = await env.DB.prepare("SELECT * FROM displays WHERE id = ?").bind(resolvedClientId).first();
        let user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(resolvedClientId).first();
        if (!user) {
          user = await env.DB.prepare("SELECT * FROM users WHERE slug = ?").bind(resolvedClientId).first();
          if (user) {
            displayData = await env.DB.prepare("SELECT * FROM displays WHERE id = ?").bind(user.id).first();
          }
        }

        if (displayData) {
          const targetUserId = user ? user.id : displayData.id;
          const { results: contents } = await env.DB.prepare("SELECT * FROM contents WHERE userId = ? ORDER BY createdAt DESC").bind(targetUserId).all();
          const { results: quotes } = await env.DB.prepare("SELECT * FROM quotes WHERE userId = ? ORDER BY createdAt DESC").bind(targetUserId).all();

          // Fetch and filter targeted external ads from KV
          let externalAds = [];
          if (kv) {
            try {
              const rawAds = await kv.get("external_ads");
              if (rawAds) {
                const allAds = JSON.parse(rawAds);
                externalAds = allAds.filter(ad => {
                  if (ad.targetType === 'all') return true;
                  if (ad.targetType === 'users' && user) {
                    return ad.targetUsers.includes(user.id) || ad.targetUsers.includes(user.email);
                  }
                  if (ad.targetType === 'cities' && user && user.city) {
                    return ad.targetCities.some(c => c.toLowerCase() === user.city.toLowerCase());
                  }
                  if (ad.targetType === 'sectors' && user && user.role) {
                    return ad.targetSectors.includes(user.role);
                  }
                  return false;
                });
              }
            } catch (kvErr) {
              console.error("SSE KV external ads fetch error:", kvErr);
            }
          }

          const parsed = {
            ...displayData,
            isZenMode: !!displayData.isZenMode,
            isNoDistractionsMode: !!displayData.isNoDistractionsMode,
            isRemoteControl: !!displayData.isRemoteControl,
            contents: contents.map(c => ({
              ...c,
              schedule: c.schedule ? JSON.parse(c.schedule) : undefined
            })),
            quotes: quotes.map(q => ({
              ...q,
              showClock: !!q.showClock,
              schedule: q.schedule ? JSON.parse(q.schedule) : undefined
            })),
            externalAds: externalAds
          };
          
          await writer.write(encoder.encode(`event: config_sync\ndata: ${JSON.stringify(parsed)}\n\n`));
          
          // If skip trigger occurred
          if (current.includes("skip")) {
            await writer.write(encoder.encode(`event: force_skip\ndata: {"reason":"remote_skip"}\n\n`));
          }
        }
      }
    } catch (e) {
      console.error("SSE Poll error:", e);
    }
  };

  // Keep alive ping
  const pingInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`event: ping\ndata: {}\n\n`));
      await updateOnlineStatus();
    } catch (e) {
      cleanup();
    }
  }, 20000);

  const pollInterval = setInterval(checkUpdates, 2000);

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(pingInterval);
    clearInterval(pollInterval);
    try {
      writer.close();
    } catch (e) {}
  };

  request.signal.addEventListener("abort", cleanup);

  // Initial push
  checkUpdates();
  context.waitUntil(updateOnlineStatus());

  return new Response(readable, {
    headers: corsHeaders
  });
}
