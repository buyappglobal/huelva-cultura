export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM partners ORDER BY createdAt DESC"
      ).all();

      return new Response(JSON.stringify({ success: true, partners: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } 
    
    if (request.method === "POST") {
      const data = await request.json();
      
      const id = data.id || `PRT-${Math.floor(Math.random() * 10000)}`;
      const createdAt = Date.now();
      
      await env.DB.prepare(
        "INSERT INTO partners (id, name, type, parentId, stripeAccountId, contactEmail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        id,
        data.name,
        data.type,
        data.parentId || null,
        data.stripeAccountId || null,
        data.contactEmail || null,
        createdAt
      ).run();

      return new Response(JSON.stringify({ success: true, partner: { id, ...data, createdAt } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed processing partners", details: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
