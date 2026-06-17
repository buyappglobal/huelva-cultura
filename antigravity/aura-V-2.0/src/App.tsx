import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DisplayRotativa from './components/DisplayRotativa';
import ErrorBoundary from './components/ErrorBoundary';

import AuraSoundscape from './components/AuraSoundscape';
import SmartTVPlayer from './components/SmartTVPlayer';
import HubResolver from './components/HubResolver';
import LandingPage from './components/LandingPage';

const ExternalRedirect = ({ url }: { url: string }) => {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Web Original (Home) */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Display Rotativa (Independiente) */}
          <Route path="/view" element={<AuraSoundscape />} />
          <Route path="/display" element={<DisplayRotativa />} />

          {/* Smart TV / Low-End Display (Dumb Terminal sin Firebase SDK ni Framer Motion) */}
          <Route path="/tv" element={<SmartTVPlayer />} />
          <Route path="/tv/:slug" element={<SmartTVPlayer />} />
          
          {/* Admin Redirects to dedicated Admin Portal */}
          <Route path="/admin" element={<ExternalRedirect url="https://admin.aurabusiness.es" />} />
          <Route path="/admin/*" element={<ExternalRedirect url="https://admin.aurabusiness.es" />} />

          {/* Hub Slugs */}
          <Route path="/hub/:slug" element={<HubResolver />} />
          <Route path="/:slug" element={<HubResolver />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
