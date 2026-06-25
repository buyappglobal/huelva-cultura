// Cloudflare Pages Function: List all users (Super Admin)
// Path: functions/api/admin/users.js

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { results } = await env.DB.prepare(
      "SELECT id, email, role, hasAdsPanel, hasImpulses, isDemoAccount, whatsapp, city, slug, createdAt FROM users"
    ).all();

    const parsedUsers = results.map(u => ({
      ...u,
      hasAdsPanel: !!u.hasAdsPanel,
      hasImpulses: !!u.hasImpulses,
      isDemoAccount: !!u.isDemoAccount,
    }));

    return new Response(JSON.stringify({ success: true, users: parsedUsers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to load users", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
