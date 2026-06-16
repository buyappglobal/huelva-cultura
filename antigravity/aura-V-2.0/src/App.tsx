import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DisplayRotativa from './components/DisplayRotativa';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

import AuraSoundscape from './components/AuraSoundscape';
import SmartTVPlayer from './components/SmartTVPlayer';
import SuperAdmin from './components/SuperAdmin';
import Changelog from './components/Changelog';
import HubResolver from './components/HubResolver';
import AssociationLanding from './components/AssociationLanding';
import LandingPage from './components/LandingPage';
import VisualizerUploader from './components/VisualizerUploader';
import ClientStatusPage from './components/ClientStatusPage';

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
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/super" element={<SuperAdmin />} />
          <Route path="/admin/changelog" element={<Changelog />} />
          <Route path="/admin/visualizer" element={<VisualizerUploader />} />

          {/* Client Status Page */}
          <Route path="/cliente" element={<ClientStatusPage />} />

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
