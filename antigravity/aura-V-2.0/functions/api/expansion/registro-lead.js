// Cloudflare Pages Function: Register lead, send email, and trigger alert.
// Path: functions/api/expansion/registro-lead.js

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
    const lead = await request.json();
    const { id, companyName, contactPerson, email, phone, webUrl, province, category } = lead;

    if (!companyName || !email) {
      return new Response(JSON.stringify({ error: "companyName and email are required" }), { status: 400, headers: corsHeaders });
    }

    // 1. Update status in target_leads table to 'approved'
    if (id) {
      await env.DB.prepare(`
        UPDATE target_leads 
        SET status = 'approved' 
        WHERE id = ?
      `).bind(id).run();
    }

    // 2. Generate unified Client ID for user insertion: 3 letters of province in uppercase + 4 digits
    const cleanProvince = (province || "GEN")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 3)
      .toUpperCase();
    const prefix = cleanProvince.length >= 3 ? cleanProvince : (cleanProvince + "GEN").substring(0, 3);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const userId = `${prefix}${randomDigits}`;

    const now = Date.now();
    const trialEndsAt = now + (21 * 24 * 60 * 60 * 1000); // 21 days trial
    const fakeHash = "dummy_hash_for_expansion_leads";

    // 3. Register user and layout setup
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, email, passwordHash, role, whatsapp, city, slug, status, trialEndsAt, createdAt)
         VALUES (?, ?, ?, 'client', ?, ?, ?, 'trial', ?, ?)`
      ).bind(userId, email, fakeHash, phone || null, province || null, companyName || userId, trialEndsAt, now),
      env.DB.prepare(
        `INSERT OR IGNORE INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode)
         VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high')`
      ).bind(userId, companyName.toUpperCase(), companyName + " TV Display", province || ""),
      env.DB.prepare(
        `INSERT OR IGNORE INTO client_hierarchy (clientId, subscriptionStatus)
         VALUES (?, 'trial')`
      ).bind(userId)
    ]);

    // 4. Send Welcome HTML Email with the PDF dossier link
    if (env.RESEND_API_KEY) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenido a Aura V2 Premium</title>
        </head>
        <body style="background-color: #0A0A0A; color: #E0E0E0; font-family: sans-serif; padding: 40px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid #1F1F2E; border-radius: 12px; padding: 40px; text-align: left;">
            <h1 style="color: #0052FF; font-size: 24px; font-weight: bold; margin-bottom: 20px;">AURA BUSINESS V2</h1>
            <p>Estimado/a <strong>${contactPerson || companyName}</strong>,</p>
            <p>Le damos la bienvenida oficial a <strong>Aura V2 Premium</strong>, la plataforma de cartelería digital, sonido ambiental e hilo musical circadiano líder para su sector: <strong>${category}</strong>.</p>
            <p>Hemos adjuntado y preparado el enlace directo a nuestro dossier de expansión ejecutiva:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://expansion.aurabusiness.es/dossier_ejecutivo_aura_v2_premium.pdf" target="_blank" style="background-color: #0052FF; color: white; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 6px; text-transform: uppercase; font-size: 14px;">Descargar Dossier Ejecutivo PDF</a>
            </div>
            <p>Su cuenta de demostración gratuita de 21 días ha sido pre-activada en nuestra base de datos con el identificador de acceso rápido: <strong>${userId}</strong>.</p>
            <p>Un Director Comercial de Zona se pondrá en contacto con usted brevemente para guiarle en su primer inicio y responder dudas.</p>
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
          subject: `Dossier Ejecutivo Premium - Aura V2 (${companyName})`,
          html: emailHtml
        })
      });

      // Internal admin alert
      const adminAlertHtml = `
        <h2>Nuevo Lead Validado y Registrado en la Base de Datos</h2>
        <p><strong>Empresa:</strong> ${companyName}</p>
        <p><strong>Persona de Contacto:</strong> ${contactPerson || 'No indicado'}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone || 'No indicado'}</p>
        <p><strong>Web:</strong> ${webUrl || 'No indicado'}</p>
        <p><strong>Provincia:</strong> ${province}</p>
        <p><strong>Categoría:</strong> ${category}</p>
        <p><strong>ID de Cuenta Asignado:</strong> ${userId}</p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "Aura Scraper <alertas@aurabusiness.es>",
          to: ["admin@aurabusiness.es"],
          subject: `[Scraper Alert] Lead Aprobado: ${province} - ${companyName}`,
          html: adminAlertHtml
        })
      });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
