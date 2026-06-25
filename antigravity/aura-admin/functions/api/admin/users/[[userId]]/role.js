// Cloudflare Pages Function: Update user details (Super Admin)
// Path: functions/api/admin/users/[[userId]]/role.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  // URL structure: /api/admin/users/:userId/role
  const pathParts = url.pathname.split('/');
  const userId = pathParts[4]; // 'api', 'admin', 'users', userId, 'role'

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: corsHeaders });
  }

  try {
    const fields = await request.json();
    const current = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();

    if (!current) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
    }

    const merged = { ...current, ...fields };

    await env.DB.prepare(
      `UPDATE users SET 
         role = ?, 
         hasAdsPanel = ?, 
         hasImpulses = ?, 
         isDemoAccount = ?, 
         whatsapp = ?, 
         city = ?, 
         slug = ? 
       WHERE id = ?`
    ).bind(
      merged.role,
      merged.hasAdsPanel ? 1 : 0,
      merged.hasImpulses ? 1 : 0,
      merged.isDemoAccount ? 1 : 0,
      merged.whatsapp || "",
      merged.city || "",
      merged.slug || null,
      userId
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to update user", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
