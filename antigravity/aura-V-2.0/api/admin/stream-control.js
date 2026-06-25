export default async function handler(req, res) {
  // Configurar los encabezados CORS si fuera necesario
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejar el preflight de CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { cliente_id, action, payload } = req.body;
    
    // Obtener variables de entorno (Vercel las expone en process.env)
    const streamApiUrl = process.env.VITE_STREAM_ENGINE_API_URL || process.env.STREAM_ENGINE_API_URL;
    const apiKey = process.env.STREAM_ENGINE_API_KEY;

    if (!streamApiUrl || !apiKey) {
      console.warn("Vercel API: Variables de entorno del Stream Engine no configuradas.");
      return res.status(200).json({ success: false, reason: "Stream Engine no configurado" });
    }

    // Proxy hacia tu backend en Python de Google Cloud Run
    const response = await fetch(`${streamApiUrl}/api/control-panel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({ cliente_id, action, payload })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Warning from Stream Python Engine:", errorText);
      return res.status(200).json({ success: false, reason: "Error en Stream Engine Python" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error("Error proxing to Stream Engine:", e);
    return res.status(500).json({ error: "Error interno del proxy" });
  }
}
