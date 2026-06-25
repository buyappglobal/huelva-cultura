export async function onRequest(context) {
  const { request, env, params } = context;
  const leadId = params.leadId;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    // 1. Get the lead's province
    const leadMatch = await env.DB.prepare(`SELECT city FROM users WHERE id = ?`).bind(leadId).first();
    if (!leadMatch) return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: corsHeaders });

    const province = leadMatch.city || "";

    // 2. Find the closest Admin by province
    const adminMatch = await env.DB.prepare(
      `SELECT id FROM users WHERE role IN ('admin', 'sales', 'superadmin') AND LOWER(city) = LOWER(?) LIMIT 1`
    ).bind(province).first();

    if (!adminMatch) {
      return new Response(JSON.stringify({ success: false, message: "No admin found in that province." }), { headers: corsHeaders });
    }

    // 3. Assign the lead
    await env.DB.prepare(
      `UPDATE client_hierarchy SET parentAdminId = ? WHERE clientId = ?`
    ).bind(adminMatch.id, leadId).run();

    return new Response(JSON.stringify({ success: true, assignedAdminId: adminMatch.id }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
