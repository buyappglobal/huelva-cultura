// Cloudflare Pages Function: Display CRUD
// Path: functions/api/displays/[[id]].js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathParts = url.pathname.split('/');
  const id = context.params?.id ? (Array.isArray(context.params.id) ? context.params.id[0] : context.params.id) : pathParts[3];
  const isPurgeAction = url.searchParams.get("purge") === "true";

  const callerId = url.searchParams.get("callerId");
  const callerRole = url.searchParams.get("callerRole");

  if (!id || id === "displays" || id === "undefined" || id === "null") {
    if (request.method === "GET") {
      try {
        let query = "SELECT * FROM displays";
        let stmt;
        
        if (callerRole === "admin" && callerId) {
          query = "SELECT d.* FROM displays d JOIN users u ON d.id = u.id WHERE u.partnerId = ?";
          stmt = env.DB.prepare(query).bind(callerId);
        } else {
          stmt = env.DB.prepare(query);
        }
        
        const { results } = await stmt.all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to list displays", details: err.message }), { status: 500, headers: corsHeaders });
      }
    }
    return new Response(JSON.stringify({ error: "Missing or invalid display id" }), { status: 400, headers: corsHeaders });
  }

  // Robust User and ID Resolution (Typo and slug resilient)
  let resolvedId = id;
  let user = null;
  try {
    user = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(id).first();
    if (!user) {
      user = await env.DB.prepare("SELECT * FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(id).first();
    }
    if (!user) {
      const variations = [
        id.replace(/l/g, 'I'),
        id.replace(/I/g, 'l'),
        id.toLowerCase(),
        id.toUpperCase()
      ];
      for (const variant of variations) {
        if (variant === id) continue;
        user = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
        if (user) break;
        user = await env.DB.prepare("SELECT * FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
        if (user) break;
      }
    }
    if (user) {
      resolvedId = user.id;
    }
  } catch (e) {
    console.error("Error in user resolution:", e);
  }

  // Restrict partner access to non-assigned client's display
  if (callerRole === "admin" && callerId && user && user.partnerId !== callerId && user.id !== callerId) {
    return new Response(JSON.stringify({ error: "Access denied. Client display not assigned to you." }), { status: 403, headers: corsHeaders });
  }

  // Handle manual purge action to clear KV cache
  if (isPurgeAction) {
    const kv = env.AURA_KV || env.AURA_STATE;
    if (kv) {
      await kv.delete(`manifest:${resolvedId}`).catch(() => {});
      // Signal display refresh using update key
      await kv.put(`update:${resolvedId}`, Date.now().toString() + "_refresh");
    }
    return new Response(JSON.stringify({ success: true, message: "Caché del manifest vaciada con éxito" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // --- GET METHOD ---
  if (request.method === "GET") {
    try {
      let display = await env.DB.prepare("SELECT * FROM displays WHERE id = ?").bind(resolvedId).first();

      if (!display) {
        if (id === "global" || user) {
          const targetId = user ? user.id : "global";
          const email = user ? user.email : "global";
          const city = user ? user.city : "Madrid, ES";
          
          await env.DB.prepare(
            `INSERT OR IGNORE INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode, visualStyle, textSize)
             VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high', 'standard', 1.0)`
          ).bind(
            targetId,
            email.split("@")[0].toUpperCase(),
            email.split("@")[0].toUpperCase() + " Display",
            city || "Madrid, ES"
          ).run();
 
          display = await env.DB.prepare("SELECT * FROM displays WHERE id = ?").bind(targetId).first();
        }
      }
 
      if (!display) {
        return new Response(JSON.stringify({ error: "Display not found" }), { status: 404, headers: corsHeaders });
      }
 
      const targetUserId = user ? user.id : display.id;
      
      const { results: contents } = await env.DB.prepare("SELECT * FROM contents WHERE userId = ? ORDER BY createdAt DESC").bind(targetUserId).all();
      const { results: quotes } = await env.DB.prepare("SELECT * FROM quotes WHERE userId = ? ORDER BY createdAt DESC").bind(targetUserId).all();
 
      const parsedContents = contents.map(c => ({
        ...c,
        schedule: c.schedule ? JSON.parse(c.schedule) : undefined
      }));
 
      const parsedQuotes = quotes.map(q => ({
        ...q,
        showClock: !!q.showClock,
        schedule: q.schedule ? JSON.parse(q.schedule) : undefined
      }));
 
      // Fetch and filter targeted external ads from KV
      const kv = env.AURA_KV || env.AURA_STATE;
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
          console.error("KV external ads fetch error:", kvErr);
        }
      }
 
      const parsedDisplay = {
        ...display,
        isZenMode: !!display.isZenMode,
        isNoDistractionsMode: !!display.isNoDistractionsMode,
        isRemoteControl: !!display.isRemoteControl,
        contents: parsedContents,
        quotes: parsedQuotes,
        visualStyle: display.visualStyle || 'standard',
        vjConfig: display.vjConfig || null,
        textSize: display.textSize !== null && display.textSize !== undefined ? display.textSize : 1.0,
      };
 
      return new Response(JSON.stringify({
        success: true,
        display: parsedDisplay,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          hasAdsPanel: !!user.hasAdsPanel,
          hasImpulses: !!user.hasImpulses,
          slug: user.slug,
          city: user.city,
          whatsapp: user.whatsapp,
          isDemoAccount: !!user.isDemoAccount,
          status: user.status,
          trialEndsAt: user.trialEndsAt
        } : null,
        externalAds: externalAds
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to load display", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }
 
  // --- POST METHOD (Update Config) ---
  if (request.method === "POST") {
    try {
      const config = await request.json();
      const current = await env.DB.prepare("SELECT * FROM displays WHERE id = ?").bind(resolvedId).first();
      
      if (!current) {
        const city = user ? user.city : "Madrid, ES";
        await env.DB.prepare(
          `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode, signageUrl, signageType, signageExpiresAt, compiledManifest, visualStyle, vjConfig, textSize, promoFlashText, promoFlashExpiresAt, reactivityMode, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          resolvedId,
          config.establishmentName || email.split("@")[0].toUpperCase(),
          config.adminTitle || (email.split("@")[0].toUpperCase() + " Display"),
          config.location || city || "Madrid, ES",
          config.theme || "classic",
          config.volume !== undefined ? config.volume : 0.7,
          config.isZenMode ? 1 : 0,
          config.isNoDistractionsMode ? 1 : 0,
          config.isRemoteControl ? 1 : 0,
          config.performanceMode || "high",
          config.signageUrl || null,
          config.signageType || null,
          config.signageExpiresAt || null,
          typeof config.compiledManifest === "object" ? JSON.stringify(config.compiledManifest) : (config.compiledManifest || null),
          config.visualStyle || 'standard',
          config.vjConfig || null,
          config.textSize !== undefined ? config.textSize : 1.0,
          config.promoFlashText || null,
          config.promoFlashExpiresAt || null,
          config.reactivityMode || 'live',
          Date.now()
        ).run();
      } else {
        const merged = { ...current, ...config };
   
        await env.DB.prepare(
          `UPDATE displays SET 
             establishmentName = ?, adminTitle = ?, location = ?, theme = ?, volume = ?, 
             isZenMode = ?, isNoDistractionsMode = ?, isRemoteControl = ?, performanceMode = ?,
             signageUrl = ?, signageType = ?, signageExpiresAt = ?, compiledManifest = ?, visualStyle = ?, vjConfig = ?, textSize = ?, 
             promoFlashText = ?, promoFlashExpiresAt = ?, reactivityMode = ?, updatedAt = ?
           WHERE id = ?`
        ).bind(
          merged.establishmentName,
          merged.adminTitle,
          merged.location,
          merged.theme,
          merged.volume,
          merged.isZenMode ? 1 : 0,
          merged.isNoDistractionsMode ? 1 : 0,
          merged.isRemoteControl ? 1 : 0,
          merged.performanceMode,
          merged.signageUrl,
          merged.signageType,
          merged.signageExpiresAt !== undefined ? merged.signageExpiresAt : null,
          typeof merged.compiledManifest === "object" ? JSON.stringify(merged.compiledManifest) : merged.compiledManifest,
          merged.visualStyle || 'standard',
          merged.vjConfig || null,
          merged.textSize !== undefined ? merged.textSize : 1.0,
          merged.promoFlashText || null,
          merged.promoFlashExpiresAt !== undefined ? merged.promoFlashExpiresAt : null,
          merged.reactivityMode || 'live',
          Date.now(),
          resolvedId
        ).run();
      }
      
      // Sync quotes array if provided
      if (config.quotes && Array.isArray(config.quotes)) {
        await env.DB.prepare("DELETE FROM quotes WHERE userId = ?").bind(resolvedId).run();
        for (const q of config.quotes) {
          const quoteId = q.id || ("quote_" + Math.random().toString(36).substring(2, 12));
          await env.DB.prepare(
            `INSERT INTO quotes (id, userId, category, text, price, tag, imageUrl, showClock, schedule, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            quoteId,
            resolvedId,
            q.category || "",
            q.text,
            q.price || "",
            q.tag || "",
            q.imageUrl || "",
            q.showClock ? 1 : 0,
            q.schedule ? JSON.stringify(q.schedule) : null,
            q.createdAt || Date.now()
          ).run();
        }
      }
 
      // Sync contents array if provided
      if (config.contents && Array.isArray(config.contents)) {
        await env.DB.prepare("DELETE FROM contents WHERE userId = ?").bind(resolvedId).run();
        for (const c of config.contents) {
          const contentId = c.id || ("content_" + Math.random().toString(36).substring(2, 12));
          await env.DB.prepare(
            `INSERT INTO contents (id, userId, url, name, storagePath, schedule, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            contentId,
            resolvedId,
            c.url,
            c.name || "Slide",
            c.storagePath || null,
            c.schedule ? JSON.stringify(c.schedule) : null,
            c.createdAt || Date.now()
          ).run();
        }
      }
 
      // Trigger SSE update using KV signaling
      const kv = env.AURA_KV || env.AURA_STATE;
      if (kv) {
        let signalVal = Date.now().toString();
        if (config.skipTrigger !== undefined) {
          signalVal += "_skip";
        }
        await kv.put(`update:${resolvedId}`, signalVal);
        // Evitar que devuelva la misma canción por culpa de la caché al cambiar de playlist
        await kv.delete(`manifest:${resolvedId}`).catch(() => {});
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to update display", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
