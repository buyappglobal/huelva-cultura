import { API_CONFIG } from '../types';

/**
 * Envía errores del cliente al worker (/api/client-error) para que queden
 * registrados y entren en el resumen por email cada 6h. Diseñado para no
 * hacer nunca daño: no lanza, y se auto-limita para que un bug que dispara
 * en bucle no genere miles de peticiones.
 */

type ErrorKind = 'render' | 'promise' | 'window' | 'chunk' | 'api' | 'manual';

// Throttling en memoria (por pestaña abierta):
//  - no repetimos la misma firma dos veces,
//  - y ponemos un techo total por sesión, por si acaso.
const sentSignatures = new Set<string>();
let sentCount = 0;
const MAX_REPORTS_PER_SESSION = 40;

function currentTenant(): string {
  try {
    const host = window.location.hostname;
    if (host.endsWith('.appradio.aurabusiness.es')) return host.split('.')[0];
    const params = new URLSearchParams(window.location.search);
    return params.get('tenant') || host;
  } catch {
    return 'unknown';
  }
}

export function reportClientError(
  error: unknown,
  kind: ErrorKind = 'manual',
  extra?: { componentStack?: string }
): void {
  try {
    if (sentCount >= MAX_REPORTS_PER_SESSION) return;

    const err = error as any;
    const message = (err?.message || String(err) || 'Error desconocido').slice(0, 500);
    const stack = ((err?.stack || '') + (extra?.componentStack ? `\n--- component ---\n${extra.componentStack}` : '')).slice(0, 4000);
    const url = window.location.href;

    // Misma idea de firma que el worker, para no reenviar lo ya enviado.
    const signature = `${kind}|${message}|${(stack.split('\n')[0] || '').trim()}`;
    if (sentSignatures.has(signature)) return;
    sentSignatures.add(signature);
    sentCount++;

    // keepalive: permite que la petición sobreviva aunque la página se esté
    // descargando (típico cuando el error va seguido de un reload).
    fetch(`${API_CONFIG.BASE_URL}/api/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, url, tenant: currentTenant(), kind }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silencio absoluto: el reporte de errores jamás puede provocar otro error.
  }
}

/**
 * Instala los manejadores globales una sola vez: errores no capturados,
 * promesas rechazadas y —caso importante tras un despliegue— el fallo al
 * cargar un chunk de JS que ya no existe en la versión nueva, que se
 * resuelve recargando la página una vez.
 */
let installed = false;
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    const isChunkError = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
    if (isChunkError) {
      reportClientError(event.error || new Error(msg), 'chunk');
      // Un único auto-reload limpio para pillar la versión nueva; el flag
      // evita bucles si el problema persistiera.
      if (!sessionStorage.getItem('aura_chunk_reloaded')) {
        sessionStorage.setItem('aura_chunk_reloaded', '1');
        window.location.reload();
      }
      return;
    }
    reportClientError(event.error || new Error(msg), 'window');
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event?.reason || new Error('Promesa rechazada sin capturar'), 'promise');
  });

  // Si la app cargó bien, limpiamos el flag de recuperación de chunk.
  window.addEventListener('load', () => {
    try { sessionStorage.removeItem('aura_chunk_reloaded'); } catch {}
  });
}
