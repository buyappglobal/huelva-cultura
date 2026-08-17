// Namespaced LocalStorage Proxy to prevent SaaS tenants from overriding each other's browser configurations
const getTenantIdFromUrl = (): string => {
  try {
    const host = window.location.hostname;
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    
    if (host.endsWith('.appradio.aurabusiness.es')) {
      return host.split('.')[0];
    }
    
    if (host !== 'appradio.aurabusiness.es' && host !== 'localhost' && !host.endsWith('pages.dev')) {
      return host.replace(/\./g, '_');
    }
    
    const reservedRoutes = ['widget', 'admin', 'profile', 's', 'blog', 'cancion', 'song'];
    if (pathSegments[0] && !reservedRoutes.includes(pathSegments[0])) {
      return pathSegments[0];
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) return tenantParam;
    
    return 'aura-radio';
  } catch {
    return 'aura-radio';
  }
};

const originalGetItem = localStorage.getItem;
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.getItem = function(key: string) {
  if (key === 'aura_data_version') return originalGetItem.call(localStorage, key);
  const tenantId = getTenantIdFromUrl();
  return originalGetItem.call(localStorage, `${key}_${tenantId}`);
};

localStorage.setItem = function(key: string, value: string) {
  if (key === 'aura_data_version') return originalSetItem.call(localStorage, key, value);
  const tenantId = getTenantIdFromUrl();
  return originalSetItem.call(localStorage, `${key}_${tenantId}`, value);
};

localStorage.removeItem = function(key: string) {
  if (key === 'aura_data_version') return originalRemoveItem.call(localStorage, key);
  const tenantId = getTenantIdFromUrl();
  return originalRemoveItem.call(localStorage, `${key}_${tenantId}`);
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorReporter';

// Manejadores globales de errores (no capturados, promesas, fallo de chunk
// tras un despliegue). Se instala una sola vez, antes de montar React.
installGlobalErrorHandlers();

// Service Worker Registration
// Skip SW registration when loaded inside an iframe (widget mode)
// — SW cannot register in cross-origin iframe contexts and throws errors
const _isInIframe = window.self !== window.top;

if ('serviceWorker' in navigator && !_isInIframe) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
              }
            });
          }
        });

        // If there's already a waiting worker on load, dispatch immediately
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
        }
      })
      .catch(registrationError => {
        // Only log failures/errors
        console.error('SW registration failed: ', registrationError);
      });
  });

  // Reload the page when the active service worker changes to activate the new version
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      sessionStorage.setItem('aura_sw_reload', 'true');
      window.location.reload();
    }
  });
}

import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
