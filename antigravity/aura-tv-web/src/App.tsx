import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SmartTVPlayer from './components/SmartTVPlayer';
import AuraSoundscape from './components/AuraSoundscape';
import DisplayRotativa from './components/DisplayRotativa';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Smart TV / Low-End Display on Root */}
          <Route path="/" element={<SmartTVPlayer />} />
          <Route path="/:slug" element={<SmartTVPlayer />} />
          
          {/* Keep compatibility with existing legacy /tv routes */}
          <Route path="/tv" element={<SmartTVPlayer />} />
          <Route path="/tv/:slug" element={<SmartTVPlayer />} />
          
          {/* High-End Display Engine (Remote Mando) */}
          <Route path="/view" element={<AuraSoundscape />} />
          
          {/* Display Rotativa */}
          <Route path="/display" element={<DisplayRotativa />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
