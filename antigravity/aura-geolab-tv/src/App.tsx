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
          {/* Smart TV Premium Display */}
          <Route path="/" element={<SmartTVPlayer />} />
          <Route path="/tv" element={<SmartTVPlayer />} />
          <Route path="/tv/:slug" element={<SmartTVPlayer />} />
          <Route path="/:slug" element={<SmartTVPlayer />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
