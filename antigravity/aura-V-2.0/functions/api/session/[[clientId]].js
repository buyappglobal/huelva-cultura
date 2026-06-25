// Cloudflare Pages Function for Edge Playout & Session Management
// Path: functions/api/session/[[clientId]].js

import { QUOTES_DB } from './quotes.js';
const DEFAULT_SCHEDULE = [
  { start: 0, end: 8, folder: "midnight", quote: '"La noche es la mitad de la vida, y la mejor mitad." - Johann Wolfgang von Goethe', category: "NIGHT" },
  { start: 8, end: 12, folder: "aperitivo", quote: '"Cuando te levantes por la mañana, piensa en el precioso privilegio de estar vivo." - Marco Aurelio', category: "SOCIAL" },
  { start: 12, end: 17, folder: "active", quote: '"La simplicidad es la máxima sofisticación." - Leonardo da Vinci', category: "BUSINESS" },
  { start: 17, end: 20, folder: "sunset", quote: '"No es que tengamos poco tiempo, sino que perdemos mucho." - Séneca', category: "LOUNGE" },
  { start: 20, end: 24, folder: "sunset", quote: '"Estamos hechos de la misma materia que los sueños." - William Shakespeare', category: "PREMIUM" }
];

const FOLDER_TRACKS = {
  morning: ["aura_breakfast.mp3", "aura_morning.mp3"],
  aperitivo: ["aura_aperitivo.mp3", "aura_aperitivo_ready.mp3"],
  active: ["aura_active.mp3", "aura_active_2.mp3", "aura_active3.mp3"],
  sunset: ["aura_sunset.mp3", "aura_gold.mp3", "aura_relax.mp3", "aura_lounge.mp3"],
  nocturno: ["aura_sunset.mp3", "aura_midnight.mp3"],
  midnight: ["aura_at_midnight5.mp3", "cajón_seco_lavanda.mp3"],
  marbella: ["aura_marbella.mp3", "aura_beach.mp3"],
  aura_flamenca: ["aura_flamenca.mp3", "aura_guitar.mp3"],
  musicas_del_mundo: ["aura_world.mp3", "aura_global.mp3"],
  night_lounge: ["aura_night_lounge.mp3", "aura_chill.mp3"],
  "urban-tribal": ["aura_urban.mp3", "aura_tribal.mp3"],
  meditation: ["aura_meditation.mp3", "aura_zen.mp3"],
  live: ["aura_live.mp3"]
};

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920",
  "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&q=80&w=1920"
];

const R2_MEDIA_BASE = "https://media.auradisplay.es/";

function getMadridTimeParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false
  });
  const parts = dtf.formatToParts(date);
  const h = parseInt(parts.find(p => p.type === "hour").value, 10);
  const m = parseInt(parts.find(p => p.type === "minute").value, 10);
  
  // Calculate correct day of week in Madrid
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const dateString = formatter.format(date); // e.g., "6/16/2026, 07:13:58" or "6/16/2026, 7:13:58"
  // Let's parse dateString to construct a local Date object representation
  const [datePart, timePart] = dateString.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const madridLocal = new Date(year, month - 1, day, hour, minute, second);
  const dayOfWeek = madridLocal.getDay(); // 0 is Sunday, 1 is Monday...

  return { h, m, dayOfWeek };
}

function getMadridHour() {
  return getMadridTimeParts().h;
}

async function getTracksFromR2(env, folder) {
  // If native R2 bucket is bound to worker
  const bucket = env.AURA_MEDIA_LIBRARY || env.AUDIO_BUCKET;
  if (bucket) {
    try {
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;
      const list = await bucket.list({ prefix });
      if (list && list.objects && list.objects.length > 0) {
        const tracks = list.objects
          .map(file => file.key.split('/').pop())
          .filter(name => name.endsWith('.mp3'));
        if (tracks.length > 0) return tracks;
      }
    } catch (e) {
      console.error("R2 list failed:", e);
    }
  }
  return FOLDER_TRACKS[folder] || [`aura_${folder}.mp3`, "aura_active.mp3"];
}

function resolveActivePromo(promoFlashText, promoFlashExpiresAt, h, m, dayOfWeek) {
  if (!promoFlashText) return null;

  // Check if it's JSON format
  if (promoFlashText.trim().startsWith("[")) {
    try {
      const offers = JSON.parse(promoFlashText);
      if (Array.isArray(offers)) {
        const nowMs = Date.now();
        // Priority 1: Instant Boost active
        for (const offer of offers) {
          if (offer.instantBoostExpiresAt && nowMs < offer.instantBoostExpiresAt && offer.text && offer.text.trim()) {
            return {
              text: offer.text,
              expiresAt: offer.instantBoostExpiresAt
            };
          }
        }

        // Priority 2: Active manually or via Weekly Schedule
        for (const offer of offers) {
          if (offer.text && offer.text.trim()) {
            // If active status is set to manual/always active (independent of schedule)
            if (offer.active && !offer.scheduleEnabled) {
              return {
                text: offer.text,
                expiresAt: null
              };
            }
            // If active and weekly schedule is configured
            if (offer.active && offer.scheduleEnabled) {
              const days = offer.scheduleDays || [];
              if (days.includes(dayOfWeek)) {
                const startVal = offer.scheduleStartTime || "";
                const endVal = offer.scheduleEndTime || "";
                if (startVal && endVal) {
                  const [sh, sm] = startVal.split(":").map(Number);
                  const [eh, em] = endVal.split(":").map(Number);
                  const currentMinutes = h * 60 + m;
                  const startMinutes = sh * 60 + sm;
                  const endMinutes = eh * 60 + em;
                  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                    return {
                      text: offer.text,
                      expiresAt: null
                    };
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error parsing promoFlashText JSON:", e);
    }
  }

  // Fallback to legacy behavior
  if (promoFlashExpiresAt && Date.now() < promoFlashExpiresAt) {
    return {
      text: promoFlashText,
      expiresAt: promoFlashExpiresAt
    };
  }

  return null;
}

async function computeAuraManifest(env, clientId, skip, exclude, skipCount, forceFolder) {
  const isGlobal = clientId === 'global';
  const now = new Date();
  
  const { h, m, dayOfWeek } = getMadridTimeParts(now);
  const minutesSinceMidnight = (h * 60) + m;
  
  const TRACK_INTERVAL_MINS = 4;
  const currentSlotIndex = Math.floor(minutesSinceMidnight / TRACK_INTERVAL_MINS);
  
  let currentSchedule = DEFAULT_SCHEDULE;
  let clientName = "Aura Hub";
  let forcedFolder = forceFolder || null;
  let forcedQuote = null;
  let forcedCategory = null;

  const bucket = env.AURA_MEDIA_LIBRARY || env.AUDIO_BUCKET;
  let userConfig = null;
  if (!isGlobal && bucket) {
    try {
      const userObj = await bucket.get(`db/users/${clientId}.json`);
      if (userObj) {
        userConfig = await userObj.json();
      }
    } catch (e) {
      console.error("Session R2 user config fetch failed:", e);
    }
  }

  if (userConfig) {
    clientName = userConfig.nombre || userConfig.fiscalName || clientName;
    if (!forcedFolder && userConfig.modo_manual && userConfig.modo_manual.activo && userConfig.modo_manual.carpeta) {
      forcedFolder = userConfig.modo_manual.carpeta;
      forcedQuote = userConfig.modo_manual.quote || "IMPULSO AURA ACTIVADO";
      forcedCategory = userConfig.modo_manual.category || "ENERGY";
    }
    if (!forcedFolder && userConfig.circadian_schedule) {
      currentSchedule = userConfig.circadian_schedule;
    }
  }

  const isManualActive = userConfig && userConfig.modo_manual && userConfig.modo_manual.activo;
  const isDynamic = !!skip || !!forceFolder || !!exclude || isManualActive;

  if (!isGlobal && env.DB) {
    try {
      // Get display manifest
      const displayData = await env.DB.prepare("SELECT compiledManifest, promoFlashText, promoFlashExpiresAt FROM displays WHERE id = ?").bind(clientId).first();
      
      let promoFlash = null;
      if (displayData) {
        promoFlash = resolveActivePromo(displayData.promoFlashText, displayData.promoFlashExpiresAt, h, m, dayOfWeek);
      }

      if (displayData && displayData.compiledManifest && !isDynamic) {
        try {
          const parsed = JSON.parse(displayData.compiledManifest);
          if (parsed && parsed.track) {
            if (!parsed.visuals) {
              const bgIndex = currentSlotIndex % BACKGROUNDS.length;
              parsed.visuals = {
                backgroundUrl: BACKGROUNDS[bgIndex],
                backgroundType: "image",
                quote: quote,
                category: category,
                ticker: []
              };
            }
            return {
              ...parsed,
              promoFlash: promoFlash,
              timestamp: now.toISOString()
            };
          }
        } catch (e) {}
      }

      const clientData = await env.DB.prepare("SELECT email, status, trialEndsAt FROM users WHERE id = ?").bind(clientId).first();
      if (clientData) {
        if (clientName === "Aura Hub") {
          clientName = clientData.email.split("@")[0].toUpperCase();
        }
        const isTrial = clientData.status === 'trial';
        const isExpired = isTrial && clientData.trialEndsAt && (Date.now() > clientData.trialEndsAt);
        const isSuspended = clientData.status === 'suspended';

        if (isExpired || isSuspended) {
          return {
            track: {
              url: "",
              title: "LICENCIA EXPIRADA",
              folder: "none",
              clientName: clientName
            },
            visuals: {
              backgroundUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1920",
              backgroundType: "image",
              quote: isSuspended ? "EMISIÓN SUSPENDIDA POR IMPAGO" : "PERIODO DE PRUEBA FINALIZADO",
              category: "CONTACTA CON SOPORTE PARA ACTIVAR AURA",
              ticker: []
            },
            timestamp: now.toISOString(),
            isBlocked: true
          };
        }
      }
    } catch (error) {
      console.error("D1 Fetch Error:", error);
    }
  }
  
  const hour = getMadridHour();
  const slot = currentSchedule.find(s => hour >= s.start && hour < s.end) || DEFAULT_SCHEDULE[3];
  const defaultSlot = DEFAULT_SCHEDULE.find(s => hour >= s.start && hour < s.end) || DEFAULT_SCHEDULE[3];
  const folder = forcedFolder || slot.folder || defaultSlot.folder;
  const manifestFolder = folder === 'live' ? 'sunset' : folder;
  const category = forcedCategory || (isGlobal ? "MODO GLOBAL ACTIVO" : slot.category || defaultSlot.category);
  
  // Use category to pick a group from QUOTES_DB, fallback to SOCIAL if category is missing
  const quotesGroup = QUOTES_DB[category] || QUOTES_DB.SOCIAL || [slot.quote || defaultSlot.quote];
  // We need a stable random seed based on slot + skip logic so the quote rotates naturally but stays consistent across fast refresh
  const rotationSeed = (currentSlotIndex * 7) + (skipCount * 13) + (manifestFolder.length * 31);
  const quoteIndex = rotationSeed % quotesGroup.length;
  const dynamicQuote = quotesGroup[quoteIndex];

  const quote = forcedQuote || dynamicQuote;

  // Fetch from R2 with support for comma-separated folders
  const folders = manifestFolder.split(',').map(f => f.trim());
  let availableTracks = []; // Array of { file: string, folder: string }
  for (const f of folders) {
    try {
      const tracks = await getTracksFromR2(env, f);
      if (tracks && tracks.length > 0) {
        for (const t of tracks) {
          availableTracks.push({ file: t, folder: f });
        }
      }
    } catch (e) {
      console.error(`Failed to get tracks for folder: ${f}`, e);
    }
  }

  // Fallback if no tracks found
  if (availableTracks.length === 0) {
    const fallbackTracks = await getTracksFromR2(env, "sunset");
    for (const t of fallbackTracks) {
      availableTracks.push({ file: t, folder: "sunset" });
    }
  }

  let selectedTrack;

  if (skip) {
    let tracksToPickFrom = availableTracks;
    if (exclude && availableTracks.length > 1) {
      tracksToPickFrom = availableTracks.filter(t => !exclude.includes(t.file));
      if (tracksToPickFrom.length === 0) tracksToPickFrom = availableTracks;
    }
    const finalIndex = rotationSeed % tracksToPickFrom.length;
    selectedTrack = tracksToPickFrom[finalIndex];
  } else {
    const finalIndex = rotationSeed % availableTracks.length;
    selectedTrack = availableTracks[finalIndex];
  }

  const trackFile = selectedTrack.file;
  const trackFolder = selectedTrack.folder;
  const cleanName = trackFile.replace(/\.mp3$/i, '');
  let trackUrl = `${R2_MEDIA_BASE}${trackFolder}/${trackFile}`;
  let foundVideo = false;

  const videoBucket = env.AURA_VIDEO_LIBRARY;
  if (videoBucket) {
    try {
      const mp4Key = `${trackFolder}/${cleanName}.mp4`;
      const headMp4 = await videoBucket.head(mp4Key);
      if (headMp4) {
        trackUrl = `https://video.auradisplay.es/${mp4Key}`;
        foundVideo = true;
      } else {
        const webmKey = `${trackFolder}/${cleanName}.webm`;
        const headWebm = await videoBucket.head(webmKey);
        if (headWebm) {
          trackUrl = `https://video.auradisplay.es/${webmKey}`;
          foundVideo = true;
        }
      }
    } catch (e) {
      console.error("AURA_VIDEO_LIBRARY head check failed:", e);
    }
  }

  if (!foundVideo) {
    const bucket = env.AURA_MEDIA_LIBRARY || env.AUDIO_BUCKET;
    if (bucket) {
      try {
        const mp4Key = `visualizer/${trackFolder}/${cleanName}.mp4`;
        const headMp4 = await bucket.head(mp4Key);
        if (headMp4) {
          trackUrl = `${R2_MEDIA_BASE}${mp4Key}`;
          foundVideo = true;
        } else {
          const webmKey = `visualizer/${trackFolder}/${cleanName}.webm`;
          const headWebm = await bucket.head(webmKey);
          if (headWebm) {
            trackUrl = `${R2_MEDIA_BASE}${webmKey}`;
            foundVideo = true;
          }
        }
      } catch (e) {
        console.error("R2 audio bucket video check failed:", e);
      }
    }
  }

  const bgIndex = rotationSeed % BACKGROUNDS.length;

  let promoFlash = null;
  if (!isGlobal && env.DB) {
    try {
      const displayData = await env.DB.prepare("SELECT promoFlashText, promoFlashExpiresAt FROM displays WHERE id = ?").bind(clientId).first();
      if (displayData) {
        promoFlash = resolveActivePromo(displayData.promoFlashText, displayData.promoFlashExpiresAt, h, m, dayOfWeek);
      }
    } catch (e) {}
  }

  return {
    track: {
      url: trackUrl,
      title: trackFile.replace(/\.mp3$/, '').replace(/_/g, ' ').toUpperCase(),
      folder: folder,
      clientName: clientName
    },
    visuals: {
      backgroundUrl: BACKGROUNDS[bgIndex],
      backgroundType: "image",
      quote: quote,
      quotes: quotesGroup,
      category: category,
      ticker: []
    },
    promoFlash: promoFlash,
    timestamp: now.toISOString()
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Aura-Force-Refresh"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathParts = url.pathname.split('/');
  let clientId = pathParts[pathParts.length - 1] || 'global';

  if (clientId !== 'global' && env.DB) {
    try {
      let resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(clientId).first();
      if (!resolvedUser) {
        resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(clientId).first();
      }
      if (!resolvedUser) {
        const variations = [
          clientId.replace(/l/g, 'I'),
          clientId.replace(/I/g, 'l'),
          clientId.toLowerCase(),
          clientId.toUpperCase()
        ];
        for (const variant of variations) {
          if (variant === clientId) continue;
          resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUser) break;
          resolvedUser = await env.DB.prepare("SELECT id FROM users WHERE slug = ? AND email NOT LIKE 'deleted_%'").bind(variant).first();
          if (resolvedUser) break;
        }
      }
      if (resolvedUser) {
        clientId = resolvedUser.id;
      }
    } catch (e) {
      console.error("Slug resolution error in session:", e);
    }
  }

  const isSkip = url.searchParams.get('skip') === 'true';
  const forceFolder = url.searchParams.get('forceFolder');
  const exclude = url.searchParams.get('exclude');
  const skipCount = parseInt(url.searchParams.get('skipCount') || '0');
  const isDynamicRequest = isSkip || forceFolder || exclude;

  // Cache checks
  const kv = env.AURA_KV || env.AURA_STATE;
  if (kv && !isDynamicRequest) {
    try {
      const edgeManifest = await kv.get(`manifest:${clientId}`);
      if (edgeManifest) {
        const parsed = JSON.parse(edgeManifest);
        if (parsed && parsed.visuals) {
          return new Response(edgeManifest, {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    } catch (e) {}
  }

  try {
    const manifest = await computeAuraManifest(env, clientId, isSkip, exclude, skipCount, forceFolder);
    const manifestStr = JSON.stringify(manifest);

    if (kv && !isDynamicRequest) {
      context.waitUntil(kv.put(`manifest:${clientId}`, manifestStr, { expirationTtl: 300 }));
    }

    return new Response(manifestStr, {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
