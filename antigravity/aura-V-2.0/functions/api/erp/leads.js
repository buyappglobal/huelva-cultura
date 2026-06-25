// Cloudflare Pages Function: List Orphan Leads
// Path: functions/api/erp/leads.js

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
    const { results } = await env.DB.prepare(`
      SELECT 
        u.id, 
        u.slug as nombre, 
        u.email, 
        u.whatsapp as telefono, 
        u.city as provincia, 
        u.createdAt, 
        u.status
      FROM users u
      LEFT JOIN client_hierarchy ch ON u.id = ch.clientId
      WHERE u.role = 'client' AND (ch.parentAdminId IS NULL OR ch.parentAdminId = '')
    `).all();

    return new Response(JSON.stringify({ success: true, leads: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to load leads", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
