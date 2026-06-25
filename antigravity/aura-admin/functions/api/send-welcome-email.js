export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const { email, password, slug } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Resend API Key not configured in environment" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const portalUrl = "https://clientes.aurabusiness.es";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tus Credenciales de Acceso - Aura Business</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 550px; background-color: #0c0c0e; border: 1px solid #1c1c21; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                <!-- Line accent -->
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, #a855f7, #3b82f6, #a855f7);"></td>
                </tr>
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; color: #ffffff;">AURA</h1>
                    <div style="font-size: 9px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; color: #a855f7; margin-top: 8px;">Business Portal</div>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; font-size: 14px; line-height: 1.6; color: #b3b3b8; text-align: left;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #ffffff; font-weight: 500; text-align: center;">¡Tus credenciales de acceso ya están listas!</p>
                    
                    <p style="margin: 0 0 16px 0;">Se han generado tus credenciales para acceder a la aplicación oficial de clientes en <strong>clientes.aurabusiness.es</strong>.</p>
                    
                    <div style="background-color: #141417; border: 1px solid #23232a; border-radius: 16px; padding: 24px; margin-bottom: 30px; text-align: center;">
                      <span style="font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #a855f7; display: block; margin-bottom: 8px;">Código de Cuenta (ID Cliente)</span>
                      <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #ffffff; font-family: monospace; margin: 0 auto; text-shadow: 0 2px 10px rgba(168,85,247,0.2);">${slug}</div>
                      
                      <span style="font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #666670; display: block; margin-top: 20px; margin-bottom: 8px;">Email Asociado</span>
                      <div style="font-size: 14px; color: #ffffff; font-family: monospace;">${cleanEmail}</div>
                    </div>

                    <p style="margin: 0 0 30px 0; text-align: center;">
                      Puedes acceder directamente a tu portal de clientes pulsando el siguiente botón:
                    </p>

                    <div style="text-align: center; margin-bottom: 35px;">
                      <a href="${portalUrl}" target="_blank" style="background-color: #ffffff; color: #000000; padding: 14px 28px; font-size: 12px; font-weight: bold; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; box-shadow: 0 4px 12px rgba(255,255,255,0.15); transition: all 0.2s ease;">Acceder al Portal</a>
                    </div>

                    <h4 style="margin: 0 0 12px 0; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff;">Instrucciones para iniciar sesión:</h4>
                    <ol style="margin: 0 0 30px 0; padding-left: 20px; font-size: 13px; color: #b3b3b8;">
                      <li style="margin-bottom: 8px;">Haz clic en el botón de arriba o introduce <strong>https://clientes.aurabusiness.es</strong> en tu navegador.</li>
                      <li style="margin-bottom: 8px;">Ingresa tu <strong>Email del Administrador</strong>.</li>
                      <li style="margin-bottom: 8px;">Solicita un código PIN que llegará a tu bandeja de entrada e ingrésalo para acceder de manera segura.</li>
                    </ol>

                    <div style="border-top: 1px solid #1c1c21; padding-top: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #55555c;">
                        Este es un correo automático. Si tienes alguna duda o incidencia, por favor ponte en contacto con tu comercial asignado o con nuestro soporte.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Aura Business <noreply@aurabusiness.es>",
        to: [cleanEmail],
        subject: `Tus Credenciales de Acceso (Código: ${slug}) - Aura Business`,
        html: emailHtml
      })
    });

    if (!mailResponse.ok) {
      const errText = await mailResponse.text();
      return new Response(JSON.stringify({ error: "Failed to send email via Resend API", details: errText }), {
        status: mailResponse.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const resData = await mailResponse.json();
    return new Response(JSON.stringify({ success: true, data: resData }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Send welcome email failed", 
      details: err.message 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

