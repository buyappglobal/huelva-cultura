// Cloudflare Pages Function: User Login
// Path: functions/api/auth/login.js

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
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: corsHeaders });
    }

    const passHash = await hashPassword(password);
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND passwordHash = ?")
      .bind(email, passHash)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasAdsPanel: !!user.hasAdsPanel,
        hasImpulses: !!user.hasImpulses,
        city: user.city,
        slug: user.slug
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
