// Cloudflare Pages Function: Public Lead Registration Form handler from landing page
// Path: functions/api/expansion/registro-web.js

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
    const { companyName, contactPerson, email, phone, webUrl, province, category, message } = await request.json();

    if (!companyName || !email) {
      return new Response(JSON.stringify({ error: "companyName and email are required" }), { status: 400, headers: corsHeaders });
    }

    const leadId = `WEB_${(province || "GEN").substring(0,3).toUpperCase()}_${Date.now().toString().slice(-4)}`;

    // 1. Insert into target_leads table with 'pending_validation' status (makes it instantly visible in ERP Scraper Tab)
    await env.DB.prepare(`
      INSERT INTO target_leads (id, companyName, contactPerson, phone, email, webUrl, latitude, longitude, province, category, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, 'pending_validation', ?)
    `).bind(
      leadId,
      companyName,
      contactPerson || null,
      phone || null,
      email,
      webUrl || null,
      province || 'Desconocida',
      category || 'General',
      Date.now()
    ).run();

    // 2. Trigger automated confirmation email to the candidate if Resend is configured
    if (env.RESEND_API_KEY) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Hemos recibido tu solicitud - Aura Business</title>
        </head>
        <body style="background-color: #0A0A0A; color: #E0E0E0; font-family: sans-serif; padding: 40px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid #1F1F2E; border-radius: 12px; padding: 40px; text-align: left;">
            <h1 style="color: #0052FF; font-size: 24px; font-weight: bold; margin-bottom: 20px;">AURA BUSINESS V2</h1>
            <p>Hola <strong>${contactPerson || companyName}</strong>,</p>
            <p>Muchas gracias por tu interés en unirte a la red de expansión y distribución oficial de <strong>Aura Business V2</strong>.</p>
            <p>Hemos recibido correctamente tus datos de registro orgánico desde el portal de expansión. Un Director de Expansión de tu zona revisará tu propuesta comercial y se pondrá en contacto contigo en las próximas 24/48 horas laborables para activar tu cuenta del portal.</p>
            <p><strong>Datos recibidos:</strong></p>
            <ul>
              <li><strong>Empresa:</strong> ${companyName}</li>
              <li><strong>Provincia:</strong> ${province || 'Desconocida'}</li>
              <li><strong>Sector/Categoría:</strong> ${category || 'General'}</li>
            </ul>
            <hr style="border: 0; border-top: 1px solid #1F1F2E; margin: 30px 0;" />
            <p style="font-size: 12px; color: #777;">Aura Business S.L. &copy; 2026. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "Expansión Aura <expansion@aurabusiness.es>",
          to: [email],
          subject: "Hemos recibido tu solicitud de expansión - Aura V2",
          html: emailHtml
        })
      });

      // Internal admin notification
      const adminAlertHtml = `
        <h2>[Registro Orgánico Web] Nueva Solicitud de Candidato en el Portal de Expansión</h2>
        <p><strong>Empresa:</strong> ${companyName}</p>
        <p><strong>Persona de Contacto:</strong> ${contactPerson || 'No indicado'}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone || 'No indicado'}</p>
        <p><strong>Web:</strong> ${webUrl || 'No indicado'}</p>
        <p><strong>Provincia:</strong> ${province}</p>
        <p><strong>Categoría de Interés:</strong> ${category}</p>
        <p><strong>Mensaje adicional:</strong> ${message || 'Ninguno'}</p>
        <p><em>Accede al ERP para verificar su web y aprobar la solicitud.</em></p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "Aura Portal <alertas@aurabusiness.es>",
          to: ["admin@aurabusiness.es"],
          subject: `[Web Portal] Nueva Solicitud de Alianza: ${province} - ${companyName}`,
          html: adminAlertHtml
        })
      });
    }

    return new Response(JSON.stringify({ success: true, leadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
