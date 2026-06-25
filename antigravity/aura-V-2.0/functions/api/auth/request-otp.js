// Cloudflare Pages Function: Generate and Request OTP PIN
// Path: functions/api/auth/request-otp.js

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
    const { email, roleRequired } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: corsHeaders });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(cleanEmail).first();

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Role Enforcement
    if (roleRequired && Array.isArray(roleRequired)) {
      if (!user) {
        return new Response(JSON.stringify({ error: "Acceso denegado. No tienes permisos para acceder a esta aplicación." }), { status: 403, headers: corsHeaders });
      }
      if (!roleRequired.includes(user.role)) {
        return new Response(JSON.stringify({ error: "Acceso exclusivo. Tu nivel de cuenta no tiene permisos para entrar aquí." }), { status: 403, headers: corsHeaders });
      }
    }

    if (!user) {
      // Auto-register new trial user
      const userId = "user_" + Math.random().toString(36).substring(2, 12);
      const cleanSlug = cleanEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
      const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days trial

      // Create user
      await env.DB.prepare(
        `INSERT INTO users (id, email, passwordHash, role, hasAdsPanel, hasImpulses, isDemoAccount, status, trialEndsAt, otpCode, otpExpiresAt, createdAt)
         VALUES (?, ?, ?, 'client', 0, 0, 0, 'trial', ?, ?, ?, ?)`
      ).bind(
        userId,
        cleanEmail,
        "otp_login_user", // Placeholder password
        trialEndsAt,
        otpCode,
        otpExpiresAt,
        Date.now()
      ).run();

      // Create display
      await env.DB.prepare(
        `INSERT INTO displays (id, establishmentName, adminTitle, location, theme, volume, isZenMode, isNoDistractionsMode, isRemoteControl, performanceMode)
         VALUES (?, ?, ?, ?, 'classic', 0.7, 0, 0, 0, 'high')`
      ).bind(
        userId,
        cleanEmail.split("@")[0].toUpperCase(),
        cleanEmail.split("@")[0].toUpperCase() + " Display",
        "Madrid, ES"
      ).run();
    } else {
      if (user.status === "suspended") {
        return new Response(JSON.stringify({ error: "Suscripción suspendida. Contacta con soporte." }), { status: 403, headers: corsHeaders });
      }

      // Update existing user with new OTP code
      await env.DB.prepare(
        "UPDATE users SET otpCode = ?, otpExpiresAt = ? WHERE id = ?"
      ).bind(otpCode, otpExpiresAt, user.id).run();
    }

    // Attempt email delivery if Resend API key is configured
    let emailSent = false;
    const isNewUser = !user;
    
    if (env.RESEND_API_KEY) {
      const emailHtml = isNewUser ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenido a Aura Business</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050505;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 550px; background-color: #0c0c0e; border: 1px solid #1c1c21; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                  <!-- Gold line top accent -->
                  <tr>
                    <td height="4" style="background: linear-gradient(90deg, #b8860b, #d4af37, #b8860b);"></td>
                  </tr>
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 40px 40px 20px 40px;">
                      <h1 style="margin: 0; font-size: 26px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; color: #ffffff;">AURA</h1>
                      <div style="font-size: 9px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; color: #d4af37; margin-top: 8px;">Business Portal</div>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 20px 40px 40px 40px; font-size: 15px; line-height: 1.6; color: #b3b3b8; text-align: left;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #ffffff; font-weight: 500; text-align: center;">¡Te damos la bienvenida a la revolución sensorial!</p>
                      
                      <p style="margin: 0 0 16px 0;">Gracias por registrarte en <strong>Aura Business</strong>. Tu cuenta de prueba gratuita de <strong>7 días</strong> para el sistema de reproducción sensorial <strong>Aura Display</strong> ya está activa.</p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 14px; leading-relaxed: 1.5;">Aura sincroniza música reactiva y contenido visual circadiano en tiempo real para optimizar la atmósfera de tu local, logrando mejorar la experiencia del cliente e incrementar tus ventas hasta en un 22%.</p>
                      
                      <div style="background-color: #141417; border: 1px solid #23232a; border-radius: 16px; padding: 24px; margin-bottom: 30px; text-align: center;">
                        <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #d4af37; display: block; margin-bottom: 12px;">Código de Acceso Único</span>
                        <div style="font-size: 38px; font-weight: 800; letter-spacing: 6px; color: #ffffff; font-family: monospace; margin: 0 auto; text-shadow: 0 2px 10px rgba(212,175,55,0.2);">${otpCode}</div>
                        <span style="font-size: 11px; color: #666670; display: block; margin-top: 12px;">Este código es de un solo uso y caduca en 5 minutos.</span>
                      </div>

                      <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff;">Cómo empezar:</h4>
                      <ol style="margin: 0 0 30px 0; padding-left: 20px; font-size: 13px;">
                        <li style="margin-bottom: 8px;">Inicia sesión con tu código en el Panel de Administración.</li>
                        <li style="margin-bottom: 8px;">Vincula tu pantalla o Smart TV abriendo la URL del reproductor.</li>
                        <li style="margin-bottom: 8px;">Selecciona el hilo circadiano correspondiente al momento del día y disfruta del ambiente automatizado.</li>
                      </ol>

                      <div style="border-top: 1px solid #1c1c21; padding-top: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #55555c;">
                          ¿Tienes dudas? Escríbenos directamente respondiendo a este correo.
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
      ` : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de verificación Aura Business</title>
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
                      <p style="margin: 0 0 20px 0; color: #ffffff;">Introduce el siguiente código único para iniciar sesión de forma segura en tu panel de control:</p>
                      
                      <div style="background-color: #141417; border: 1px solid #23232a; border-radius: 12px; padding: 20px; margin-bottom: 20px; display: inline-block; width: 80%;">
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ffffff; font-family: monospace;">${otpCode}</div>
                      </div>

                      <p style="margin: 0; font-size: 11px; color: #55555c;">
                        Este código es válido durante 5 minutos.<br>Si no has solicitado este acceso, puedes ignorar este correo de forma segura.
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
            from: "Aura Business <noreply@aurabusiness.es>",
            to: [cleanEmail],
            subject: isNewUser ? "¡Bienvenido a Aura Business! Tu acceso y periodo de prueba" : `${otpCode} es tu código de verificación Aura Business`,
            html: emailHtml
          })
        });
        
        if (mailResponse.ok) {
          emailSent = true;
        } else {
          const resendError = await mailResponse.json();
          console.error("Resend API Error:", resendError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Error del proveedor de correo (Resend): " + (resendError.message || "Bloqueado o límite alcanzado") 
          }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.error("Resend delivery failed:", e);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Fallo de conexión al proveedor de correos." 
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "RESEND_API_KEY no configurada en el servidor." 
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return response
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
