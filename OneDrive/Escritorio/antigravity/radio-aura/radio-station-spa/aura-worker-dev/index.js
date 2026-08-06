import { SignJWT, jwtVerify } from 'jose';

/**
 * CLOUDFLARE WORKER - RADIO AURA API (R2 + KV)
 * 
 * Requisitos:
 * 1. Un bucket R2 enlazado a la variable: MY_R2_BUCKET
 * 2. Un espacio KV enlazado a la variable: AURA_CONFIG_KV
 * 
 * Este worker provee el listado de canciones desde R2 y guarda la 
 * configuración del Panel de Control en KV de forma persistente.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Email, X-User-Role, Range, Accept",
  "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length, Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Manejo de Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. Endpoint para Guardar Configuración (Panel de Administración)
    if (path === "/api/admin/save-config" && request.method === "POST") {
      try {
        // Validación básica de seguridad (Opcional: mejorar con JWT)
        const userEmail = request.headers.get("X-User-Email");
        if (!userEmail) {
          return new Response(JSON.stringify({ error: "No autorizado" }), { 
            status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        const configData = await request.json();
        
        // Guardar la configuración en KV bajo la clave 'global_config'
        await env.AURA_CONFIG_KV.put('global_config', JSON.stringify(configData));

        return new Response(JSON.stringify({ success: true, message: "Configuración guardada en KV" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 1.5 Endpoint para Mover una Canción de Carpeta / Categoría
    if (path === "/api/admin/move-song" && request.method === "POST") {
      try {
        const userEmail = request.headers.get("X-User-Email");
        if (!userEmail) {
          return new Response(JSON.stringify({ error: "No autorizado" }), { 
            status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        const { songId, targetFolder } = await request.json();
        if (!songId || !targetFolder) {
          return new Response(JSON.stringify({ error: "Parámetros inválidos" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        if (!env.MUSIC_BUCKET) {
          return new Response(JSON.stringify({ error: "R2 no configurado" }), { 
            status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        const oldKey = songId;
        const filename = oldKey.split("/").pop();
        const newFolder = targetFolder.endsWith('/') ? targetFolder : `${targetFolder}/`;
        const newKey = `${newFolder}${filename}`;

        if (oldKey === newKey) {
          return new Response(JSON.stringify({ success: true, message: "La canción ya está en esa carpeta", newId: newKey }), {
            status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS }
          });
        }

        const object = await env.MUSIC_BUCKET.get(oldKey);
        if (!object) {
          return new Response(JSON.stringify({ error: "Objeto no encontrado en R2" }), { 
            status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        await env.MUSIC_BUCKET.put(newKey, object.body, {
          httpMetadata: object.httpMetadata,
          customMetadata: object.customMetadata
        });

        await env.MUSIC_BUCKET.delete(oldKey);

        if (env.DB) {
          try {
            await env.DB.prepare("UPDATE song_ratings SET song_id = ? WHERE song_id = ?").bind(newKey, oldKey).run();
          } catch (dbErr) {
            console.error("Error updating ratings in DB:", dbErr);
          }
        }

        try {
          const storedConfig = await env.AURA_CONFIG_KV.get('global_config');
          if (storedConfig) {
            const config = JSON.parse(storedConfig);
            let updated = false;

            if (config.customSongNames && config.customSongNames[oldKey]) {
              config.customSongNames[newKey] = config.customSongNames[oldKey];
              delete config.customSongNames[oldKey];
              updated = true;
            }

            if (config.songSponsors && config.songSponsors[oldKey]) {
              config.songSponsors[newKey] = config.songSponsors[oldKey];
              delete config.songSponsors[oldKey];
              updated = true;
            }

            if (updated) {
              await env.AURA_CONFIG_KV.put('global_config', JSON.stringify(config));
            }
          }
        } catch (kvErr) {
          console.error("Error updating config in KV:", kvErr);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Canción movida con éxito", 
          oldId: oldKey, 
          newId: newKey,
          newUrl: `${new URL(request.url).origin}/api/stream/music/${encodeURIComponent(newKey)}`
        }), {
          status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 1.7 Endpoint para Subir una Canción a R2
    if (path === "/api/admin/upload-song" && request.method === "POST") {
      try {
        const userEmail = request.headers.get("X-User-Email");
        if (!userEmail) {
          return new Response(JSON.stringify({ error: "No autorizado" }), { 
            status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        // X-File-Name content might contain URL encoded string from client
        const rawFileName = request.headers.get("X-File-Name");
        const folder = request.headers.get("X-Folder") || "";
        const contentType = request.headers.get("Content-Type") || "audio/mpeg";

        if (!rawFileName) {
          return new Response(JSON.stringify({ error: "Falta el nombre del archivo en la cabecera X-File-Name" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        const fileName = decodeURIComponent(rawFileName);

        if (!env.MUSIC_BUCKET) {
          return new Response(JSON.stringify({ error: "R2 no configurado" }), { 
            status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
          });
        }

        const cleanFolder = folder.endsWith('/') ? folder : (folder ? `${folder}/` : '');
        const key = `${cleanFolder}${fileName}`;

        const fileData = await request.arrayBuffer();
        
        await env.MUSIC_BUCKET.put(key, fileData, {
          httpMetadata: { contentType: contentType }
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Canción subida con éxito", 
          id: key,
          url: `${new URL(request.url).origin}/api/stream/music/${encodeURIComponent(key)}`
        }), {
          status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 2. Endpoint para Listar Canciones y Configuración: /api/list
    if (path === "/api/list" && request.method === "GET") {
      try {
        const carpeta = url.searchParams.get("carpeta") || "";
        
        // 2.1 Recuperar Configuración Global de KV
        let globalConfig = {};
        try {
          const storedConfig = await env.AURA_CONFIG_KV.get('global_config');
          if (storedConfig) {
            globalConfig = JSON.parse(storedConfig);
          }
        } catch (e) {
          console.warn("No se pudo leer KV o está vacío", e);
        }

        // 2.2 Listar canciones de R2 con paginación
        let songs = [];
        if (env.MUSIC_BUCKET) {
          const prefix = (carpeta && !carpeta.endsWith("/")) ? `${carpeta}/` : carpeta;
          
          let options = {
            prefix: prefix,
            delimiter: "/",
          };
          
          let allObjects = [];
          let listComplete = false;

          while (!listComplete) {
            const objects = await env.MUSIC_BUCKET.list(options);
            allObjects.push(...objects.objects);
            
            if (objects.truncated) {
              options.cursor = objects.cursor;
            } else {
              listComplete = true;
            }
          }
          
          songs = allObjects
            .filter(obj => obj.key.endsWith(".mp3") || obj.key.endsWith(".m4a") || obj.key.endsWith(".wav"))
            .map(obj => {
              const filename = obj.key.split("/").pop();
              const origin = new URL(request.url).origin;
              const streamUrl = `${origin}/api/stream/music/${encodeURIComponent(obj.key)}`; 
              
              return {
                id: obj.key,
                title: filename.replace(/\.[^/.]+$/, ""),
                artist: "Aura Radio",
                streamUrl: streamUrl,
                folder: carpeta
              };
            });
        }

        const responsePayload = {
          ...globalConfig,
          songs: songs
        };

        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 3. Endpoint para Listar Carpetas Base en R2 con paginación
    if (path === "/api/admin/folders" && request.method === "GET") {
      try {
        if (!env.MUSIC_BUCKET) throw new Error("R2 no configurado para música");
        
        let options = { delimiter: "/" };
        let allFolders = new Set();
        let listComplete = false;

        while (!listComplete) {
          const objects = await env.MUSIC_BUCKET.list(options);
          objects.delimitedPrefixes.forEach(prefix => allFolders.add(prefix));
          
          if (objects.truncated) {
            options.cursor = objects.cursor;
          } else {
            listComplete = true;
          }
        }

        const folders = Array.from(allFolders);

        return new Response(JSON.stringify(folders), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 4. Endpoint para Listar Cuñas de Publicidad en R2 con paginación
    if (path === "/api/admin/ads" && request.method === "GET") {
      try {
        if (!env.ADS_BUCKET) throw new Error("R2 no configurado para anuncios");
        
        const prefixParam = url.searchParams.get("prefix") || "";
        let options = {};
        let allObjects = [];
        let listComplete = false;

        while (!listComplete) {
          const objects = await env.ADS_BUCKET.list(options);
          allObjects.push(...objects.objects);
          
          if (objects.truncated) {
            options.cursor = objects.cursor;
          } else {
            listComplete = true;
          }
        }

        let adsObjects = allObjects
            .filter(obj => obj.key.endsWith(".mp3") || obj.key.endsWith(".m4a") || obj.key.endsWith(".wav"));

        if (prefixParam) {
          const folderPrefix = prefixParam.endsWith("/") ? prefixParam : `${prefixParam}/`;
          adsObjects = adsObjects.filter(obj => 
            obj.key.startsWith(folderPrefix) || !obj.key.includes("/")
          );
        }

        const ads = adsObjects.map(obj => obj.key);

        return new Response(JSON.stringify(ads), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // 5. Endpoints para servir el audio directamente
    if (path.startsWith("/api/stream/music/") && request.method === "GET") {
      try {
        const key = decodeURIComponent(path.replace("/api/stream/music/", ""));
        const object = await env.MUSIC_BUCKET.get(key);
        if (!object) return new Response("Not found", { status: 404, headers: CORS_HEADERS });
        
        const headers = new Headers(CORS_HEADERS);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Accept-Ranges', 'bytes');
        return new Response(object.body, { headers });
      } catch (error) {
        return new Response("Error", { status: 500, headers: CORS_HEADERS });
      }
    }

    if (path.startsWith("/api/stream/ads/") && request.method === "GET") {
      try {
        const key = decodeURIComponent(path.replace("/api/stream/ads/", ""));
        const object = await env.ADS_BUCKET.get(key);
        if (!object) return new Response("Not found", { status: 404, headers: CORS_HEADERS });
        
        const headers = new Headers(CORS_HEADERS);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Accept-Ranges', 'bytes');
        return new Response(object.body, { headers });
      } catch (error) {
        return new Response("Error", { status: 500, headers: CORS_HEADERS });
      }
    }

    // Boletines proxy: fetch from boletines.auraradio.es with CORS headers
    if (path.startsWith("/api/stream/boletines/") && request.method === "GET") {
      try {
        const filePath = decodeURIComponent(path.replace("/api/stream/boletines/", ""));
        const upstreamUrl = `https://boletines.auraradio.es/${filePath}`;
        const proxyRes = await fetch(upstreamUrl, {
          headers: { "User-Agent": "AuraRadioWorker/1.0" }
        });
        if (!proxyRes.ok) {
          return new Response("Boletín not found", { status: proxyRes.status, headers: CORS_HEADERS });
        }
        const responseHeaders = new Headers(CORS_HEADERS);
        let mimeType = proxyRes.headers.get("Content-Type");
        if (!mimeType || mimeType.includes("text/plain") || mimeType.includes("application/octet-stream")) {
          if (filePath.endsWith(".wav")) mimeType = "audio/wav";
          else if (filePath.endsWith(".mp3")) mimeType = "audio/mpeg";
          else if (filePath.endsWith(".m4a")) mimeType = "audio/mp4";
          else if (filePath.endsWith(".ogg")) mimeType = "audio/ogg";
          else mimeType = "audio/mpeg";
        }
        responseHeaders.set("Content-Type", mimeType);
        const cl = proxyRes.headers.get("Content-Length");
        if (cl) responseHeaders.set("Content-Length", cl);
        responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return new Response(proxyRes.body, { status: 200, headers: responseHeaders });
      } catch (error) {
        return new Response("Boletín proxy error", { status: 500, headers: CORS_HEADERS });
      }
    }


    // 6. AUTHENTICATION & USER MANAGEMENT ENDPOINTS
    
    // 6.1 Initiate Google OAuth
    if (path === "/auth/google" && request.method === "GET") {
      const clientId = env.GOOGLE_CLIENT_ID;
      if (!clientId) return new Response("Google OAuth not configured", { status: 500, headers: CORS_HEADERS });
      
      const redirectUri = `${url.origin}/auth/callback`;
      const scope = "email profile";
      
      // Allow dynamic redirect_to from query params, fallback to env or origin
      const redirectTo = url.searchParams.get("redirect_to") || env.FRONTEND_URL || url.origin;
      const stateObj = {
        csrf: crypto.randomUUID(),
        redirectTo: redirectTo
      };
      // Encode state as base64 to ensure it passes through safely
      const state = btoa(JSON.stringify(stateObj));

      const prompt = url.searchParams.get("prompt") || "";
      let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&access_type=offline`;
      if (prompt) {
        authUrl += `&prompt=${encodeURIComponent(prompt)}`;
      }
      
      return Response.redirect(authUrl, 302);
    }

    // 6.2 Google OAuth Callback
    if (path === "/auth/callback" && request.method === "GET") {
      try {
        const code = url.searchParams.get("code");
        const stateStr = url.searchParams.get("state");
        if (!code) return new Response("No code provided", { status: 400 });

        const clientId = env.GOOGLE_CLIENT_ID;
        const clientSecret = env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${url.origin}/auth/callback`;

        // Parse state to get the correct frontend redirect URL
        let frontendUrl = env.FRONTEND_URL || url.origin;
        try {
          if (stateStr) {
            const stateObj = JSON.parse(atob(stateStr));
            if (stateObj.redirectTo) {
              frontendUrl = stateObj.redirectTo;
            }
          }
        } catch(e) {
          console.warn("Could not parse state parameter");
        }

        // Exchange code for token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
          })
        });
        
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("Failed to get access token");

        // Get user profile
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        
        const userData = await userRes.json();
        const { id: googleId, email, name, picture, locale } = userData;

        // Save or update user in D1
        const db = env.DB;
        const existingUser = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        
        let userId = existingUser ? existingUser.id : crypto.randomUUID();
        let isSuperAdmin = false;
        const SUPERADMIN_EMAILS = [
          "buyappglobal@gmail.com",
          "holasolonet@gmail.com",
          "huelvaturistea@gmail.com"
        ];
        
        if (!existingUser) {
          isSuperAdmin = SUPERADMIN_EMAILS.includes(email) ? 1 : 0;
          await db.prepare(
            "INSERT INTO users (id, email, name, picture, locale, provider, is_superadmin) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).bind(userId, email, name, picture, locale || 'es', 'google', isSuperAdmin).run();
        } else {
          isSuperAdmin = SUPERADMIN_EMAILS.includes(email) ? 1 : (existingUser.is_superadmin || 0);
          await db.prepare(
            "UPDATE users SET name = ?, picture = ?, is_superadmin = ? WHERE email = ?"
          ).bind(name, picture, isSuperAdmin, email).run();
        }

        // Generate JWT token
        const secret = new TextEncoder().encode(env.JWT_SECRET || 'fallback_secret_please_change_me');
        const jwt = await new SignJWT({ userId, email, isSuperAdmin: !!isSuperAdmin })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('30d')
          .sign(secret);

        // Redirect back to the frontend with token (or set a cookie)
        // Since SPA is usually on a different domain or same origin, we redirect to frontend origin
        return Response.redirect(`${frontendUrl}/?token=${jwt}`, 302);
      } catch (error) {
        return new Response(`Authentication Error: ${error.message}`, { status: 500 });
      }
    }

    // Helper to verify JWT
    const verifyAuth = async (req) => {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
      const token = authHeader.split(" ")[1];
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET || 'fallback_secret_please_change_me');
        const { payload } = await jwtVerify(token, secret);
        
        const SUPERADMIN_EMAILS = [
          "buyappglobal@gmail.com",
          "holasolonet@gmail.com",
          "huelvaturistea@gmail.com"
        ];
        // Asegurar que si el email está en la lista, se trate como superadmin sin importar lo que diga el token viejo
        payload.isSuperAdmin = SUPERADMIN_EMAILS.includes(payload.email) || payload.isSuperAdmin;
        
        return payload; // Returns { userId, email, isSuperAdmin }
      } catch (e) {
        return null;
      }
    };

    // 6.3 Get current user profile and favorites
    if (path === "/api/user" && request.method === "GET") {
      const authPayload = await verifyAuth(request);
      if (!authPayload || !authPayload.userId) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });

      try {
        const user = await env.DB.prepare("SELECT id, email, name, picture, favorites, preferences, is_superadmin FROM users WHERE id = ?").bind(authPayload.userId).first();
        if (!user) return new Response("User not found", { status: 404, headers: CORS_HEADERS });
        
        // Parse JSON strings
        user.favorites = JSON.parse(user.favorites || '[]');
        user.preferences = JSON.parse(user.preferences || '{}');
        
        return new Response(JSON.stringify(user), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // 6.4 Sync favorites
    if (path === "/api/favorites" && request.method === "POST") {
      const authPayload = await verifyAuth(request);
      if (!authPayload || !authPayload.userId) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
      const userId = authPayload.userId;

      try {
        const { favorites } = await request.json();
        if (!Array.isArray(favorites)) throw new Error("Favorites must be an array");

        await env.DB.prepare("UPDATE users SET favorites = ? WHERE id = ?").bind(JSON.stringify(favorites), userId).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // 6.5 Sync preferences
    if (path === "/api/user/preferences" && request.method === "POST") {
      const authPayload = await verifyAuth(request);
      if (!authPayload || !authPayload.userId) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
      const userId = authPayload.userId;

      try {
        const { preferences } = await request.json();
        if (typeof preferences !== 'object' || preferences === null) throw new Error("Preferences must be an object");

        await env.DB.prepare("UPDATE users SET preferences = ? WHERE id = ?").bind(JSON.stringify(preferences), userId).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // 6.6 Admin Get Users
    if (path === "/api/admin/users" && request.method === "GET") {
      const authPayload = await verifyAuth(request);
      if (!authPayload || !authPayload.isSuperAdmin) return new Response("Unauthorized - Superadmin only", { status: 403, headers: CORS_HEADERS });

      try {
        const users = await env.DB.prepare("SELECT id, email, name, picture, is_superadmin FROM users ORDER BY created_at DESC").all();
        return new Response(JSON.stringify(users.results), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // 6.6 Admin Toggle Role
    if (path === "/api/admin/users/role" && request.method === "POST") {
      const authPayload = await verifyAuth(request);
      if (!authPayload || !authPayload.isSuperAdmin) return new Response("Unauthorized - Superadmin only", { status: 403, headers: CORS_HEADERS });

      try {
        const { targetUserId, isSuperAdmin } = await request.json();
        if (!targetUserId) throw new Error("Target user ID required");
        
        // Prevent removing oneself (holasolonet@gmail.com) just in case
        if (targetUserId === authPayload.userId && !isSuperAdmin) {
           throw new Error("No puedes quitarte el rol a ti mismo");
        }

        await env.DB.prepare("UPDATE users SET is_superadmin = ? WHERE id = ?").bind(isSuperAdmin ? 1 : 0, targetUserId).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }
    // Endpoint para Populares (combina ratings de favoritos + reacciones del LiveView)
    if (path === "/api/songs/popular" && request.method === "GET") {
      try {
        // Asegurarnos de que la tabla de reacciones existe
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS song_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id TEXT NOT NULL,
            reaction TEXT NOT NULL,
            weight REAL NOT NULL DEFAULT 0.5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        ).run().catch(() => {});

        // Score final = favoritos (peso 5 por usuario) + reacciones ponderadas por emoji
        const { results } = await env.DB.prepare(`
          SELECT song_id, SUM(score) as score FROM (
            -- Favoritos: cada usuario que favoriteó suma 5 puntos
            SELECT song_id, SUM(rating) * 5 as score
            FROM song_ratings
            GROUP BY song_id
            UNION ALL
            -- Reacciones: suma de pesos de los emojis recibidos
            SELECT song_id, SUM(weight) as score
            FROM song_reactions
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY song_id
          )
          GROUP BY song_id
          HAVING score > 0
          ORDER BY score DESC
          LIMIT 100
        `).all();
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Endpoint para Reacciones del LiveView (❤️ 🔥 ✨ 👏)
    if (path === "/api/songs/react" && request.method === "POST") {
      try {
        // Asegurarnos de que la tabla existe
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS song_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id TEXT NOT NULL,
            reaction TEXT NOT NULL,
            weight REAL NOT NULL DEFAULT 0.5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        ).run().catch(() => {});

        const body = await request.json();
        const { song_id, reaction } = body;
        if (!song_id || !reaction) {
          return new Response(JSON.stringify({ error: "Parámetros inválidos" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
        }

        // Peso ponderado por tipo de acción / reacción
        // Compartir (rango fuerte) = 5.0 | Favorito = 3.0 | Me gusta/Emoji = 1.5 | Escucha = 0.5
        const REACTION_WEIGHTS = {
          'share': 5.0,
          'favorite': 3.0,
          'like': 1.5,
          'play': 0.5,
          '❤️': 1.0,
          '🔥': 1.5,
          '✨': 0.8,
          '👏': 1.2,
        };
        const weight = REACTION_WEIGHTS[reaction] || 0.5;

        // Rate limiting por IP: máximo 1 reacción cada 3 segundos por canción
        const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
        const ipKey = `react_${clientIp}_${song_id}`;
        let rateLimited = false;
        try {
          const lastReact = await env.AURA_CONFIG_KV.get(ipKey);
          if (lastReact) {
            const elapsed = Date.now() - parseInt(lastReact, 10);
            if (elapsed < 3000) rateLimited = true;
          }
          if (!rateLimited) {
            await env.AURA_CONFIG_KV.put(ipKey, Date.now().toString(), { expirationTtl: 10 });
          }
        } catch (e) { /* KV rate limit fallo silencioso */ }

        if (rateLimited) {
          return new Response(JSON.stringify({ success: true, rateLimited: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
        }

        await env.DB.prepare(
          "INSERT INTO song_reactions (song_id, reaction, weight) VALUES (?, ?, ?)"
        ).bind(song_id, reaction, weight).run();

        return new Response(JSON.stringify({ success: true, weight, reaction }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Endpoint para Votar Canciones
    if (path === "/api/songs/rate" && request.method === "POST") {
      const user = await verifyAuth(request);
      if (!user) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
      try {
        const body = await request.json();
        const { song_id, rating } = body;
        if (!song_id || typeof rating !== 'number') throw new Error("Invalid payload");
        
        // Rate Limiting (10 seconds cooldown)
        const { results: lastVote } = await env.DB.prepare(
          "SELECT (strftime('%s', 'now') - strftime('%s', MAX(created_at))) as seconds_since FROM song_ratings WHERE user_id = ?"
        ).bind(user.userId).all();
        
        const secondsSince = lastVote[0]?.seconds_since;
        if (secondsSince !== null && secondsSince < 10) {
          return new Response(JSON.stringify({ error: "Demasiado rápido. Espera unos segundos antes de volver a votar." }), { status: 429, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
        }

        if (rating === 0) {
          await env.DB.prepare("DELETE FROM song_ratings WHERE user_id = ? AND song_id = ?").bind(user.userId, song_id).run();
        } else {
          await env.DB.prepare(
            "INSERT INTO song_ratings (user_id, song_id, rating) VALUES (?, ?, ?) ON CONFLICT(user_id, song_id) DO UPDATE SET rating = excluded.rating, created_at = CURRENT_TIMESTAMP"
          ).bind(user.userId, song_id, rating).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Endpoint para Obtener Votos del Usuario
    if (path === "/api/songs/my-ratings" && request.method === "GET") {
      const user = await verifyAuth(request);
      if (!user) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
      try {
        const { results } = await env.DB.prepare("SELECT song_id, rating FROM song_ratings WHERE user_id = ?").bind(user.userId).all();
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Compartir Canción (Open Graph)
    if (path.startsWith("/s/") && request.method === "GET") {
      const songId = decodeURIComponent(path.replace("/s/", ""));
      const songTitle = songId.split('/').pop().replace(/\.[^/.]+$/, "");
      const origin = url.searchParams.get("origin") || "https://appradio.aurabusiness.es";
      const appUrl = `${origin}/?play=${encodeURIComponent(songId)}`;
      const imageUrl = "https://cdn.aurabusiness.es/banner-ia.png";

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${songTitle} - Aura Radio</title>
  <meta property="og:title" content="${songTitle} - Aura Radio" />
  <meta property="og:description" content="Escucha esta canción en Aura Radio." />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${appUrl}" />
  <meta property="og:type" content="music.song" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${appUrl}" />
  <script>window.location.href = "${appUrl}";</script>
</head>
<body style="background:#09090b; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Redirigiendo a Aura Radio...</p>
</body>
</html>`;
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8", ...CORS_HEADERS } });
    }

    // --- LIVE MESSAGES ENDPOINTS ---

    // Helper function to get Spain local time
    function getSpainLocalTime() {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(new Date());
      const dateParts = {};
      for (const part of parts) {
        dateParts[part.type] = part.value;
      }
      
      const year = parseInt(dateParts.year);
      const month = parseInt(dateParts.month);
      const day = parseInt(dateParts.day);
      const hour = parseInt(dateParts.hour);
      const minute = parseInt(dateParts.minute);
      
      return { year, month, day, hour, minute };
    }

    // Helper function to convert Date to YYYY-MM-DD in Spain timezone
    function getSpainDateStr(date) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(date);
      const dateParts = {};
      for (const part of parts) {
        dateParts[part.type] = part.value;
      }
      return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    }

    // Helper function to determine the current Spain slot
    function getSpainSlotInfo() {
      const { year, month, day, hour } = getSpainLocalTime();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let slot = 'night';
      if (hour >= 6 && hour < 12) {
        slot = 'morning';
      } else if (hour >= 12 && hour < 20) {
        slot = 'afternoon';
      }
      
      let slotDateStr = dateStr;
      if (hour < 6) {
        const prevDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Europe/Madrid',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(prevDay);
        const dateParts = {};
        for (const part of parts) {
          dateParts[part.type] = part.value;
        }
        slotDateStr = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      }
      
      return {
        dateStr,
        slotDateStr,
        hour,
        slot,
        slotKey: `${slotDateStr}-${slot}`
      };
    }
    
    // User submits a greeting message
    if (path === "/api/messages" && request.method === "POST") {
      try {
        const user = await verifyAuth(request);
        if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: CORS_HEADERS });
        const data = await request.json();
        const msgId = crypto.randomUUID();
        const userName = user.name || data.userName || "Anónimo";
        // Check for max length
        if (!data.text || data.text.length > 80) {
          return new Response(JSON.stringify({ error: "Texto demasiado largo o vacío" }), { status: 400, headers: CORS_HEADERS });
        }
        await env.DB.prepare(
          "INSERT INTO live_messages (id, user_id, user_name, text, status) VALUES (?, ?, ?, ?, 'pending')"
        ).bind(msgId, user.userId, userName, data.text).run();
        
        return new Response(JSON.stringify({ success: true, message: "Mensaje enviado a moderación" }), { status: 201, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Admin fetches pending and approved messages
    if (path === "/api/admin/messages" && request.method === "GET") {
      try {
        const user = await verifyAuth(request);
        if (!user || !user.isSuperAdmin) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: CORS_HEADERS });
        
        // Fetch all pending messages
        const pendingRes = await env.DB.prepare(
          "SELECT * FROM live_messages WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50"
        ).all();
        
        // Fetch all approved messages that are active (single pass or not expired)
        const approvedRes = await env.DB.prepare(
          "SELECT * FROM live_messages WHERE status = 'approved' AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY created_at ASC LIMIT 50"
        ).all();
        
        return new Response(JSON.stringify({
          pending: pendingRes.results || [],
          approved: approvedRes.results || []
        }), { status: 200, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Admin updates message status (approved or rejected)
    if (path.startsWith("/api/admin/messages/") && request.method === "POST") {
      try {
        const user = await verifyAuth(request);
        if (!user || !user.isSuperAdmin) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: CORS_HEADERS });
        
        const parts = path.split('/');
        const id = parts[4];
        const data = await request.json(); // { status: 'approved' | 'rejected', durationMinutes?: number, scheduleType?: string }
        
        if (data.status !== 'approved' && data.status !== 'rejected') {
          return new Response(JSON.stringify({ error: "Estado inválido" }), { status: 400, headers: CORS_HEADERS });
        }
        
        if (data.status === 'approved') {
          let scheduleType = data.scheduleType || 'once';
          let scheduleConfig = null;
          let expiresAtStr = null;
          
          if (scheduleType === 'once' && data.durationMinutes > 0) {
            scheduleType = 'duration';
          }
          
          if (scheduleType === 'custom_today_tomorrow_1h' || scheduleType === 'custom_today_tomorrow_slots') {
            const d1 = new Date();
            const d2 = new Date();
            d2.setDate(d2.getDate() + 1);
            
            const day1Str = getSpainDateStr(d1);
            const day2Str = getSpainDateStr(d2);
            
            scheduleConfig = JSON.stringify({
              approved_at: d1.toISOString(),
              day1: day1Str,
              day2: day2Str
            });
            
            if (scheduleType === 'custom_today_tomorrow_1h') {
              expiresAtStr = `+26 hours`; // Active today + tomorrow (24h later + 1h), so 26 hours is safe
            } else {
              expiresAtStr = `+38 hours`; // Active today + tomorrow slots. Tomorrow night slot ends around 36h from now, so 38h is safe
            }
            
            await env.DB.prepare(
              "UPDATE live_messages SET status = 'approved', schedule_type = ?, schedule_config = ?, shown_slots = '[]', expires_at = datetime('now', ?) WHERE id = ?"
            ).bind(scheduleType, scheduleConfig, expiresAtStr, id).run();
            
          } else if (scheduleType === 'duration' && data.durationMinutes) {
            await env.DB.prepare(
              "UPDATE live_messages SET status = 'approved', schedule_type = 'duration', expires_at = datetime('now', ?), schedule_config = NULL, shown_slots = '[]' WHERE id = ?"
            ).bind(`+${data.durationMinutes} minutes`, id).run();
          } else {
            await env.DB.prepare(
              "UPDATE live_messages SET status = 'approved', schedule_type = 'once', expires_at = NULL, schedule_config = NULL, shown_slots = '[]' WHERE id = ?"
            ).bind(id).run();
          }
        } else {
          // Rejected
          await env.DB.prepare(
            "UPDATE live_messages SET status = ? WHERE id = ?"
          ).bind(data.status, id).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // App fetches all active approved messages
    if (path === "/api/messages/active" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM live_messages WHERE status = 'approved' AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY created_at ASC"
        ).all();
        
        const activeMessages = [];
        const nowMs = Date.now();
        const spainSlot = getSpainSlotInfo();
        
        for (const msg of results) {
          const type = msg.schedule_type || 'once';
          
          if (type === 'once') {
            // Active if not shown yet
            if (msg.shown_at === null) {
              activeMessages.push({
                id: msg.id,
                text: msg.text,
                user_name: msg.user_name,
                expires_at: msg.expires_at
              });
            }
          } else if (type === 'duration') {
            // Active if not expired (already checked in query, but double-check)
            activeMessages.push({
              id: msg.id,
              text: msg.text,
              user_name: msg.user_name,
              expires_at: msg.expires_at
            });
          } else if (type === 'custom_today_tomorrow_1h') {
            // Parse schedule_config
            try {
              const config = JSON.parse(msg.schedule_config);
              const approvedMs = new Date(config.approved_at).getTime();
              const oneHourMs = 60 * 60 * 1000;
              const oneDayMs = 24 * 60 * 60 * 1000;
              
              const inTodayWindow = nowMs >= approvedMs && nowMs <= approvedMs + oneHourMs;
              const inTomorrowWindow = nowMs >= approvedMs + oneDayMs && nowMs <= approvedMs + oneDayMs + oneHourMs;
              
              if (inTodayWindow || inTomorrowWindow) {
                activeMessages.push({
                  id: msg.id,
                  text: msg.text,
                  user_name: msg.user_name,
                  expires_at: msg.expires_at
                });
              }
            } catch (e) {
              console.error("Error parsing custom config for message:", msg.id, e);
            }
          } else if (type === 'custom_today_tomorrow_slots') {
            // Parse schedule_config
            try {
              const config = JSON.parse(msg.schedule_config);
              const validSlots = [
                `${config.day1}-morning`, `${config.day1}-afternoon`, `${config.day1}-night`,
                `${config.day2}-morning`, `${config.day2}-afternoon`, `${config.day2}-night`
              ];
              
              let shownSlotsList = [];
              try {
                shownSlotsList = JSON.parse(msg.shown_slots || '[]');
              } catch (e) {}
              
              const isSlotValid = validSlots.includes(spainSlot.slotKey);
              const isNotShownYet = !shownSlotsList.includes(spainSlot.slotKey);
              
              if (isSlotValid && isNotShownYet) {
                activeMessages.push({
                  id: msg.id,
                  text: msg.text,
                  user_name: msg.user_name,
                  expires_at: msg.expires_at
                });
              }
            } catch (e) {
              console.error("Error parsing custom slots config for message:", msg.id, e);
            }
          }
        }
        
        return new Response(JSON.stringify({ messages: activeMessages }), { status: 200, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // App marks a single-pass message or slot as shown after finishing
    if (path.startsWith("/api/messages/") && path.endsWith("/shown") && request.method === "POST") {
      try {
        const parts = path.split('/');
        const id = parts[3];
        
        const msg = await env.DB.prepare(
          "SELECT * FROM live_messages WHERE id = ?"
        ).bind(id).first();
        
        if (!msg) {
          return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404, headers: CORS_HEADERS });
        }
        
        const type = msg.schedule_type || 'once';
        
        if (type === 'custom_today_tomorrow_slots') {
          const spainSlot = getSpainSlotInfo();
          let shownSlotsList = [];
          try {
            shownSlotsList = JSON.parse(msg.shown_slots || '[]');
          } catch(e) {}
          
          if (!shownSlotsList.includes(spainSlot.slotKey)) {
            shownSlotsList.push(spainSlot.slotKey);
            await env.DB.prepare(
              "UPDATE live_messages SET shown_slots = ? WHERE id = ?"
            ).bind(JSON.stringify(shownSlotsList), id).run();
          }
        } else if (type === 'once') {
          await env.DB.prepare(
            "UPDATE live_messages SET status = 'shown', shown_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'approved'"
          ).bind(id).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Endpoint para disparar la auto-generación de boletín con IA manualmente desde servidor
    if (path === "/api/admin/trigger-ai-bulletin" && request.method === "POST") {
      try {
        const result = await generateAndSaveAiBulletin(env);
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    return new Response("AURA RADIO API - Ready. Use /api/list to fetch data.", { 
      status: 200, headers: CORS_HEADERS 
    });
  },

  // Cron Trigger Automático en Cloudflare: Se ejecuta headless sin navegador abierto
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateAndSaveAiBulletin(env));
  }
};

/**
 * Generador Automático de Boletines con IA Headless (Cloudflare Worker)
 * Busca noticias de Huelva con Gemini API + Google Search y sintetiza voz con ElevenLabs API.
 * Guarda el archivo resultante en R2 (aura-boletines/boletines/boletin_latest.mp3).
 */
async function generateAndSaveAiBulletin(env) {
  try {
    console.log('🤖 Iniciando ciclo de auto-generación de boletín con IA en Cloudflare Worker...');
    const rawConfig = await env.AURA_CONFIG_KV.get('global_config');
    if (!rawConfig) {
      return { success: false, reason: 'No se encontró global_config en KV' };
    }

    const config = JSON.parse(rawConfig);
    const bConfig = config.boletines_config || config.boletinesConfig;

    if (!bConfig || !bConfig.aiEnabled) {
      console.log('⏸️ Auto-generación de boletín con IA desactivada en la configuración.');
      return { success: false, reason: 'Auto-generación desactivada' };
    }

    const geminiKey = bConfig.geminiApiKey || env.GEMINI_API_KEY;
    const elevenKey = bConfig.elevenLabsApiKey || env.ELEVENLABS_API_KEY;

    if (!geminiKey || !elevenKey) {
      console.warn('⚠️ Faltan API Keys (Gemini o ElevenLabs) en la configuración.');
      return { success: false, reason: 'Faltan API Keys' };
    }

    // 1. Redacción de noticias con Gemini API + Google Search Grounding
    const promptText = bConfig.customPrompt || `Eres el redactor jefe y locutor principal de Aura Radio (Huelva). 
Busca las noticias más destacadas de HOY en la provincia de Huelva y redacta un boletín informativo de radio directo, fresco y profesional.

Estructura obligatoria del boletín (duración estimada: 90 segundos, unas 200-240 palabras):
1. Saludo breve: "Noticias en Aura Radio. Saludos de la redacción informativa..."
2. Noticia de la Sierra de Huelva: Actualidad reciente de la Sierra de Aracena y Picos de Aroche / Jabugo.
3. Noticia Provincial: Noticia destacada de la provincia o capital onubense.
4. Noticia Deportiva: Actualidad del Recreativo de Huelva o deporte local.
5. El Tiempo: Pronóstico del tiempo para el día de hoy en Huelva.
6. Cierre: "Toda la información al minuto en Aura Radio. Seguimos con más música."

REGLAS CRÍTICAS DE LOCUCIÓN PARA ELEVENLABS (SISTEMA TTS):
1. PROHIBIDO SÍMBOLOS MARKDOWN: No uses asteriscos, símbolos # ni acotaciones entre paréntesis o corchetes.
2. PROHIBIDO NÚMEROS ROMANOS: Escribe siempre los números romanos con palabras (ej: escribe 'siglo veintiuno' en vez de XXI, 'Felipe sexto' en vez de Felipe VI).
3. TELÉFONOS Y EMERGENCIAS: Escribe los teléfonos o emergencias dígito a dígito (ej: el 112 escríbelo como 'uno uno dos').
4. ABREVIATURAS Y SIGLAS: Escribe las palabras completas (ej: 'autovía A cuarenta y nueve' en vez de A-49, 'doctor' en vez de Dr., 'kilómetros' en vez de km).
5. PUNTUACIÓN Y RITMO: Usa comas y puntos para marcar las pausas naturales de respiración del locutor.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const resGemini = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ google_search: {} }]
      })
    });

    if (!resGemini.ok) {
      const errTxt = await resGemini.text();
      throw new Error(`Gemini API Error (${resGemini.status}): ${errTxt}`);
    }

    const dataGemini = await resGemini.json();
    const scriptText = dataGemini.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!scriptText) throw new Error('Gemini no devolvió texto válido');

    const cleanedScript = scriptText.replace(/[\*\_]/g, '').replace(/^#+\s+/gm, '').trim();

    // 2. Selección de Voz de ElevenLabs (Rotación)
    const voices = bConfig.elevenLabsVoices && bConfig.elevenLabsVoices.length > 0 
      ? bConfig.elevenLabsVoices 
      : [{ id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' }];

    let selectedVoiceId = voices[0].id;
    if (voices.length > 1) {
      if (bConfig.voiceRotationMode === 'random') {
        const randIdx = Math.floor(Math.random() * voices.length);
        selectedVoiceId = voices[randIdx].id;
      } else {
        const currentHour = new Date().getUTCHours();
        selectedVoiceId = voices[currentHour % voices.length].id;
      }
    }

    // 3. Sintetizar Voz con ElevenLabs API
    const resEleven = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: cleanedScript,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.85 }
      })
    });

    if (!resEleven.ok) {
      const errTxt = await resEleven.text();
      throw new Error(`ElevenLabs API Error (${resEleven.status}): ${errTxt}`);
    }

    const audioArrayBuffer = await resEleven.arrayBuffer();

    // 4. Guardar archivo MP3 resultante en R2 (BOLETIN_BUCKET o MUSIC_BUCKET)
    const targetBucket = env.BOLETIN_BUCKET || env.MUSIC_BUCKET;
    if (targetBucket) {
      await targetBucket.put('boletines/boletin_latest.mp3', audioArrayBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' }
      });
      console.log('✅ MP3 del boletín guardado en R2 correctamente.');
    }

    // 5. Actualizar registro y timestamp en KV
    const nowIso = new Date().toISOString();
    bConfig.lastGeneratedAt = nowIso;
    bConfig.lastGeneratedScript = cleanedScript;
    config.boletines_config = bConfig;
    config.boletinesConfig = bConfig;

    await env.AURA_CONFIG_KV.put('global_config', JSON.stringify(config));

    return {
      success: true,
      timestamp: nowIso,
      voiceId: selectedVoiceId,
      script: cleanedScript
    };
  } catch (err) {
    console.error('❌ Error en generateAndSaveAiBulletin:', err.message);
    return { success: false, error: err.message };
  }
}


