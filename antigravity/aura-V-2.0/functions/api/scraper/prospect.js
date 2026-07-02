// Cloudflare Pages Function: Propose / Simulate lead prospecting scrape or fetch leads
// Path: functions/api/scraper/prospect.js

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

  // GET: List all targets currently in validation
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare(`
        SELECT * FROM target_leads 
        ORDER BY createdAt DESC
      `).all();

      return new Response(JSON.stringify({ success: true, leads: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST: Trigger Scraping / Prospecting (simulating or calling API Places / Mocking LinkedIn)
  if (request.method === "POST") {
    try {
      const { province, category } = await request.json();
      if (!province || !category) {
        return new Response(JSON.stringify({ error: "Missing province or category" }), { status: 400, headers: corsHeaders });
      }

      // Simulation/Controlled Scraping engine:
      // We will generate premium realistic leads for the requested niche & province.
      // In a real production deployment, this would perform a fetch to Google Places API or LinkedIn.
      const mockLeadTemplates = [
        {
          namePattern: "Distribuidores & TPV {provincia}",
          contact: "Eduardo Gómez (Director Comercial)",
          phone: "+34 9{digit}4 12 {digit}2",
          emailDomain: "tpv{city}.es",
          webPrefix: "www.tpv{city}.es"
        },
        {
          namePattern: "Tecnología Hostelería {provincia} S.L.",
          contact: "Laura Sanz (Jefa de Expansión)",
          phone: "+34 6{digit}2 88 {digit}9",
          emailDomain: "techhostel.com",
          webPrefix: "www.techhostel.com"
        },
        {
          namePattern: "Aura Connect {provincia} B2B",
          contact: "Manuel Ortega (Socio Director)",
          phone: "+34 9{digit}0 45 {digit}3",
          emailDomain: "auraconnect.es",
          webPrefix: "www.auraconnect.es"
        },
        {
          namePattern: "Retail Solutions {provincia}",
          contact: "Sonia Ruiz (Marketing B2B)",
          phone: "+34 6{digit}7 11 {digit}5",
          emailDomain: "retailsolutions{city}.com",
          webPrefix: "www.retailsolutions{city}.com"
        }
      ];

      const generatedLeads = [];
      const cleanCity = province.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
      
      for (let i = 0; i < mockLeadTemplates.length; i++) {
        const t = mockLeadTemplates[i];
        const leadId = `TL_${cleanCity.substring(0,3).toUpperCase()}_${Date.now().toString().slice(-4)}_${i}`;
        const companyName = t.namePattern.replace("{provincia}", province);
        const contactPerson = t.contact;
        const phone = t.phone.replace(/{digit}/g, () => Math.floor(Math.random() * 10).toString());
        const email = `contacto@${t.emailDomain.replace("{city}", cleanCity)}`;
        const webUrl = `https://${t.webPrefix.replace("{city}", cleanCity)}`;
        
        // Coordinates for Madrid / Spain roughly centered around province
        const lat = 40.4167 + (Math.random() - 0.5) * 0.5;
        const lng = -3.7037 + (Math.random() - 0.5) * 0.5;

        // Save generated lead directly in D1
        await env.DB.prepare(`
          INSERT INTO target_leads (id, companyName, contactPerson, phone, email, webUrl, latitude, longitude, province, category, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_validation', ?)
        `).bind(
          leadId,
          companyName,
          contactPerson,
          phone,
          email,
          webUrl,
          lat,
          lng,
          province,
          category,
          Date.now()
        ).run();

        generatedLeads.push({
          id: leadId,
          companyName,
          contactPerson,
          phone,
          email,
          webUrl,
          latitude: lat,
          longitude: lng,
          province,
          category,
          status: 'pending_validation',
          createdAt: Date.now()
        });
      }

      return new Response(JSON.stringify({ success: true, count: generatedLeads.length, leads: generatedLeads }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
}
