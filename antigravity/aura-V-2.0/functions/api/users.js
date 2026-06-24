// Cloudflare Pages Function: List all users
// Path: functions/api/users.js

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
      `SELECT u.id, u.email, u.role, u.hasAdsPanel, u.hasImpulses, u.isDemoAccount, u.whatsapp, u.city, u.slug, u.status, u.createdAt, COUNT(t.id) as pendingTicketsCount 
       FROM users u 
       LEFT JOIN tickets t ON u.id = t.displayId AND t.status = 'pending' 
       GROUP BY u.id`
    ).all();

    const parsedUsers = results.map(u => ({
      ...u,
      hasAdsPanel: !!u.hasAdsPanel,
      hasImpulses: !!u.hasImpulses,
      isDemoAccount: !!u.isDemoAccount,
    }));

    return new Response(JSON.stringify(parsedUsers), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Report error to Sentinel
    const { reportBackendError } = await import("./support/sentinel.js");
    await reportBackendError(err, context);

    return new Response(JSON.stringify({ error: "Failed to load users", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
