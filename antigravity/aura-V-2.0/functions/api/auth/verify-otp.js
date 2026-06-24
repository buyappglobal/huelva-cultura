// Cloudflare Pages Function: Verify OTP PIN
// Path: functions/api/auth/verify-otp.js

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
    const { email, code } = await request.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and verification code are required" }), { status: 400, headers: corsHeaders });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(cleanEmail).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado." }), { status: 404, headers: corsHeaders });
    }

    if (user.status === "suspended") {
      return new Response(JSON.stringify({ error: "Suscripción suspendida. Contacta con soporte." }), { status: 403, headers: corsHeaders });
    }

    // Master code bypass: '2026', '002026' or '202600' works for any user, otherwise must match user.otpCode
    const isMasterCode = cleanCode === "2026" || cleanCode === "002026" || cleanCode === "202600";
    if (!isMasterCode && (!user.otpCode || user.otpCode !== cleanCode)) {
      return new Response(JSON.stringify({ error: "Código de verificación incorrecto." }), { status: 401, headers: corsHeaders });
    }

    if (!isMasterCode && Date.now() > user.otpExpiresAt) {
      return new Response(JSON.stringify({ error: "El código ha expirado. Solicita uno nuevo." }), { status: 410, headers: corsHeaders });
    }

    // Clear OTP code from database upon successful validation
    await env.DB.prepare(
      "UPDATE users SET otpCode = NULL, otpExpiresAt = NULL WHERE id = ?"
    ).bind(user.id).run();

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasAdsPanel: !!user.hasAdsPanel,
        hasImpulses: !!user.hasImpulses,
        status: user.status,
        trialEndsAt: user.trialEndsAt,
        city: user.city,
        slug: user.slug
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
