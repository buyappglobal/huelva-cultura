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
  const encodedId = songId.split('/').map(segment => encodeURIComponent(segment)).join('/');
  let path = `/cancion/${encodedId}`;

  // If using default main origin and running a custom tenant, preserve tenant parameter
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

  parts.push(shareUrl);

  return {
    title: isSameArtist ? `${title} - ${effectiveStationName}` : `${title} - ${artist}`,
    text: parts.join('\n'),
    url: shareUrl
  };
}

