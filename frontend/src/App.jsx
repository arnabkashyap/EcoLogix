import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import MobileApp from './mobile/MobileApp';
import './index.css';
import './mobile.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/driver" element={<MobileApp onExit={() => window.location.href = '/'} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
