// Cloudflare Pages Function: Auto-Assign Lead
// Path: functions/api/erp/assign-auto.js

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
    const { leadId, provincia } = await request.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: "El ID del lead es obligatorio" }), { status: 400, headers: corsHeaders });
    }

    // 1. Buscamos el admin más cercano
    let adminMatch = null;
    
    if (provincia) {
      adminMatch = await env.DB.prepare(`
        SELECT id, email, role 
        FROM users 
        WHERE role IN ('admin', 'sales', 'superadmin', 'partner') AND LOWER(city) = LOWER(?) 
        LIMIT 1
      `).bind(provincia).first();
    }

    // 2. Si no hay admin en esa provincia, asignamos a un SuperAdmin por defecto
    let fallbackUsed = false;
    if (!adminMatch) {
      adminMatch = await env.DB.prepare(`
        SELECT id, email, role 
        FROM users 
        WHERE role = 'superadmin' 
        LIMIT 1
      `).first();
      fallbackUsed = true;
    }

    if (!adminMatch) {
      return new Response(JSON.stringify({ error: "No hay administradores disponibles en el sistema." }), { status: 500, headers: corsHeaders });
    }

    // 3. Asignar el lead en la jerarquía y actualizar su rol
    await env.DB.prepare(`
      INSERT INTO client_hierarchy (clientId, parentAdminId, subscriptionStatus) 
      VALUES (?, ?, 'trial')
      ON CONFLICT(clientId) DO UPDATE SET parentAdminId = excluded.parentAdminId
    `).bind(leadId, adminMatch.id).run();

    await env.DB.prepare(`
      UPDATE users 
      SET role = 'client', status = 'trial', partnerId = ? 
      WHERE id = ?
    `).bind(adminMatch.id, leadId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      assignedTo: adminMatch.email,
      fallbackUsed: fallbackUsed,
      message: fallbackUsed 
        ? "No se encontró comercial en esa provincia. Asignado al SuperAdmin por defecto."
        : "Lead asignado correctamente al comercial de la provincia."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error en la asignación automática", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
