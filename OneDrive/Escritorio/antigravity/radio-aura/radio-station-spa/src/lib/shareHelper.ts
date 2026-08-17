import { Song, TenantConfig } from '../types';

/**
 * Returns the base URL (origin or custom domain) for a given tenant configuration.
 */
export function getTenantBaseUrl(tenantConfig?: TenantConfig | null): string {
  if (!tenantConfig) return window.location.origin;

  // 1. Check for canonicalUrl
  if (tenantConfig.canonicalUrl && typeof tenantConfig.canonicalUrl === 'string' && tenantConfig.canonicalUrl.trim() !== '') {
    let url = tenantConfig.canonicalUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, '');
  }

  // 2. Check for domain
  if (tenantConfig.domain && typeof tenantConfig.domain === 'string' && tenantConfig.domain.trim() !== '') {
    let domain = tenantConfig.domain.trim();
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    return domain.replace(/\/+$/, '');
  }

  return window.location.origin;
}

/**
 * Constructs the canonical share URL for a song, respecting tenant domains & params.
 */
export function buildShareUrl(songOrId: string | Song, tenantConfig?: TenantConfig | null): string {
  const baseUrl = getTenantBaseUrl(tenantConfig);
  const songId = typeof songOrId === 'string' ? songOrId : songOrId.id;
  const numericId = typeof songOrId === 'string' ? undefined : songOrId.numericId;

  // El ID numérico del catálogo (sin espacios ni tildes) es preferible a la
  // ruta R2 tal cual: en Windows, el propio share nativo (navigator.share)
  // decodifica el %20 de la URL a espacio real antes de que WhatsApp la
  // reciba, cortando el enlace en el primer espacio. Un ID numérico no le
  // da ningún espacio que decodificar mal. Si la canción aún no tiene ID
  // numérico asignado, se mantiene el comportamiento de siempre.
  const encodedId = numericId
    ? encodeURIComponent(numericId)
    : songId.split('/').map(segment => encodeURIComponent(segment)).join('/');
  let path = `/cancion/${encodedId}`;

  // If using default main origin and running a custom tenant, preserve tenant parameter
  const hasCustomDomain = !!(tenantConfig?.canonicalUrl || tenantConfig?.domain);
  if (!hasCustomDomain && tenantConfig?.id && tenantConfig.id !== 'aura-radio') {
    path += `?tenant=${encodeURIComponent(tenantConfig.id)}`;
  }

  return `${baseUrl}${path}`;
}

/**
 * Constructs the canonical share URL for a category, respecting tenant domains & params.
 */
export function buildCategoryShareUrl(categoryId: string, tenantConfig?: TenantConfig | null): string {
  const baseUrl = getTenantBaseUrl(tenantConfig);
  const encodedId = encodeURIComponent(categoryId);
  let path = `/categoria/${encodedId}`;

  const hasCustomDomain = !!(tenantConfig?.canonicalUrl || tenantConfig?.domain);
  if (!hasCustomDomain && tenantConfig?.id && tenantConfig.id !== 'aura-radio') {
    path += `?tenant=${encodeURIComponent(tenantConfig.id)}`;
  }

  return `${baseUrl}${path}`;
}

/**
 * Constructs the share URL for the station main page.
 */
export function buildStationShareUrl(tenantConfig?: TenantConfig | null): string {
  const baseUrl = getTenantBaseUrl(tenantConfig);
  const hasCustomDomain = !!(tenantConfig?.canonicalUrl || tenantConfig?.domain);
  if (!hasCustomDomain && tenantConfig?.id && tenantConfig.id !== 'aura-radio') {
    return `${baseUrl}/?tenant=${encodeURIComponent(tenantConfig.id)}`;
  }
  return baseUrl;
}

export function buildShareMessage(
  song: Song,
  customMetadata?: { title?: string; artist?: string },
  stationName: string = 'Aura Radio',
  tenantConfig?: TenantConfig | null
) {
  const title = customMetadata?.title || song.title;
  const artist = customMetadata?.artist || song.artist;
  const effectiveStationName = tenantConfig?.name || stationName || 'Aura Radio';
  const shareUrl = buildShareUrl(song, tenantConfig);
  
  const isSameArtist = !artist || artist.toLowerCase().includes('huelva suena');
  let mainLine = isSameArtist 
    ? `🎵 Escucha "${title}" en ${effectiveStationName}!` 
    : `🎵 Escucha "${title}" de ${artist} en ${effectiveStationName}!`;

  const parts = [mainLine];

  const aiNoticeEnabled = tenantConfig?.shareAiNoticeEnabled !== false;
  const aiNotice = tenantConfig?.shareAiNotice ?? '✨ Música creada con IA';
  if (aiNoticeEnabled && aiNotice.trim()) {
    parts.push(aiNotice.trim());
  }

  const hashtags = tenantConfig?.shareHashtags ?? `#MúsicaIA #${effectiveStationName.replace(/\s+/g, '')} #IA #SunoAI`;
  if (hashtags && hashtags.trim()) {
    parts.push(hashtags.trim());
  }

  // La URL NO se mete dentro de "text": va en su propio campo "url", que es
  // justo para lo que existe en la Web Share API. Antes se incrustaba aquí
  // porque el enlace se duplicaba en WhatsApp — pero eso pasaba por mandar
  // la URL EN LOS DOS SITIOS a la vez (aquí dentro y en "url"). Quitando la
  // duplicación en el origen, WhatsApp añade su única copia igual (la lee de
  // "url"), y las apps que si necesitan un campo "url" de verdad — el share
  // sheet de Windows, Outlook, Teams — dejan de quedarse sin enlace.
  return {
    title: isSameArtist ? `${title} - ${effectiveStationName}` : `${title} - ${artist}`,
    text: parts.join('\n'),
    url: shareUrl
  };
}

export function buildCategoryShareMessage(
  categoryId: string,
  categoryName: string,
  stationName: string = 'Aura Radio',
  tenantConfig?: TenantConfig | null
) {
  const effectiveStationName = tenantConfig?.name || stationName || 'Aura Radio';
  const shareUrl = buildCategoryShareUrl(categoryId, tenantConfig);

  const mainLine = `🎧 Descubre "${categoryName}" en ${effectiveStationName}!`;
  const parts = [mainLine];

  const aiNoticeEnabled = tenantConfig?.shareAiNoticeEnabled !== false;
  const aiNotice = tenantConfig?.shareAiNotice ?? '✨ Música creada con IA';
  if (aiNoticeEnabled && aiNotice.trim()) {
    parts.push(aiNotice.trim());
  }

  const hashtags = tenantConfig?.shareHashtags ?? `#MúsicaIA #${effectiveStationName.replace(/\s+/g, '')} #IA #SunoAI`;
  if (hashtags && hashtags.trim()) {
    parts.push(hashtags.trim());
  }

  return {
    title: `${categoryName} - ${effectiveStationName}`,
    text: parts.join('\n'),
    url: shareUrl
  };
}

export async function executeShareMessage(
  shareData: { title: string; text: string; url: string },
  customSuccessToast?: string
) {
  const toastMsg = customSuccessToast || '¡Enlace copiado al portapapeles!';
  let nativeSuccess = false;

  // Se copia el texto descriptivo al portapapeles ANTES de abrir el share
  // nativo (no después): el share nativo le quita el foco a la página, y
  // conviene escribir en el portapapeles mientras la página aún lo tiene.
  // Es justo lo que pediste — Facebook descarta cualquier texto que le
  // mandemos por el share intent y solo se queda con el enlace, así que si
  // el portapapeles ya lleva el texto listo, en la publicación solo hay que
  // pegar. Aquí se copia SOLO el texto (sin URL): el enlace ya lo lleva el
  // propio share nativo hacia la app elegida, y repetirlo al pegar solo
  // estorbaría junto a la tarjeta que Facebook monta sola.
  let textCopiedBeforeShare = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard && shareData.text) {
    try {
      await navigator.clipboard.writeText(shareData.text);
      textCopiedBeforeShare = true;
    } catch (err) {
      console.warn('No se pudo copiar el texto de antemano:', err);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url
      });
      nativeSuccess = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aura-system-msg', {
          detail: {
            text: textCopiedBeforeShare
              ? '¡Compartido! El texto ya está en tu portapapeles — pégalo en la publicación si la red social no lo trae.'
              : '¡Compartido con éxito!',
            user_name: 'AURA SYSTEM'
          }
        }));
      }
    } catch (err: any) {
      console.warn('Native share cancelled or failed, falling back to clipboard copy:', err);
    }
  }

  if (!nativeSuccess && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      // Sin share nativo (no disponible, o cancelado) no hay ninguna app que
      // vaya a llevarse la URL por su cuenta, así que aquí sí hace falta
      // añadirla — se sobrescribe la copia de solo-texto de más arriba.
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aura-system-msg', {
          detail: { text: toastMsg, user_name: 'AURA SYSTEM' }
        }));
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  }
}

