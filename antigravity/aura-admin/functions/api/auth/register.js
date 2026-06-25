// Cloudflare Pages Function: User Registration
// Path: functions/api/auth/register.js

import { sendNotification } from "../notifications/helper.js";

async function hashPassword(password) {
  const keyBuffer = new TextEncoder().encode("aura_display_salt_2026");
  const dataBuffer = new TextEncoder().encode(password);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    dataBuffer
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { email, password, role, hasAdsPanel, hasImpulses, city, slug, whatsapp, partnerId, dni, address } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: corsHeaders });
    }

    const passHash = await hashPassword(password);
    const userId = "user_" + Math.random().toString(36).substring(2, 12);
    
    // Fallback if slug is not provided
    const finalSlug = slug ? slug.trim().toUpperCase() : email.split("@")[0].toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // Insert user into D1
    await env.DB.prepare(
      `INSERT INTO users (id, email, passwordHash, role, hasAdsPanel, hasImpulses, city, slug, whatsapp, partnerId, dni, address, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId, 
      email, 
      passHash, 
      role || "client", 
      hasAdsPanel ? 1 : 0, 
      hasImpulses ? 1 : 0, 
      city || "", 
      finalSlug, 
      whatsapp || "", 
      partnerId || null,
      dni || "",
      address || "",
      Date.now()
    ).run();

    // Initialize display config for user
    await env.DB.prepare(
      `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode)
       VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high')`
    ).bind(userId, email.split("@")[0].toUpperCase(), email.split("@")[0].toUpperCase() + " Display", city || "").run();

    try {
      // Fetch all admins and superadmins to notify them
      const { results: admins } = await env.DB.prepare(
        "SELECT id FROM users WHERE role = 'superadmin' OR role = 'admin'"
      ).all();

      for (const adm of admins) {
        await sendNotification(
          env,
          adm.id,
          "Nuevo Cliente Registrado 🚀",
          `El cliente ${email} (${city || "Sin ciudad"}) se ha registrado en el portal.`,
          "new_client",
          "/"
        );
      }
    } catch (notifErr) {
      console.error("Error dispatching registration notifications", notifErr);
    }

    return new Response(JSON.stringify({ success: true, userId, slug: finalSlug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Registration failed", details: err.message }), { status: 500, headers: corsHeaders });
  }
}
