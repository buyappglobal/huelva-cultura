// Cloudflare Pages Function: List all folders in R2 media bucket
// Path: functions/api/admin/media-folders.js

export async function onRequest(context) {
  const { env } = context;
  const bucket = env.AURA_MEDIA_LIBRARY || env.AUDIO_BUCKET;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (!bucket) {
    // Return hardcoded default folders as fallback if bucket not bound
    const defaultFolders = [
      "morning", "aperitivo", "active", "sunset", "nocturno", 
      "midnight", "marbella", "meditation", "aura_flamenca", 
      "musicas_del_mundo", "night_lounge", "urban-tribal", "live"
    ];
    return new Response(JSON.stringify(defaultFolders), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const list = await bucket.list({ delimiter: "/" });
    const folders = (list.commonPrefixes || []).map(p => p.replace(/\/$/, ""));
    
    // Default system fallback folders
    const defaultFolders = [
      "morning", "aperitivo", "active", "sunset", "nocturno", 
      "midnight", "marbella", "meditation", "aura_flamenca", 
      "musicas_del_mundo", "night_lounge", "urban-tribal", "live"
    ];
    
    // Merge both and remove duplicates
    const merged = Array.from(new Set([...folders, ...defaultFolders])).sort();

    return new Response(JSON.stringify(merged), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
