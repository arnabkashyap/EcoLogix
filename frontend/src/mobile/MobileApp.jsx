import React, { useState } from 'react';
import '../mobile.css';
import MobileHome from './views/MobileHome';
import MobileTrips from './views/MobileTrips';
import MobileAlerts from './views/MobileAlerts';
import MobileProfile from './views/MobileProfile';
import DriverTripFlow from './components/DriverTripFlow';
import { Header } from '../components/Header';
import { Home, Truck, Bell, User } from 'lucide-react';

export default function MobileApp({ onExit }) {
  // Navigation tabs: 'home' | 'trips' | 'alerts' | 'profile' | 'active-trip'
  const [activeTab, setActiveTab] = useState('home');
  const [activeTripId, setActiveTripId] = useState(null);

  const startTripFlow = (tripId) => {
    setActiveTripId(tripId);
    setActiveTab('active-trip');
  };

  const completeTripFlow = () => {
    setActiveTripId(null);
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-[#181A20] text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header onOpenDemoGuide={() => {}} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 pb-24">
        {activeTab === 'home' && <MobileHome onStartTrip={startTripFlow} />}
        {activeTab === 'trips' && <MobileTrips onStartTrip={startTripFlow} />}
        {activeTab === 'alerts' && <MobileAlerts />}
        {activeTab === 'profile' && <MobileProfile onExit={onExit} />}
        {activeTab === 'active-trip' && (
          <DriverTripFlow
            tripId={activeTripId}
            onComplete={completeTripFlow}
          />
        )}
      </main>

      {/* Compressed Pill Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="glass-panel px-4 py-2.5 rounded-full border border-slate-800 bg-[#0c1524]/90 backdrop-blur-xl shadow-2xl flex items-center gap-1.5 md:gap-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-[#1F2937]'
            }`}
          >
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'trips'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-[#1F2937]'
            }`}
          >
            <Truck className="w-4 h-4" /> <span className="hidden sm:inline">Configurator</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'alerts'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-[#1F2937]'
            }`}
          >
            <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-[#1F2937]'
            }`}
          >
            <User className="w-4 h-4" /> <span className="hidden sm:inline">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
