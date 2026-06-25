// Cloudflare Pages Function: Manual Assign Lead
// Path: functions/api/erp/assign-manual.js

export async function onRequest(context) {
  const { request, env } = context;

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

  try {
    const { leadId, adminEmail } = await request.json();

    if (!leadId || !adminEmail) {
      return new Response(JSON.stringify({ error: "El ID del lead y el email del admin son obligatorios" }), { status: 400, headers: corsHeaders });
    }

    // Convert lead to client in users table, assigning to the selected partner/admin
    // Get the lead email/name
    const leadMatch = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(leadId).first();
    
    if (!leadMatch) {
        return new Response(JSON.stringify({ error: "Lead no encontrado en la base de datos" }), { status: 404, headers: corsHeaders });
    }
    
    // Get the target admin
    const adminMatch = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(adminEmail).first();
    
    if (!adminMatch) {
         return new Response(JSON.stringify({ error: "Admin no encontrado" }), { status: 404, headers: corsHeaders });
    }

    // Convert to client
    await env.DB.prepare(`
      UPDATE users 
      SET role = 'client', status = 'trial', partnerId = ? 
      WHERE id = ?
    `).bind(adminMatch.id, leadId).run();

    // Update hierarchy
    await env.DB.prepare(`
      INSERT INTO client_hierarchy (clientId, parentAdminId, subscriptionStatus) 
      VALUES (?, ?, 'trial')
      ON CONFLICT(clientId) DO UPDATE SET parentAdminId = excluded.parentAdminId
    `).bind(leadId, adminMatch.id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Lead convertido a cliente y asignado exitosamente.",
      assignedTo: adminEmail
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { status: 500, headers: corsHeaders });
  }
}
