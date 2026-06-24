// Cloudflare Pages Function: User GET / POST
// Path: functions/api/users/[[userId]].js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathParts = url.pathname.split('/');
  let userId = pathParts[pathParts.length - 1];

  if (userId === "users") {
    userId = "";
  }

  // Robust User and ID Resolution (Typo and slug resilient)
  let resolvedUserId = userId;
  let resolvedUserObj = null;
  if (userId) {
    try {
      resolvedUserObj = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(userId).first();
      if (!resolvedUserObj) {
        resolvedUserObj = await env.DB.prepare("SELECT * FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(userId).first();
      }
      if (!resolvedUserObj) {
        const variations = [
          userId.replace(/l/g, 'I'),
          userId.replace(/I/g, 'l'),
          userId.toLowerCase(),
          userId.toUpperCase()
        ];
        for (const variant of variations) {
          if (variant === userId) continue;
          resolvedUserObj = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUserObj) break;
          resolvedUserObj = await env.DB.prepare("SELECT * FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUserObj) break;
        }
      }
      if (resolvedUserObj) {
        resolvedUserId = resolvedUserObj.id;
      }
    } catch (e) {
      console.error("User ID resolution error:", e);
    }
  }

  const callerId = url.searchParams.get("callerId");
  const callerRole = url.searchParams.get("callerRole");

  // --- GET METHOD ---
  if (request.method === "GET") {
    try {
      if (!resolvedUserId) {
        // List users
        let query = "SELECT id, email, role, hasAdsPanel, hasImpulses, isDemoAccount, whatsapp, city, slug, partnerId, createdAt FROM users";
        let stmt;
        
        if (callerRole === "admin" && callerId) {
          query += " WHERE partnerId = ?";
          stmt = env.DB.prepare(query).bind(callerId);
        } else {
          stmt = env.DB.prepare(query);
        }
        
        const { results } = await stmt.all();

        const parsedUsers = results.map(u => ({
          ...u,
          hasAdsPanel: !!u.hasAdsPanel,
          hasImpulses: !!u.hasImpulses,
          isDemoAccount: !!u.isDemoAccount,
        }));

        return new Response(JSON.stringify(parsedUsers), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const user = resolvedUserObj || await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(resolvedUserId).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
      }

      // Restrict partner access to non-assigned clients
      if (callerRole === "admin" && callerId && user.partnerId !== callerId && user.id !== callerId) {
        return new Response(JSON.stringify({ error: "Access denied. Client not assigned to you." }), { status: 403, headers: corsHeaders });
      }

      const parsedUser = {
        ...user,
        hasAdsPanel: !!user.hasAdsPanel,
        hasImpulses: !!user.hasImpulses,
        isDemoAccount: !!user.isDemoAccount,
      };

      return new Response(JSON.stringify(parsedUser), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to load users", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- POST METHOD (Create/Update User) ---
  if (request.method === "POST") {
    try {
      const data = await request.json();

      // Permission check
      if (resolvedUserId) {
        const checkUser = await env.DB.prepare("SELECT partnerId FROM users WHERE id = ?").bind(resolvedUserId).first();
        if (checkUser && callerRole === "admin" && callerId && checkUser.partnerId !== callerId && resolvedUserId !== callerId) {
          return new Response(JSON.stringify({ error: "Access denied. Cannot modify unassigned client." }), { status: 403, headers: corsHeaders });
        }
      }

      // If legacy client requests deletion via POST
      if (data.deleted === true) {
        await env.DB.prepare("DELETE FROM displays WHERE id = ?").bind(resolvedUserId).run();
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(resolvedUserId).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const current = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(resolvedUserId).first();

      if (current) {
        // Update user
        const merged = { ...current, ...data };
        
        // For admin, force maintaining their own partnerId
        const finalPartnerId = callerRole === "admin" && callerId ? callerId : merged.partnerId;

        await env.DB.prepare(
          `UPDATE users SET 
             email = ?,
             role = ?, 
             hasAdsPanel = ?, 
             hasImpulses = ?, 
             isDemoAccount = ?, 
             whatsapp = ?, 
             city = ?, 
             slug = ?,
             partnerId = ?
           WHERE id = ?`
        ).bind(
          merged.email,
          merged.role,
          merged.hasAdsPanel ? 1 : 0,
          merged.hasImpulses ? 1 : 0,
          merged.isDemoAccount ? 1 : 0,
          merged.whatsapp || "",
          merged.city || "",
          merged.slug || null,
          finalPartnerId || null,
          resolvedUserId
        ).run();

        // Evitar que devuelva la misma canción por culpa de la caché al cambiar de playlist
        const bucket = env.AURA_MEDIA_LIBRARY || env.AUDIO_BUCKET;
        if (bucket) {
          try {
            await bucket.put(`db/users/${resolvedUserId}.json`, JSON.stringify(merged));
          } catch (r2Err) {
            console.error("R2 user config write failed inside users api:", r2Err);
          }
        }

        // Trigger SSE update using KV signaling
        const kv = env.AURA_KV || env.AURA_STATE;
        if (kv) {
          let signalVal = Date.now().toString();
          if (data.modo_manual) {
            signalVal += "_skip";
          }
          await kv.put(`update:${resolvedUserId}`, signalVal);
          await kv.delete(`manifest:${resolvedUserId}`).catch(() => {});
        }

        return new Response(JSON.stringify({ success: true, user: merged }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        // Create user
        const email = data.email || "";
        const role = data.role || "client";
        const hasAdsPanel = data.hasAdsPanel ? 1 : 0;
        const hasImpulses = data.hasImpulses ? 1 : 0;
        const isDemoAccount = data.isDemoAccount ? 1 : 0;
        const whatsapp = data.whatsapp || "";
        const city = data.city || "";
        const slug = data.slug || null;
        const finalPartnerId = callerRole === "admin" && callerId ? callerId : (data.partnerId || null);
        const createdAt = data.createdAt ? (typeof data.createdAt === 'number' ? data.createdAt : Date.parse(data.createdAt)) : Date.now();

        await env.DB.prepare(
          `INSERT INTO users (id, email, passwordHash, role, hasAdsPanel, hasImpulses, isDemoAccount, whatsapp, city, slug, partnerId, createdAt)
           VALUES (?, ?, 'otp_login_user', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          resolvedUserId,
          email,
          role,
          hasAdsPanel,
          hasImpulses,
          isDemoAccount,
          whatsapp,
          city,
          slug,
          finalPartnerId,
          createdAt
        ).run();

        // Also ensure a displays document exists for this user in Cloudflare D1
        const displayExists = await env.DB.prepare("SELECT 1 FROM displays WHERE id = ?").bind(resolvedUserId).first();
        if (!displayExists) {
          await env.DB.prepare(
            `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode)
             VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high')`
          ).bind(
            resolvedUserId,
            email.split("@")[0].toUpperCase(),
            email.split("@")[0].toUpperCase() + " Display",
            city || "Madrid, ES"
          ).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to create/update user", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- DELETE METHOD ---
  if (request.method === "DELETE") {
    try {
      if (!resolvedUserId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: corsHeaders });
      }
      await env.DB.prepare("DELETE FROM displays WHERE id = ?").bind(resolvedUserId).run();
      await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(resolvedUserId).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to delete user", details: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
