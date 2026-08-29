import React from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import MobileApp from './mobile/MobileApp';
import './index.css';
import './mobile.css';

function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();

  // Robust path detection for driver portal (/driver, /driver/, /driver?...)
  const isDriverPath = location.pathname.startsWith('/driver');

  return (
    <div key={location.pathname}>
      {isDriverPath ? (
        <MobileApp onExit={() => navigate('/')} />
      ) : (
        <AdminDashboard />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}
