// Cloudflare Pages Function: tickets API
// Path: functions/api/tickets.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not bound" }), { status: 500, headers: corsHeaders });
  }

  // --- GET METHOD: Retrieve tickets ---
  if (request.method === "GET") {
    try {
      const partnerId = url.searchParams.get("partnerId");
      const displayId = url.searchParams.get("displayId");

      let query = "SELECT * FROM tickets";
      const params = [];

      if (partnerId && displayId) {
        query += " WHERE partnerId = ? AND displayId = ?";
        params.push(partnerId, displayId);
      } else if (partnerId) {
        query += " WHERE partnerId = ?";
        params.push(partnerId);
      } else if (displayId) {
        query += " WHERE displayId = ?";
        params.push(displayId);
      }

      query += " ORDER BY createdAt DESC";

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to list tickets", details: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // --- POST METHOD: Create or Update ticket status ---
  if (request.method === "POST") {
    try {
      const body = await request.json();
      
      // Update ticket status action
      if (body.action === "update_status" && body.ticketId) {
        const status = body.status || "approved";
        const resolvedImageUrl = body.resolvedImageUrl || null;

        await env.DB.prepare(
          "UPDATE tickets SET status = ?, resolvedImageUrl = ? WHERE id = ?"
        ).bind(status, resolvedImageUrl, body.ticketId).run();

        // Increment ticket usage if approved
        if (status === "approved") {
          const ticket = await env.DB.prepare("SELECT displayId FROM tickets WHERE id = ?").bind(body.ticketId).first();
          if (ticket && ticket.displayId) {
            await env.DB.prepare(
              "UPDATE displays SET changesUsedThisMonth = changesUsedThisMonth + 1 WHERE id = ?"
            ).bind(ticket.displayId).run();
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Create new ticket (usually triggered by Gemini or client Support Form)
      const { displayId, text, formatType, schedule } = body;
      if (!displayId || !text || !formatType) {
        return new Response(JSON.stringify({ error: "Missing required fields: displayId, text, formatType" }), { status: 400, headers: corsHeaders });
      }

      // Retrieve display details to check remaining monthly limit and obtain partnerId
      const display = await env.DB.prepare("SELECT partnerId, monthlyChangesLimit, changesUsedThisMonth FROM displays WHERE id = ?").bind(displayId).first();
      if (!display) {
        return new Response(JSON.stringify({ error: "Display not found" }), { status: 404, headers: corsHeaders });
      }

      // Check change limit
      if (display.changesUsedThisMonth >= display.monthlyChangesLimit) {
        return new Response(JSON.stringify({ error: "Monthly changes limit reached", limitReached: true }), { status: 403, headers: corsHeaders });
      }

      const ticketId = "ticket_" + Math.random().toString(36).substring(2, 15);
      const partnerId = display.partnerId || null;
      const createdAt = Date.now();

      await env.DB.prepare(
        "INSERT INTO tickets (id, displayId, partnerId, text, formatType, schedule, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        ticketId,
        displayId,
        partnerId,
        text,
        formatType,
        schedule ? JSON.stringify(schedule) : null,
        "pending_action",
        createdAt
      ).run();

      return new Response(JSON.stringify({ success: true, ticketId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to process ticket request", details: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
