
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { EventType, EventCategory } from '../types';
import { townCoordinates } from '../data/townCoordinates';

// Leaflet is loaded from a script in index.html, so we declare it here to satisfy TypeScript
declare const L: any;

interface EventMapProps {
    events: EventType[];
    onSelectEvent: (eventId: string) => void;
}

// Hex codes matching the Tailwind classes used in the app
const categoryColorMap: Record<EventCategory, string> = {
  [EventCategory.PUEBLO_DESTACADO]: '#0d9488', // teal-600
  [EventCategory.BELEN_VIVIENTE]: '#16a34a', // green-600
  [EventCategory.CAMPANILLEROS]: '#ca8a04', // yellow-600
  [EventCategory.CABALGATA]: '#9333ea', // purple-600
  [EventCategory.FIESTA]: '#dc2626', // red-600
  [EventCategory.MERCADO]: '#2563eb', // blue-600
  [EventCategory.FERIA_GASTRONOMICA]: '#ea580c', // orange-600
  [EventCategory.OTRO]: '#475569', // slate-600
};

const createCustomIcon = (category: EventCategory, count: number) => {
    const color = count > 1 ? '#f59e0b' : (categoryColorMap[category] || '#475569'); // Amber if multiple, else category color
    
    // Notification Badge for count > 1
    const badge = count > 1 
        ? `<div style="position: absolute; top: -8px; right: -8px; background-color: #ef4444; color: white; border-radius: 9999px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;">${count}</div>` 
        : '';

    // SVG Pin Icon with dynamic color
    const svgIcon = `
      <div style="position: relative; width: 100%; height: 100%;">
        ${badge}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" style="width: 100%; height: 100%; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07));">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `;

    return L.divIcon({
        className: 'custom-map-marker', // Ensure this class doesn't override relative positioning
        html: svgIcon,
        iconSize: [40, 40], // Slightly larger
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
};

const EventMap: React.FC<EventMapProps> = ({ events, onSelectEvent }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any | null>(null);
    const markersRef = useRef<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Group events by Town ID (or Name if ID not available, but logic uses name in coords)
    const groupedEvents = useMemo(() => {
        const groups: Record<string, EventType[]> = {};
        events.filter(e => !e.externalUrl).forEach(event => {
            if (!groups[event.town]) {
                groups[event.town] = [];
            }
            groups[event.town].push(event);
        });
        return groups;
    }, [events]);

    // Initialize map effect
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                scrollWheelZoom: true 
            });

            const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            });

            tileLayer.on('loading', () => setIsLoading(true));
            tileLayer.on('load', () => setIsLoading(false));
            tileLayer.on('tileerror', () => setIsLoading(false));

            tileLayer.addTo(map);
            mapRef.current = map;
        }
    }, []);

    // Effect to render markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const timer = setTimeout(() => {
            map.invalidateSize();

            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            const markerBounds: [number, number][] = [];

            Object.entries(groupedEvents).forEach(([townName, townEvents]) => {
                const eventsList = townEvents as EventType[];
                const coords = townCoordinates[townName];
                if (coords) {
                    const count = eventsList.length;
                    // Use the category of the first event for color, or generic if mixed (handled in icon creator)
                    const mainCategory = eventsList[0].category;
                    const customIcon = createCustomIcon(mainCategory, count);

                    // --- GENERATE POPUP CONTENT ---
                    let popupContent = '';

                    if (count === 1) {
                        // SINGLE EVENT POPUP
                        const event = eventsList[0];
                        popupContent = `
                            <div class="p-1 font-sans min-w-[200px]">
                                <span class="inline-block px-2 py-0.5 text-[10px] font-bold text-white rounded-full mb-2" style="background-color: ${categoryColorMap[event.category] || '#64748b'}">
                                    ${event.category}
                                </span>
                                <h3 class="font-bold text-base leading-tight mb-1 text-slate-900 dark:text-white">${event.title}</h3>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mb-3">${event.town}</p>
                                <button id="popup-btn-${event.id}" class="w-full bg-amber-400 text-slate-900 text-xs font-bold py-2 px-2 rounded hover:bg-amber-500 transition-colors shadow-sm">
                                    Ver Detalles
                                </button>
                            </div>
                        `;
                    } else {
                        // MULTI EVENT POPUP (LIST)
                        const listHtml = eventsList.map(event => `
                            <div class="mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 last:border-0 last:mb-0 last:pb-0">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style="background-color: ${categoryColorMap[event.category] || '#64748b'}">
                                        ${event.category}
                                    </span>
                                </div>
                                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight mb-1">${event.title}</h4>
                                <button id="popup-btn-${event.id}" class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                                    Ver evento →
                                </button>
                            </div>
                        `).join('');

                        popupContent = `
                            <div class="p-1 font-sans min-w-[220px]">
                                <h3 class="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                                    ${townName} <span class="ml-1 text-xs font-normal text-slate-500">(${count} eventos)</span>
                                </h3>
                                <div class="max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    ${listHtml}
                                </div>
                            </div>
                        `;
                    }

                    const marker = L.marker(coords, { icon: customIcon })
                        .addTo(map)
                        .bindPopup(popupContent, { minWidth: 220, maxHeight: 300 });

                    // Attach event listeners when popup opens
                    marker.on('popupopen', () => {
                        eventsList.forEach(event => {
                            const button = document.getElementById(`popup-btn-${event.id}`);
                            if (button) {
                                button.onclick = (e) => {
                                    e.stopPropagation(); // Prevent map click
                                    onSelectEvent(event.id);
                                };
                            }
                        });
                    });

                    markersRef.current.push(marker);
                    markerBounds.push(coords);
                }
            });

            if (markerBounds.length > 1) { 
                map.fitBounds(markerBounds, { padding: [50, 50], maxZoom: 14 });
            } else if (markerBounds.length === 1) { 
                map.setView(markerBounds[0], 13); 
            } else {
                map.setView([37.9, -6.7], 9);
            }
        }, 150); 

        return () => clearTimeout(timer);

    }, [groupedEvents, onSelectEvent]);

    return (
        <div className="h-full w-full relative">
            <div ref={mapContainerRef} className="h-full w-full bg-slate-200 dark:bg-slate-800" />
            
            {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-[1001] pointer-events-none animate-fade-in">
                    <div className="text-center p-4">
                         <svg className="animate-spin h-10 w-10 text-amber-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-slate-600 dark:text-slate-300 mt-4 text-lg font-display">Cargando mapa...</p>
                    </div>
                </div>
            )}
            
            {!isLoading && Object.keys(groupedEvents).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-[1000] pointer-events-none animate-fade-in">
                    <div className="text-center p-4 bg-white/80 dark:bg-slate-800/80 rounded-lg shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 font-display">No hay eventos que mostrar</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Prueba a seleccionar otros filtros.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventMap;
