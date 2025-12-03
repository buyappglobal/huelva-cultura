
import { EventType } from '../types';

/**
 * Convierte un array de eventos a formato CSV y fuerza la descarga del archivo en el navegador.
 * Este método es 100% fiable y no requiere configuración de servidores externos.
 */
export const exportEventsToCSV = (events: EventType[]): void => {
  // 1. Definir cabeceras
  const headers = [
    'ID',
    'Título',
    'Pueblo',
    'Fecha Inicio',
    'Fecha Fin',
    'Categoría',
    'Destacado',
    'URL Imagen',
    'Descripción'
  ];

  // 2. Convertir datos a filas CSV (Usamos punto y coma ; que es el estándar para Excel en español)
  const rows = events.map(event => {
    return [
      // TRUCO EXCEL: Añadimos \t (tabulador) al inicio para forzar que Excel trate el ID como TEXTO y no como número científico
      `"\t${event.id}"`, 
      `"${cleanString(event.title)}"`,
      `"${cleanString(event.town)}"`,
      event.date,
      event.endDate || '',
      `"${event.category}"`,
      event.sponsored ? 'SÍ' : 'NO',
      `"${event.imageUrl || ''}"`,
      `"${cleanString(event.description).substring(0, 100)}..."` // Descripción truncada
    ].join(';');
  });

  // 3. Unir cabeceras y filas con saltos de línea
  const csvContent = [headers.join(';'), ...rows].join('\n');

  // 4. Crear Blob con BOM para soporte de tildes/eñes en Excel (UTF-8 con BOM)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 5. Crear enlace temporal y forzar descarga
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `agenda_sierra_navidad_${timestamp}.csv`);
  
  document.body.appendChild(link);
  link.click();
  
  // 6. Limpieza
  document.body.removeChild(link);
};

// Helper para limpiar strings (escapar comillas dobles que rompen el CSV)
const cleanString = (str: string): string => {
  if (!str) return '';
  // Reemplazar comillas dobles por comillas simples o dobles escapadas ("")
  return str.replace(/"/g, '""').replace(/\n/g, ' '); 
};

// Mantenemos la firma antigua por compatibilidad si es necesario, pero redirigimos a la nueva
export const syncAllEventsToSheet = async (events: EventType[], onProgress?: (current: number, total: number) => void): Promise<void> => {
    // Simulamos un pequeño progreso para UX
    if (onProgress) onProgress(50, 100);
    await new Promise(r => setTimeout(r, 500));
    
    exportEventsToCSV(events);
    
    if (onProgress) onProgress(100, 100);
};
