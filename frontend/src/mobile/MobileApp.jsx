import React, { useState } from 'react';
import '../mobile.css';
import MobileHome from './views/MobileHome';
import MobileTrips from './views/MobileTrips';
import MobileAlerts from './views/MobileAlerts';
import MobileProfile from './views/MobileProfile';
import DriverTripFlow from './components/DriverTripFlow';
import { Header } from '../components/Header';
import { Home, Sliders, Bell, User, Navigation, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Header Navigation */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6 pb-44 sm:pb-48">
        {/* Top Driver Portal Info Banner */}
        <div className="bg-[#121722]/80 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-inner">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-100">Driver App — Your Trips</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Best road, less CO₂, share empty space on the way back
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('trips')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Set Up Trip
            </button>
          </div>
        </div>

        {/* Tab Views */}
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

        {/* Bottom Spacer to ensure full clearance above fixed floating navigation */}
        <div className="h-16 w-full pointer-events-none" aria-hidden="true" />
      </main>

      {/* Compressed Pill Bottom Navigation */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="glass-panel px-3 py-2 rounded-full border border-slate-800/90 bg-[#0c1524]/90 backdrop-blur-xl shadow-2xl shadow-black/80 flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'trips'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" /> <span className="hidden sm:inline">Set Up Trip</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'alerts'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Warnings</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-2 animate-pulse"></span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" /> <span className="hidden sm:inline">My Details</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
