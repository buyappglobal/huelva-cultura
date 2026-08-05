import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Ajusta esto a tu Worker en producción
import { API_CONFIG } from '../types';
const API_BASE = API_CONFIG.BASE_URL; 

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  favorites: string[];
  preferences?: Record<string, any>;
  is_superadmin?: number;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  token: string | null;
  login: (prompt?: string) => void;
  logout: () => void;
  syncFavorites: (favorites: string[]) => Promise<void>;
  syncPreferences: (prefs: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  syncFavorites: async () => {},
  syncPreferences: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const fetchAttempted = useRef(false);

  // On mount: check URL for token (coming back from OAuth), then fall back to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      localStorage.setItem('aura_auth_token', urlToken);
      setToken(urlToken);
      // Clean up URL without refreshing
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      const storedToken = localStorage.getItem('aura_auth_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Whenever token changes, fetch the user profile
  useEffect(() => {
    if (!token) return;
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;

    fetch(`${API_BASE}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.status === 401) {
        // Token is invalid/expired — clear it
        logout();
        return null;
      }
      if (!res.ok) {
        return null;
      }
      return res.json();
    })
    .then((data: any) => {
      if (!data) return;
      const userWithRole = { ...data, isSuperAdmin: !!data.is_superadmin };
      setUser(userWithRole);

      // Merge cloud favorites with local favorites on first load
      const localFavs = JSON.parse(localStorage.getItem('aura_favorites') || '[]');
      const cloudFavs: string[] = data.favorites || [];
      const mergedFavs = Array.from(new Set([...localFavs, ...cloudFavs]));

      if (mergedFavs.length > cloudFavs.length) {
        // Si había locales que no estaban en la nube, los subimos
        syncFavorites(mergedFavs);
      }

      // Save merged back to local for fast access
      localStorage.setItem('aura_favorites', JSON.stringify(mergedFavs));

      // Restore & Merge Cloud Preferences with Local Storage
      const cloudPrefs = data.preferences || {};
      const localPrefs: Record<string, any> = {};
      const localCatOrder = localStorage.getItem('user_category_order');
      if (localCatOrder) { try { localPrefs.user_category_order = JSON.parse(localCatOrder); } catch(e){} }
      const localHiddenCats = localStorage.getItem('user_hidden_categories');
      if (localHiddenCats) { try { localPrefs.user_hidden_categories = JSON.parse(localHiddenCats); } catch(e){} }
      const localColor = localStorage.getItem('aura_accent_color');
      if (localColor) localPrefs.aura_accent_color = localColor;
      const localScroll = localStorage.getItem('aura_pc_scroll_mode');
      if (localScroll) localPrefs.aura_pc_scroll_mode = localScroll;

      // Apply cloud preferences to local storage
      if (cloudPrefs.user_category_order && Array.isArray(cloudPrefs.user_category_order)) {
        localStorage.setItem('user_category_order', JSON.stringify(cloudPrefs.user_category_order));
      }
      if (cloudPrefs.user_hidden_categories && Array.isArray(cloudPrefs.user_hidden_categories)) {
        localStorage.setItem('user_hidden_categories', JSON.stringify(cloudPrefs.user_hidden_categories));
      }
      if (cloudPrefs.aura_accent_color) {
        localStorage.setItem('aura_accent_color', cloudPrefs.aura_accent_color);
        document.documentElement.style.setProperty('--color-accent', cloudPrefs.aura_accent_color);
      }
      if (cloudPrefs.aura_pc_scroll_mode) {
        localStorage.setItem('aura_pc_scroll_mode', cloudPrefs.aura_pc_scroll_mode);
      }

      // If local had preferences that weren't in D1 yet, push merged preferences to D1
      const mergedPrefs = { ...localPrefs, ...cloudPrefs };
      if (Object.keys(localPrefs).some(k => !cloudPrefs[k])) {
        syncPreferences(mergedPrefs);
      }
    })
    .catch((err) => {
      // Network error — do NOT logout, the user might be offline temporarily
      console.error('[Auth] Network error fetching user, keeping token:', err.message);
    });
  }, [token]);

  const login = (prompt?: string) => {
    const currentUrl = encodeURIComponent(window.location.origin);
    let url = `${API_BASE}/auth/google?redirect_to=${currentUrl}`;
    if (prompt) {
      url += `&prompt=${encodeURIComponent(prompt)}`;
    }
    window.location.href = url;
  };

  const logout = () => {
    localStorage.removeItem('aura_auth_token');
    setToken(null);
    setUser(null);
    fetchAttempted.current = false;
  };

  const syncFavorites = async (favorites: string[]) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ favorites })
      });
    } catch (e) {
      console.error('Failed to sync favorites', e);
    }
  };

  const syncPreferences = async (preferences: Record<string, any>) => {
    if (!token) return;
    try {
      // Also update local state optimistically
      setUser(prev => prev ? { ...prev, preferences: { ...(prev.preferences || {}), ...preferences } } : null);

      await fetch(`${API_BASE}/api/user/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });
    } catch (e) {
      console.error('Failed to sync preferences', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!user,
      user,
      token,
      login,
      logout,
      syncFavorites,
      syncPreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
};
