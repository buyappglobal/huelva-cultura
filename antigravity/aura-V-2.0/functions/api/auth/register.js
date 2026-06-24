// Cloudflare Pages Function: User Registration
// Path: functions/api/auth/register.js

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
    const { email, establecimiento, telefono, provincia } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email es requerido" }), { status: 400, headers: corsHeaders });
    }

    // Passwords are no longer used for clients, using random string just for schema compatibility
    const passHash = await hashPassword(Math.random().toString(36));
    
    // Generate unified ID: 3 letters of province in uppercase + 4 random digits
    const cleanProvince = (provincia || "GEN")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-zA-Z]/g, "") // Only letters
      .substring(0, 3)
      .toUpperCase();
    
    const prefix = cleanProvince.length >= 3 ? cleanProvince : (cleanProvince + "GEN").substring(0, 3);
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const userId = `${prefix}${randomDigits}`;
    const finalSlug = userId;
    
    // Set 21 days trial
    const now = Date.now();
    const trialEndsAt = now + (21 * 24 * 60 * 60 * 1000); // 21 days in ms

    // Insert user into D1
    await env.DB.prepare(
      `INSERT INTO users (id, email, passwordHash, role, city, whatsapp, slug, status, trialEndsAt, createdAt)
       VALUES (?, ?, ?, 'client', ?, ?, ?, 'trial', ?, ?)`
    ).bind(userId, email, passHash, provincia || "", telefono || "", finalSlug, trialEndsAt, now).run();

    // Auto-Assign Logic: Look for an admin in the same city/province
    const adminMatch = await env.DB.prepare(
      `SELECT id FROM users WHERE role IN ('admin', 'sales', 'superadmin') AND LOWER(city) = LOWER(?) LIMIT 1`
    ).bind(provincia || "").first();

    const parentAdminId = adminMatch ? adminMatch.id : null;

    // Insert into client_hierarchy
    await env.DB.prepare(
      `INSERT INTO client_hierarchy (clientId, parentAdminId, subscriptionStatus) VALUES (?, ?, 'trial')`
    ).bind(userId, parentAdminId).run();

    // Initialize display config for user
    await env.DB.prepare(
      `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode)
       VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high')`
    ).bind(userId, email.split("@")[0].toUpperCase(), email.split("@")[0].toUpperCase() + " Display", provincia || "").run();

    return new Response(JSON.stringify({ success: true, userId, slug: finalSlug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: "Este email ya está registrado" }), { status: 409, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Registration failed", details: err.message }), { status: 500, headers: corsHeaders });
  }
}
