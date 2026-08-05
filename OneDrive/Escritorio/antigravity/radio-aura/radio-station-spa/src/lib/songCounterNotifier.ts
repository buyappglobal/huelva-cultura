import { Category } from '../types';

const STORAGE_KEY = 'aura_known_song_counts';
const TOTAL_STORAGE_KEY = 'aura_total_song_count';

interface SongCountsMap {
  [key: string]: number;
}

/**
 * Registra y compara la cantidad de canciones por categoría/carpeta en R2.
 * Si se detectan más canciones de las conocidas en una categoría,
 * genera automáticamente una notificación de aviso a la marquesina.
 */
export function checkAndNotifyCategorySongs(category: Category | undefined, currentCount: number) {
  if (!category || currentCount <= 0) return;

  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY);
    const knownCounts: SongCountsMap = rawSaved ? JSON.parse(rawSaved) : {};
    const prevCount = knownCounts[category.id];

    if (prevCount !== undefined && currentCount > prevCount) {
      const diff = currentCount - prevCount;
      const catName = category.alias || category.name;
      
      const messageText = diff === 1
        ? `✨ ¡Nueva composición añadida a "${catName}"! Disponible ahora en Aura Radio.`
        : `🎉 ¡${diff} nuevas composiciones añadidas a "${catName}"! Ya disponibles en la emisión.`;

      // Disparar mensaje autómata a la marquesina global
      window.dispatchEvent(
        new CustomEvent('aura-system-msg', {
          detail: {
            text: messageText,
            user_name: 'AURA NOVEDADES'
          }
        })
      );
    }

    // Actualizar el recuento guardado para esta categoría
    knownCounts[category.id] = currentCount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(knownCounts));

    // Calcular y actualizar total global acumulado
    const total = Object.values(knownCounts).reduce((acc, val) => acc + val, 0);
    localStorage.setItem(TOTAL_STORAGE_KEY, String(total));
  } catch (e) {
    console.warn('[SongCounterNotifier] Error checking song counts:', e);
  }
}

/**
 * Devuelve las estadísticas globales del catálogo (total de temas y novedades)
 */
export function getCatalogStats(): { totalSongs: number; categoriesCount: number } {
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY);
    const knownCounts: SongCountsMap = rawSaved ? JSON.parse(rawSaved) : {};
    const categoriesCount = Object.keys(knownCounts).length;
    const totalSongs = Object.values(knownCounts).reduce((acc, val) => acc + val, 0);

    return {
      totalSongs: totalSongs > 0 ? totalSongs : 142, // Fallback inicial dinámico
      categoriesCount: categoriesCount > 0 ? categoriesCount : 8
    };
  } catch {
    return { totalSongs: 142, categoriesCount: 8 };
  }
}
