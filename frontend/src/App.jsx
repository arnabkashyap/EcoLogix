import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import MobileApp from './mobile/MobileApp';
import './index.css';
import './mobile.css';

function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/driver/*" element={<MobileApp onExit={() => navigate('/')} />} />
      <Route path="/driver" element={<MobileApp onExit={() => navigate('/')} />} />
      <Route path="/" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}
