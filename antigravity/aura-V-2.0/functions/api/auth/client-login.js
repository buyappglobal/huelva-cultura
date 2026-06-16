// Cloudflare Pages Function: Client Passwordless Login
// Path: functions/api/auth/client-login.js

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
    const { email, identifier } = await request.json(); // identifier is DNI/CIF (stored in slug)
    if (!email || !identifier) {
      return new Response(JSON.stringify({ error: "Email e identificador (CIF/DNI) son requeridos" }), { status: 400, headers: corsHeaders });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanId = identifier.trim().toUpperCase();

    // Find the client user matching email and slug (DNI/CIF)
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE LOWER(email) = ? AND (UPPER(slug) = ? OR UPPER(id) = ?) AND role = 'client'"
    )
    .bind(cleanEmail, cleanId, cleanId)
    .first();

    if (!user) {
      return new Response(JSON.stringify({ error: "No se encontró ningún cliente con estas credenciales" }), { status: 401, headers: corsHeaders });
    }

    // Return the client user details
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        slug: user.slug,
        city: user.city,
        status: user.status
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
