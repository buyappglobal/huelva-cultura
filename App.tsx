
import React, { useState, useEffect, useMemo } from 'react';
import { ALL_EVENTS } from './data/events';
import { ADS } from './data/ads';
import { EventType } from './types';
import { ICONS, TOWNS, ENABLE_AI_SEARCH } from './constants';
import Header from './components/Header';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import EventCalendar from './components/EventCalendar';
import FilterSidebar from './components/FilterSidebar';
import FilterSidebarModal from './components/FilterSidebarModal';
import EventMapModal from './components/EventMapModal';
import ScrollToTopButton from './components/ScrollToTopButton';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import Hero from './components/Hero';
import CookieConsent from './components/CookieConsent';
import AddEventModal from './components/AddEventModal';
import LoginModal from './components/LoginModal';
import SuggestEventModal from './components/SuggestEventModal';
import AiAssistantModal from './components/AiAssistantModal';
import InstallPwaModal from './components/InstallPwaModal';
import Toast from './components/Toast';
import InfoAppModal from './components/InfoAppModal';
import FaqModal from './components/FaqModal';
import HowItWorksModal from './components/HowItWorksModal';
import EventCounter from './components/EventCounter';
import MenuModal from './components/MenuModal';
import ProvinceEventsModal from './components/ProvinceEventsModal';
import { analyzeSearchIntent } from './services/aiSearchService';
import { getEventMetrics } from './services/interactionService';
import { exportEventsToCSV } from './services/googleSheetsService';

// Helper for shuffling array
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

// --- LOGIC RESTORATION START ---
// 1. Process metrics for all items
const processedEvents = ALL_EVENTS.map(getEventMetrics);
const processedAds = ADS.map(getEventMetrics);

// 2. Separate Sponsored vs Regular
// Note: We treat ADS separately for injection, so we exclude them from 'sponsoredEvents' to avoid duplication if they were in ALL_EVENTS (they are not, but safe check)
const sponsoredEvents = processedEvents.filter(e => e.sponsored);
const regularEvents = processedEvents.filter(e => !e.sponsored);

// 3. Shuffle Sponsored Events (Randomize on load)
const shuffledSponsored = shuffleArray(sponsoredEvents);

// 4. Sort Regular Events by Date (Chronological)
const sortedRegular = regularEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

// 5. Combine: [Random Sponsored] + [Sorted Regular] + [Ads]
// We include Ads at the end initially; they will be repositioned during rendering.
const INITIAL_EVENTS = [...shuffledSponsored, ...sortedRegular, ...processedAds];
// --- LOGIC RESTORATION END ---

const App: React.FC = () => {
  // --- STATE ---
  const [events, setEvents] = useState<EventType[]>(INITIAL_EVENTS);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  
  // --- ROUTING LOGIC ---
  const parseRoute = () => {
      let initialTowns: string[] = [];
      let initialEventId: string | null = null;

      try {
          const hash = window.location.hash; // e.g. #/pueblo/aroche
          const params = new URLSearchParams(window.location.search); 
          
          // 1. Hash Routing (Priority) - /#/pueblo/ID o /#/evento/ID
          if (hash.includes('#/pueblo/')) {
              // Extract everything after #/pueblo/
              const parts = hash.split('#/pueblo/');
              if (parts.length > 1) {
                  const rawTown = decodeURIComponent(parts[1].split('/')[0]); // Handle trailing slash
                  const townEntry = TOWNS.find(t => 
                      t.id.toLowerCase() === rawTown.toLowerCase() || 
                      t.name.toLowerCase() === rawTown.toLowerCase()
                  );
                  if (townEntry) initialTowns = [townEntry.id];
              }
          } else if (hash.includes('#/evento/')) {
              const parts = hash.split('#/evento/');
              if (parts.length > 1) {
                  const eventId = decodeURIComponent(parts[1].split('/')[0]); // Handle trailing slash
                  if (INITIAL_EVENTS.some(e => e.id === eventId)) {
                      initialEventId = eventId;
                  }
              }
          } 
          // 2. Query Param Fallback (Legacy support for ?town=...)
          else if (params.get('town')) {
              const townParam = params.get('town')!;
              const townEntry = TOWNS.find(t => 
                  t.id.toLowerCase() === townParam.toLowerCase() || 
                  t.name.toLowerCase() === townParam.toLowerCase()
              );
              if (townEntry) initialTowns = [townEntry.id];
          } else if (params.get('event')) {
              const eventParam = params.get('event');
              if (eventParam && INITIAL_EVENTS.some(e => e.id === eventParam)) {
                  initialEventId = eventParam;
              }
          }
      } catch (err) {
          console.warn("Route parsing failed safely:", err);
      }

      return { initialTowns, initialEventId };
  };

  const routeData = parseRoute();

  const [selectedTowns, setSelectedTowns] = useState<string[]>(routeData.initialTowns);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(routeData.initialEventId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('date');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'attending'>('all');

  // UI State
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // Modals
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showProvinceEventsModal, setShowProvinceEventsModal] = useState(false);

  // Auth & Toast
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState<{ message: string; icon: React.ReactNode } | null>(null);

  // --- EFFECTS ---

  useEffect(() => {
    // Theme initialization
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    
    // Cookie consent check
    try {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
          setTimeout(() => setShowCookieConsent(true), 2000);
        }
    } catch (e) {}

    // Listen for Hash Changes (Back/Forward navigation)
    const handleHashChange = () => {
        const { initialTowns, initialEventId } = parseRoute();
        // Update state to match URL
        setSelectedTowns(initialTowns);
        setSelectedEventId(initialEventId);
        
        // Reset other filters if we navigate back to home (empty hash)
        if (initialTowns.length === 0 && !initialEventId && !window.location.hash.includes('#/')) {
            setSelectedCategories([]);
            setSearchQuery('');
            setStartDate(null);
            setEndDate(null);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync State to URL Hash (Enable sharing)
  useEffect(() => {
      try {
          // 1. Sync Event Detail URL
          if (selectedEventId) {
              const newHash = `#/evento/${selectedEventId}`;
              if (window.location.hash !== newHash) {
                  // Safe update for blob/preview environments
                  try {
                    window.history.replaceState(null, '', newHash);
                  } catch (e) {
                    // Fallback to simple hash assignment if replaceState is blocked
                    window.location.hash = newHash;
                  }
              }
              return;
          }

          // 2. Sync Town Filter URL
          // If we have selected exactly one town (and not viewing an event), update the URL
          if (selectedTowns.length === 1) {
              const townId = selectedTowns[0];
              const newHash = `#/pueblo/${townId}`;
              if (window.location.hash !== newHash) {
                  try {
                    window.history.replaceState(null, '', newHash);
                  } catch (e) {
                    window.location.hash = newHash;
                  }
              }
          } else if (selectedTowns.length === 0 && !selectedEventId) {
              // If no towns selected, clear specific hash if present
              if (window.location.hash.includes('#/pueblo/') || window.location.hash.includes('#/evento/')) {
                   const baseUrl = window.location.pathname + window.location.search;
                   try {
                        window.history.replaceState(null, '', baseUrl);
                   } catch (e) {
                        // If we can't clear it cleanly, just empty the hash
                        window.location.hash = '';
                   }
              }
          }
      } catch (err) {
          // Suppress errors in strict environments to prevent app crash
          console.debug("Routing sync suppressed in this environment.");
      }
  }, [selectedTowns, selectedEventId]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- HANDLERS ---

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToastMessage = (message: string, icon: React.ReactNode) => {
    setToast({ message, icon });
  };

  const handleLogin = (email: string, pass: string) => {
      // Mock login
      if (email === 'admin@huelvalate.es' && pass === 'sierra2025') {
          setIsLoggedIn(true);
          setShowLoginModal(false);
          showToastMessage("Sesión de administrador iniciada", ICONS.magic);
      } else {
          alert("Credenciales incorrectas");
      }
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      showToastMessage("Sesión cerrada", ICONS.logout);
  };

  const handleAddEvent = (newEventData: any) => {
      const newEvent: EventType = {
          ...newEventData,
          id: Date.now().toString(),
          views: 0,
          likes: 0,
          attendees: 0
      };
      setEvents(prev => [newEvent, ...prev]);
      setShowAddEventModal(false);
      showToastMessage("Evento añadido correctamente", ICONS.checkCircle);
  };

  const handleUpdateEvent = (updatedEvent: EventType) => {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleSearchChange = (query: string) => {
      setSearchQuery(query);
  };

  const handleAiSearch = async () => {
      if (!searchQuery.trim()) return;
      
      setIsAiSearching(true);
      // Try process.env first as per instructions, then session storage as fallback for existing behavior
      let apiKey = process.env.API_KEY;
      if (!apiKey) {
          try { apiKey = sessionStorage.getItem('gemini-api-key'); } catch(e) {}
      }
      
      if (!apiKey) {
          // Fallback: Open AI Assistant Modal to setup key or ask
          setShowAiAssistant(true);
          setIsAiSearching(false);
          return;
      }

      try {
          const result = await analyzeSearchIntent(searchQuery, apiKey);
          if (result) {
              if (result.townIds.length > 0) setSelectedTowns(result.townIds);
              if (result.categories.length > 0) setSelectedCategories(result.categories.map(c => c.toString()));
              
              showToastMessage("Búsqueda inteligente aplicada", ICONS.sparkles);
          } else {
              showToastMessage("No se pudo interpretar la búsqueda", ICONS.question);
          }
      } catch (e) {
          console.error(e);
          showToastMessage("Error en la búsqueda IA", ICONS.wifiOff);
      } finally {
          setIsAiSearching(false);
      }
  };

  // Logic to show install modal after closing an event
  const handleCloseDetail = () => {
      setSelectedEventId(null);
      // Remove hash from URL when closing detail without refreshing
      if (window.location.hash.includes('#/evento/')) {
          try {
            const baseUrl = window.location.pathname + window.location.search;
            // Restore town filter hash if one town was selected, otherwise clean
            if (selectedTowns.length === 1) {
                 const newHash = `#/pueblo/${selectedTowns[0]}`;
                 window.history.replaceState(null, '', newHash);
            } else {
                 window.history.replaceState(null, '', baseUrl);
            }
          } catch(e) {
             // Fallback
             window.location.hash = '';
          }
      }
      
      // 1. Check if app is running in Standalone mode (Already installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      
      // 2. Check if user has previously installed (Local Storage - Permanent flag)
      let hasInstalledStorage = false;
      try { hasInstalledStorage = localStorage.getItem('pwa_installed') === 'true'; } catch(e) {}

      // 3. Check if we have already shown the modal in THIS session (Session Storage - Temporary flag)
      let hasShownSession = false;
      try { hasShownSession = sessionStorage.getItem('pwa_prompt_shown_session') === 'true'; } catch(e) {}

      // Logic: Show only if NOT installed, NOT marked as installed, and NOT shown this session
      if (!isStandalone && !hasInstalledStorage && !hasShownSession) {
          setTimeout(() => {
              setShowInstallModal(true);
              // Mark as shown for this session immediately so it doesn't pop up again until tab refresh
              try { sessionStorage.setItem('pwa_prompt_shown_session', 'true'); } catch(e) {}
          }, 1500); // 1.5s delay for smooth transition after closing event
      }
  };

  // --- FILTERING & SORTING LOGIC ---

  const filteredEvents = useMemo(() => {
    // 1. Filter Pass
    const filtered = events.filter(event => {
      const isAd = event.id.startsWith('ad-');

      // Always allow Ads to pass text/town filters in 'all' view to ensure they appear in the feed
      if (isAd && filterType === 'all') return true;

      // Personal Lists Filters
      if (filterType === 'favorites') {
          if (!event.isFavorite) return false;
      }
      if (filterType === 'attending') {
          if (!event.isAttending) return false;
      }

      // 1. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchDesc = event.description.toLowerCase().includes(q);
        const matchTown = event.town.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTown) return false;
      }

      // 2. Town Filter
      if (selectedTowns.length > 0 && !selectedTowns.includes('all')) {
         const townObj = TOWNS.find(t => t.name === event.town);
         if (!townObj || !selectedTowns.includes(townObj.id)) return false;
      }

      // 3. Category Filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) {
          return false;
      }

      // 4. Date Filter
      if (startDate) {
          const eventStart = new Date(event.date);
          const filterStart = new Date(startDate);
          if (event.endDate) {
              const eventEnd = new Date(event.endDate);
              // Overlap logic
              if (eventEnd < filterStart) return false;
          } else {
              if (eventStart < filterStart) return false;
          }
      }
      
      if (endDate) {
          const eventStart = new Date(event.date);
          const filterEnd = new Date(endDate);
          if (eventStart > filterEnd) return false;
      }

      return true;
    });

    // 2. Sorting and Positioning Pass
    if (sortBy === 'date') {
        // Here we implement the "Sponsored First, then Date, with Ad at pos 4" logic
        
        // Separate content from ads
        const adsList = filtered.filter(e => e.id.startsWith('ad-'));
        const contentList = filtered.filter(e => !e.id.startsWith('ad-'));

        // Because 'events' (INITIAL_EVENTS) is already structure as [Shuffled Sponsored, Sorted Regular],
        // and .filter() preserves array order, 'contentList' ALREADY has the correct order.
        // We DO NOT want to run .sort() here because it would mix Sponsored and Regular based on date.
        
        const result = [...contentList];

        // Inject Ad at Position 4 (Index 3)
        if (adsList.length > 0) {
            const adToInject = adsList[0]; // Take the first available ad
            if (result.length >= 3) {
                result.splice(3, 0, adToInject);
            } else {
                // If list is short, append at end
                result.push(adToInject);
            }
        }

        return result;

    } else {
        // Popularity Sort
        // For popularity, we just sort by likes. Ads usually have 0 likes so they drop to bottom.
        return filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

  }, [events, searchQuery, selectedTowns, selectedCategories, startDate, endDate, sortBy, filterType]);

  const eventCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredEvents.forEach(e => {
          const t = TOWNS.find(town => town.name === e.town);
          if (t) {
              counts[t.id] = (counts[t.id] || 0) + 1;
          }
      });
      return counts;
  }, [filteredEvents]);

  const availableCategories = useMemo(() => {
      return Array.from(new Set(filteredEvents.map(e => e.category)));
  }, [filteredEvents]);

  const selectedEvent = useMemo(() => 
    selectedEventId ? events.find(e => e.id === selectedEventId) : null
  , [events, selectedEventId]);

  // --- RENDER ---

  if (selectedEvent) {
      return (
          <div className={theme}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-20">
                <div className="container mx-auto p-4">
                    <EventDetail 
                        event={selectedEvent} 
                        onBack={handleCloseDetail}
                        isLoggedIn={isLoggedIn}
                        onEdit={() => {/* TODO: Implement Edit Modal opening with event data */}}
                        onCategoryFilterClick={(cat) => { setSelectedCategories([cat]); setSelectedEventId(null); }}
                        showToast={showToastMessage}
                        onEngagement={() => {}}
                        onUpdateEvent={handleUpdateEvent}
                        allEvents={events} // NEW: Passing all events for related slider
                        onSelectEvent={setSelectedEventId} // NEW: Allow switching events from details
                    />
                </div>
                <BottomNav 
                    onHomeClick={handleCloseDetail}
                    onMenuClick={() => setShowMenuModal(true)}
                    onFaqClick={() => setShowFaqModal(true)}
                    onGuideClick={() => setShowGuideModal(true)}
                    onFilterClick={() => { setSelectedEventId(null); setIsFilterModalOpen(true); }}
                />
            </div>
            {toast && <Toast message={toast.message} icon={toast.icon} onClose={() => setToast(null)} />}
            {showMenuModal && (
                <MenuModal 
                    onClose={() => setShowMenuModal(false)}
                    onInstall={() => setShowInstallModal(true)}
                    onSuggest={() => setShowSuggestModal(true)}
                    toggleTheme={handleToggleTheme}
                    onInfo={() => setShowInfoModal(true)}
                    onProvinceEvents={() => setShowProvinceEventsModal(true)} // NEW
                    isPwaInstallable={true}
                    theme={theme}
                />
            )}
            {showProvinceEventsModal && (
                <ProvinceEventsModal onClose={() => setShowProvinceEventsModal(false)} />
            )}
            {showInstallModal && (
                <InstallPwaModal 
                    onClose={() => setShowInstallModal(false)}
                    onInstall={() => {
                        try { localStorage.setItem('pwa_installed', 'true'); } catch(e){}
                        setShowInstallModal(false);
                    }}
                />
            )}
            {showInfoModal && <InfoAppModal onClose={() => setShowInfoModal(false)} />}
            {showSuggestModal && <SuggestEventModal onClose={() => setShowSuggestModal(false)} />}
          </div>
      );
  }

  return (
    <div className={theme}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300 pb-20">
        <Header 
            view={view} 
            setView={setView} 
            isMapVisible={isMapVisible} 
            onMapClick={() => setIsMapVisible(true)}
            onHomeClick={() => {
                setSelectedTowns([]);
                setSelectedCategories([]);
                setSearchQuery('');
                setStartDate(null);
                setEndDate(null);
                try {
                    history.pushState("", document.title, window.location.pathname + window.location.search); // Clear hash
                } catch(e) {}
            }}
        />

        <main className="container mx-auto p-4 md:flex gap-8">
            {/* Sidebar Desktop */}
            <aside className="hidden md:block w-80 flex-shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                <FilterSidebar 
                    towns={TOWNS}
                    selectedTowns={selectedTowns}
                    onSelectTown={(id) => setSelectedTowns(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    selectedCategories={selectedCategories}
                    onCategoryToggle={(cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                    availableCategories={availableCategories}
                    eventCounts={eventCounts}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                />
            </aside>

            <div className="flex-1 min-w-0">
                  {/* Buscador Rápido con IA */}
                  <div className="mb-6">
                      <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-end mb-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase">Buscador Inteligente</label>
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                                  {ICONS.sparkles} Impulsado por IA
                              </span>
                          </div>
                          <div className="w-full">
                             <div className="relative">
                                 <input
                                    type="text" 
                                    className="w-full p-3 pl-10 pr-20 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                                    placeholder={isAiSearching ? "Analizando..." : "Puente de diciembre, Cabalgata..."}
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    disabled={isAiSearching}
                                 />
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                 </div>
                                 {ENABLE_AI_SEARCH && (
                                     <button 
                                        onClick={handleAiSearch}
                                        disabled={isAiSearching || !searchQuery.trim()}
                                        className="absolute inset-y-1 right-1 px-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                     >
                                         {isAiSearching ? (
                                             <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                         ) : (
                                             ICONS.sparkles
                                         )}
                                         <span className="text-xs font-bold">IA</span>
                                     </button>
                                 )}
                             </div>
                          </div>
                      </div>
                  </div>

                <Hero />

                {/* Contador de Eventos */}
                <div className="mb-4">
                    <EventCounter 
                        total={events.filter(e => !e.id.startsWith('ad-')).length} 
                        onClick={() => {
                            setSelectedTowns([]);
                            setSelectedCategories([]);
                            setSearchQuery('');
                            setStartDate(null);
                            setEndDate(null);
                            setFilterType('all');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            try {
                                history.pushState("", document.title, window.location.pathname + window.location.search);
                            } catch(e) {}
                        }}
                    />
                </div>

                {view === 'calendar' ? (
                    <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEventId} />
                ) : (
                    <EventList 
                        events={filteredEvents} 
                        onSelectEvent={setSelectedEventId} 
                        onResetFilters={() => {
                            setSelectedTowns([]);
                            setSelectedCategories([]);
                            setStartDate(null);
                            setEndDate(null);
                            setSearchQuery('');
                            try {
                                history.pushState("", document.title, window.location.pathname + window.location.search);
                            } catch(e) {}
                        }}
                        onCategoryFilterClick={(cat) => setSelectedCategories([cat])}
                        isAnyFilterActive={selectedTowns.length > 0 || selectedCategories.length > 0 || !!startDate || !!endDate || !!searchQuery}
                        selectedTownIds={selectedTowns}
                        onUpdateEvent={handleUpdateEvent}
                    />
                )}
            </div>
        </main>

        <Footer 
            isLoggedIn={isLoggedIn}
            onLoginClick={() => setShowLoginModal(true)}
            onLogoutClick={handleLogout}
            onAddEventClick={() => setShowAddEventModal(true)}
            onManageCookies={() => setShowCookieConsent(true)}
            onSuggestClick={() => setShowSuggestModal(true)}
            onExportClick={() => exportEventsToCSV(events)}
        />

        <BottomNav 
            onHomeClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setSelectedEventId(null);
                try {
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                } catch(e) {}
            }}
            onMenuClick={() => setShowMenuModal(true)}
            onFaqClick={() => setShowFaqModal(true)}
            onGuideClick={() => setShowGuideModal(true)}
            onFilterClick={() => setIsFilterModalOpen(true)}
        />

        {/* MODALS */}
        {isFilterModalOpen && (
            <FilterSidebarModal 
                onClose={() => setIsFilterModalOpen(false)}
                resultsCount={filteredEvents.length}
                towns={TOWNS}
                selectedTowns={selectedTowns}
                onSelectTown={(id) => setSelectedTowns(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedCategories={selectedCategories}
                onCategoryToggle={(cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                availableCategories={availableCategories}
                eventCounts={eventCounts}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
            />
        )}

        {isMapVisible && (
            <EventMapModal 
                events={filteredEvents} 
                onSelectEvent={(id) => { setSelectedEventId(id); setIsMapVisible(false); }} 
                onClose={() => setIsMapVisible(false)} 
            />
        )}

        {showAddEventModal && (
            <AddEventModal 
                onClose={() => setShowAddEventModal(false)}
                onAddEvent={handleAddEvent}
                showToast={showToastMessage}
            />
        )}

        {showLoginModal && (
            <LoginModal 
                onClose={() => setShowLoginModal(false)}
                onLogin={handleLogin}
                error={null}
            />
        )}

        {showSuggestModal && (
            <SuggestEventModal onClose={() => setShowSuggestModal(false)} />
        )}

        {showAiAssistant && (
            <AiAssistantModal 
                onClose={() => setShowAiAssistant(false)}
                allEvents={events}
            />
        )}

        {showInstallModal && (
            <InstallPwaModal 
                onClose={() => setShowInstallModal(false)}
                onInstall={() => {
                    try { localStorage.setItem('pwa_installed', 'true'); } catch(e){}
                    setShowInstallModal(false);
                }}
            />
        )}

        {showMenuModal && (
            <MenuModal 
                onClose={() => setShowMenuModal(false)}
                onInstall={() => setShowInstallModal(true)}
                onSuggest={() => setShowSuggestModal(true)}
                toggleTheme={handleToggleTheme}
                onInfo={() => setShowInfoModal(true)}
                onProvinceEvents={() => setShowProvinceEventsModal(true)}
                isPwaInstallable={true}
                theme={theme}
            />
        )}

        {showProvinceEventsModal && (
            <ProvinceEventsModal onClose={() => setShowProvinceEventsModal(false)} />
        )}

        {showInfoModal && <InfoAppModal onClose={() => setShowInfoModal(false)} />}
        {showFaqModal && <FaqModal onClose={() => setShowFaqModal(false)} />}
        {showGuideModal && <HowItWorksModal onClose={() => setShowGuideModal(false)} />}

        <CookieConsent isVisible={showCookieConsent} onClose={() => setShowCookieConsent(false)} />
        
        {toast && <Toast message={toast.message} icon={toast.icon} onClose={() => setToast(null)} />}
        
      </div>
    </div>
  );
};

export default App;
