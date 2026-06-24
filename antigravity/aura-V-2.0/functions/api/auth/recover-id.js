// Cloudflare Pages Function: Send client identifier via email
// Path: functions/api/auth/recover-id.js

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
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: corsHeaders });
    }

    const cleanEmail = email.toLowerCase().trim();
    
    // Find user in database
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(cleanEmail).first();

    if (!user) {
      // Return success even if not found to prevent email enumeration, but we don't send an email
      return new Response(JSON.stringify({ success: true, message: "Si el correo existe, se ha enviado un recordatorio." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientId = user.id;

    // Send email using Resend
    let emailSent = false;
    
    if (env.RESEND_API_KEY) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tu Identificador de Cliente - Aura</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050505;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #0c0c0e; border: 1px solid #1c1c21; border-radius: 24px; overflow: hidden;">
                  <!-- Gold line top accent -->
                  <tr>
                    <td height="4" style="background: linear-gradient(90deg, #b8860b, #d4af37, #b8860b);"></td>
                  </tr>
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 30px 30px 10px 30px;">
                      <h1 style="margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 5px; text-transform: uppercase; color: #ffffff;">AURA</h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 20px 35px 35px 35px; font-size: 14px; line-height: 1.6; color: #b3b3b8; text-align: center;">
                      <p style="margin: 0 0 20px 0; color: #ffffff;">Has solicitado recordar tu identificador de cliente para acceder a la aplicación.</p>
                      
                      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Tu Código de Cuenta / Identificador es:</p>
                      <div style="background-color: #141417; border: 1px solid #23232a; border-radius: 12px; padding: 20px; margin-bottom: 20px; display: inline-block; width: 80%; word-break: break-all;">
                        <div style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #ffffff; font-family: monospace;">${clientId}</div>
                      </div>

                      <p style="margin: 0; font-size: 11px; color: #55555c;">
                        Puedes usar este código junto con tu correo electrónico para iniciar sesión en clientes.aurabusiness.es.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const mailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: "Aura Display <noreply@aurabusiness.es>",
            to: [cleanEmail],
            subject: "Tu Identificador de Cliente - Aura",
            html: emailHtml
          })
        });
        if (mailResponse.ok) emailSent = true;
      } catch (e) {
        console.error("Resend delivery failed:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      emailSent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
