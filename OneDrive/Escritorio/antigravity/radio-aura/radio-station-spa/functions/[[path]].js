export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  // 0. Static assets in /assets/ served strictly via ASSETS binding
  if (url.pathname.startsWith('/assets/')) {
    if (context.env && context.env.ASSETS) {
      try {
        const assetRes = await context.env.ASSETS.fetch(request);
        const ct = assetRes?.headers?.get('content-type') || '';
        if (assetRes && assetRes.status === 200 && !ct.includes('text/html')) {
          return assetRes;
        }
      } catch (e) {}
    }
    
    // If it's a JS file that is missing, return a recovery script to break SW cache loops
    if (url.pathname.endsWith('.js')) {
      const recoveryScript = `
        if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function(r) { for(var i=0; i<r.length; i++) r[i].unregister(); });
        if ('caches' in window) caches.keys().then(function(k) { for(var i=0; i<k.length; i++) caches.delete(k[i]); });
        if (!sessionStorage.getItem('aura_sw_recovered')) {
          sessionStorage.setItem('aura_sw_recovered', '1');
          setTimeout(function() { window.location.reload(true); }, 500);
        }
      `;
      return new Response(recoveryScript, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-cache, no-store' } });
    }
    
    return new Response('Asset Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
  }

  // 1. Intercept sitemap.xml requests
  if (url.pathname === '/sitemap.xml') {
    try {
      const configResponse = await fetch('https://aura-radio-api-v2.holasolonet.workers.dev/api/list?t=' + Date.now());
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const songs = configData.songs || (Array.isArray(configData) ? configData : []);
        const baseUrl = `https://${host}`;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

        songs.forEach(song => {
          const songId = song.id || song.key || song.file;
          if (songId) {
            const songUrl = `${baseUrl}/cancion/${encodeURIComponent(songId)}`;
            xml += `  <url>\n    <loc>${songUrl}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
          }
        });

        xml += `</urlset>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=3600"
          }
        });
      }
    } catch (e) {
      console.error("Sitemap generator error:", e);
    }
  }

  // 2. Intercept manifest.json requests
  if (url.pathname === '/manifest.json') {
    try {
      const configResponse = await fetch('https://aura-radio-api-v2.holasolonet.workers.dev/api/list?carpeta=');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const tenantsObj = configData.tenants || {};
        const tenants = Object.values(tenantsObj);
        
        let tenantId = url.searchParams.get('tenant') || '';
        let activeTenant = tenants.find(t => t.id === tenantId);
        
        if (!activeTenant) {
          activeTenant = tenants.find(t => t.domain === host && t.status === 'active');
        }
        if (!activeTenant && host.endsWith('.appradio.aurabusiness.es')) {
          const subdomain = host.split('.')[0];
          if (subdomain) {
            activeTenant = tenants.find(t => t.id === subdomain && t.status === 'active');
          }
        }
        
        const name = activeTenant ? activeTenant.name : 'AURA RADIO';
        const shortName = activeTenant ? activeTenant.name.substring(0, 12) : 'Aura Radio';
        const CDN_LOGO = 'https://cdn.aurabusiness.es/gemini-svg.webp';
        const logo = activeTenant?.logoUrl || activeTenant?.faviconUrl || CDN_LOGO;
        const accent = activeTenant?.accentColor || configData.accentColor || '#6366f1';
        
        const manifest = {
          "short_name": shortName,
          "name": name,
          "icons": [
            {
              "src": logo,
              "sizes": "192x192",
              "type": "image/png",
              "purpose": "any maskable"
            },
            {
              "src": logo,
              "sizes": "512x512",
              "type": "image/png",
              "purpose": "any maskable"
            }
          ],
          "start_url": activeTenant?.id ? `/${activeTenant.id}` : "/",
          "background_color": "#0a0a0f",
          "theme_color": accent,
          "display": "standalone",
          "orientation": "portrait"
        };
        
        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*"
          }
        });
      }
    } catch (e) {
      console.error("Dynamic manifest generator error:", e);
    }
  }

  const isSongPath = url.pathname.startsWith('/cancion/') || url.pathname.startsWith('/song/');
  const isCategoryPath = url.pathname.startsWith('/categoria/');
  const isShareablePath = isSongPath || isCategoryPath;

  // Skip other static media extension requests (but not share links, whose
  // ID may itself end in .mp3/etc. — those must fall through to the SPA)
  if (!isShareablePath && url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp3|mp4|webm)$/i)) {
    const assetRes = await next();
    const assetType = assetRes.headers.get('content-type') || '';
    if (assetRes.status === 404 || assetType.includes('text/html')) {
      return new Response('Asset Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }
    return assetRes;
  }

  let response;

  if (isShareablePath && context.env && context.env.ASSETS) {
    try {
      response = await context.env.ASSETS.fetch(new URL('/index.html', request.url));
    } catch (e) {
      response = await next();
    }
  } else {
    response = await next();
  }

  const contentType = response?.headers?.get("content-type");
  if (!response || !contentType || !contentType.includes("text/html")) {
    return response;
  }

  try {
    const configResponse = await fetch('https://aura-radio-api-v2.holasolonet.workers.dev/api/list?t=' + Date.now());
    if (!configResponse.ok) return response;

    const configData = await configResponse.json();
    const tenantsObj = configData.tenants || {};
    const tenants = Object.values(tenantsObj);
    const customSongNames = configData.customSongNames || {};
    
    let activeTenant = tenants.find(t => t.domain === host && t.status === 'active');
    if (!activeTenant && host.endsWith('.appradio.aurabusiness.es')) {
      const subdomain = host.split('.')[0];
      if (subdomain) {
        activeTenant = tenants.find(t => t.id === subdomain && t.status === 'active');
      }
    }
    if (!activeTenant) {
      activeTenant = {
        name: 'AURA RADIO',
        seoTitle: configData.seoTitle,
        seoDescription: configData.seoDescription,
        socialImage: configData.socialImage,
        faviconUrl: configData.faviconUrl
      };
    }

    let seoTitle = activeTenant.seoTitle || activeTenant.name;
    let seoDescription = activeTenant.seoDescription || `Escucha ${activeTenant.name} en directo.`;
    let socialImage = activeTenant.socialImage || activeTenant.logoUrl || 'https://api.dicebear.com/7.x/shapes/png?seed=AuraRadio';
    let faviconUrl = activeTenant.faviconUrl || activeTenant.logoUrl || '/favicon.ico';
    let canonicalUrl = `https://${host}${url.pathname}`;
    let jsonLdScript = null;

    if (isSongPath) {
      const rawPathId = url.pathname.replace(/^\/(cancion|song)\//, '');
      const decodedSongId = decodeURIComponent(rawPathId);
      
      const songCatalog = configData.song_catalog || {};
      const r2Map = configData.r2_key_to_id || {};
      const songs = configData.songs || (Array.isArray(configData) ? configData : []);

      const catalogEntry = songCatalog[decodedSongId] || songCatalog[rawPathId] || songCatalog[r2Map[decodedSongId]] || songCatalog[r2Map[rawPathId]];
      const targetSong = songs.find(s => (s.id === decodedSongId || s.key === decodedSongId || s.id === rawPathId));
      const customMeta = customSongNames[decodedSongId] || customSongNames[rawPathId] || {};

      const resolvedR2Key = catalogEntry?.r2_key || decodedSongId;
      const origFilename = (resolvedR2Key.split('/').pop() || resolvedR2Key).replace(/\.[^/.]+$/, "");
      
      const customTitle = customMeta.title || catalogEntry?.title || targetSong?.title || '';
      const artistName = customMeta.artist || catalogEntry?.artist || targetSong?.artist || activeTenant.name || 'Aura Radio';
      const lyrics = customMeta.lyrics || catalogEntry?.lyrics || targetSong?.lyrics || '';
      const meaning = customMeta.meaning || catalogEntry?.meaning || targetSong?.meaning || '';

      const displayTitle = customTitle || origFilename;
      const isDualTitle = customTitle && customTitle !== origFilename;
      
      seoTitle = isDualTitle 
        ? `${displayTitle} (${origFilename}) - ${artistName} | ${activeTenant.name}`
        : `${displayTitle} - ${artistName} | ${activeTenant.name}`;
      
      seoDescription = meaning 
        ? `${meaning.substring(0, 160)}... Escucha y lee la letra de ${displayTitle} en ${activeTenant.name}.`
        : `Escucha ${displayTitle} de ${artistName} en ${activeTenant.name}. Letra completa y reproductor en directo.`;

      if (targetSong?.coverUrl || targetSong?.artwork || customMeta?.coverUrl) {
        socialImage = targetSong?.coverUrl || targetSong?.artwork || customMeta?.coverUrl;
        if (!socialImage.startsWith('http')) socialImage = `https://${socialImage.replace(/^\//, '')}`;
      } else {
        socialImage = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(decodedSongId)}`;
      }

      // Convert SVG to PNG for Facebook/WhatsApp/Social Crawlers
      if (socialImage.includes('dicebear.com') && socialImage.includes('/svg?')) {
        socialImage = socialImage.replace('/svg?', '/png?');
      } else if (socialImage.endsWith('.svg')) {
        socialImage = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(decodedSongId)}`;
      }

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": displayTitle,
        "alternateName": isDualTitle ? origFilename : undefined,
        "byArtist": {
          "@type": "MusicGroup",
          "name": artistName
        },
        "url": canonicalUrl,
        "image": socialImage,
        "audio": targetSong?.streamUrl || `https://aura-radio-api-v2.holasolonet.workers.dev/api/stream/music/${encodeURIComponent(decodedSongId)}`,
        "description": meaning || seoDescription,
        "lyrics": lyrics ? {
          "@type": "Lyrics",
          "text": lyrics
        } : undefined
      };

      jsonLdScript = JSON.stringify(jsonLd);
    } else if (isCategoryPath) {
      const rawCategoryId = url.pathname.replace(/^\/categoria\//, '');
      const decodedCategoryId = decodeURIComponent(rawCategoryId);

      const categories = configData.categories || [];
      const targetCategory = categories.find(c => c.id === decodedCategoryId || c.id === rawCategoryId);
      const categoryName = targetCategory?.name || decodedCategoryId;

      seoTitle = `${categoryName} - ${activeTenant.name}`;
      seoDescription = `Descubre "${categoryName}" en ${activeTenant.name}: música creada con IA, streaming en directo y sin cortes.`;

      const categoryBanner = targetCategory?.sponsorBanners?.[0]?.image_url;
      if (categoryBanner) {
        socialImage = categoryBanner;
        if (!socialImage.startsWith('http')) socialImage = `https://${socialImage.replace(/^\//, '')}`;
      }
    }

    let rewriter = new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(seoTitle); }})
      .on('meta[name="description"]', { element(el) { el.setAttribute('content', seoDescription); }})
      .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', seoTitle); }})
      .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', seoDescription); }})
      .on('meta[property="og:image"]', { element(el) { el.setAttribute('content', socialImage); }})
      .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonicalUrl); }})
      .on('link[rel="icon"]', { element(el) { el.setAttribute('href', faviconUrl); }})
      .on('link[rel="apple-touch-icon"]', { element(el) { el.setAttribute('href', faviconUrl); }})
      .on('link[rel="manifest"]', { element(el) { 
        const tenantParam = activeTenant.id ? `?tenant=${activeTenant.id}` : '';
        el.setAttribute('href', `/manifest.json${tenantParam}`);
      }});

    rewriter = rewriter.on('head', {
      element(el) {
        if (jsonLdScript) {
          el.append(`<script type="application/ld+json">${jsonLdScript}</script>`, { html: true });
        }
        if (isShareablePath) {
          el.append(`<link rel="canonical" href="${canonicalUrl}" />`, { html: true });
        }
        el.append(`<meta property="og:type" content="${isSongPath ? 'music.song' : 'website'}" />`, { html: true });
        el.append(`<meta property="og:image:secure_url" content="${socialImage}" />`, { html: true });
        el.append(`<meta property="og:image:type" content="image/png" />`, { html: true });
        el.append(`<meta property="og:image:width" content="600" />`, { html: true });
        el.append(`<meta property="og:image:height" content="600" />`, { html: true });
        el.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true });
        el.append(`<meta name="twitter:title" content="${seoTitle}" />`, { html: true });
        el.append(`<meta name="twitter:description" content="${seoDescription}" />`, { html: true });
        el.append(`<meta name="twitter:image" content="${socialImage}" />`, { html: true });
      }
    });

    const finalResponse = rewriter.transform(response);
    if (isShareablePath) {
      // Share URLs must never be edge-cached: a song ID can itself end in
      // .mp3/.mp4/etc. and previously got misclassified as a static asset,
      // caching a 404 at the CDN edge and permanently breaking that share link.
      finalResponse.headers.set('Cache-Control', 'no-store');
    }
    return finalResponse;
  } catch (error) {
    console.error('Pages Function Error:', error);
  }

  return response;
}
