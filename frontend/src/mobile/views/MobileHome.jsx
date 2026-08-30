import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, fetchParetoRoutes, fetchDriverStatus, updateDriverStatus } from '../../services/api';
import { MOCK_SCENARIOS, getScenarioById } from '../../services/mockScenarios';
import { ScenarioPickerTrigger } from '../../components/MockScenarioPicker';
import { VoiceNavigation } from '../../components/VoiceNavigation';
import { Truck, MapPin, Clock, Leaf, ArrowRight, RefreshCw, AlertTriangle, ShieldCheck, Zap, Sparkles, Volume2 } from 'lucide-react';

export default function MobileHome({ onStartTrip }) {
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState('S01');
  const [driverStatus, setDriverStatus] = useState(null);
  const [isVoiceNavOpen, setIsVoiceNavOpen] = useState(false);

  const applyMockTrip = (scenario) => {
    if (!scenario) return;
    setActiveScenarioId(scenario.id);
    setTripData(scenario.tripData);
    setLoading(false);
  };

  // Listen to global scenario selection events from Header or picker
  useEffect(() => {
    const handleGlobalScenario = (e) => {
      if (e.detail?.scenario) {
        applyMockTrip(e.detail.scenario);
      }
    };
    window.addEventListener('ecologix:scenario-selected', handleGlobalScenario);
    return () => window.removeEventListener('ecologix:scenario-selected', handleGlobalScenario);
  }, []);

  useEffect(() => {
    async function loadTodayTrip() {
      try {
        setLoading(true);

        let token = localStorage.getItem('ecologix_token');
        if (!token) {
          const authData = await api.devLogin('A').catch(() => null);
          if (authData?.access_token) {
            token = authData.access_token;
          }
        }

        const [vehRes, shipRes, statusRes] = await Promise.all([
          api.getVehicles().catch(() => ({ vehicles: [] })),
          api.getShipments().catch(() => ({ shipments: [] })),
          fetchDriverStatus().catch(() => null),
        ]);

        if (statusRes) {
          setDriverStatus(statusRes);
        }

        const assignedVehicle = vehRes.vehicles?.[0] || { id: 'veh-nw-101', name: 'NW Tata Signa Heavy Diesel #101' };
        const assignedShipments = (shipRes.shipments && shipRes.shipments.length > 0)
          ? shipRes.shipments.slice(0, 3)
          : [{ id: 'ship-nw-01' }, { id: 'ship-nw-02' }];

        const res = await fetchParetoRoutes({
          vehicle_id: assignedVehicle.id,
          shipment_ids: assignedShipments.map((s) => s.id),
          alpha: 0.5,
        });

        const firstLeg = res.legs?.[0];
        const lastLeg = res.legs?.[res.legs.length - 1];

        setTripData({
          origin: firstLeg?.from_stop || 'Betkuchi ISBT Freight Terminal',
          destination: lastLeg?.to_stop || 'ICD Amingaon Container Depot',
          distance: res.total_distance_km,
          time: `${res.total_time_min} min`,
          co2: res.total_co2_kg,
          vehicle: assignedVehicle.name || 'NW Tata Signa Heavy Diesel #101',
          routeObj: res,
        });
      } catch (err) {
        console.warn('Live trip fetch notice, applying instant scenario:', err);
        // Instant graceful fallback to mock scenario S01 so driver is never blocked
        applyMockTrip(MOCK_SCENARIOS[0]);
      } finally {
        setLoading(false);
      }
    }
    loadTodayTrip();
  }, []);

  const handleStartTripClick = async () => {
    try {
      await updateDriverStatus({ active_step: 'DETAILS', step_index: 0 }).catch(() => null);
    } finally {
      onStartTrip(tripData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting & Scenario Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Good Morning, Driver 👋
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Today's Trip & Load
            </p>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
              Scenario: {activeScenarioId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Scenario Picker for Driver Testing */}
          <ScenarioPickerTrigger
            activeScenarioId={activeScenarioId}
            onSelectScenario={applyMockTrip}
          />
          <span className="hidden sm:flex px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold items-center gap-1.5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Ready to Go
          </span>
        </div>
      </div>

      {loading && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Finding best road for today...</p>
        </div>
      )}

      {!loading && tripData && (
        <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-6 shadow-2xl shadow-emerald-950/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>

          {/* Vehicle Badge & Status */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-100">{tripData.vehicle}</h4>
                <p className="text-[11px] text-slate-400 font-medium">Your Assigned Truck</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ON DUTY
            </span>
          </div>

          {/* Route Overview */}
          <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">FROM</span>
              <span className="text-base font-black text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" /> {tripData.origin}
              </span>
            </div>
            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{tripData.distance} km</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">TO</span>
              <span className="text-base font-black text-slate-100 flex items-center gap-1.5 justify-end">
                {tripData.destination} <MapPin className="w-4 h-4 text-cyan-400" />
              </span>
            </div>
          </div>

          {/* Trip Info Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Road km</span>
              <span className="text-sm font-black text-slate-100 font-mono">{tripData.distance} km</span>
            </div>
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Time to Reach</span>
              <span className="text-sm font-black text-amber-300 font-mono">{tripData.time}</span>
            </div>
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">CO₂ Output</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{tripData.co2} kg</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartTripClick}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              Start This Trip
            </motion.button>

            <button
              onClick={() => setIsVoiceNavOpen(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              🔊 Preview Turn-by-Turn Voice Navigation
            </button>
          </div>
        </div>
      )}

      {/* Voice Navigation Overlay */}
      {isVoiceNavOpen && tripData && (
        <VoiceNavigation
          route={
            tripData.routeObj
              ? {
                  category: 'green',
                  waypoints: tripData.routeObj.ordered_stops?.map((s) => ({
                    lat: s.lat,
                    lng: s.lng,
                    name: s.title,
                  })),
                }
              : {
                  category: 'green',
                  waypoints: [
                    { lat: 26.1214, lng: 91.7319, name: tripData.origin },
                    { lat: 26.1852, lng: 91.6811, name: tripData.destination },
                  ],
                }
          }
          onExit={() => setIsVoiceNavOpen(false)}
        />
      )}

      {!loading && !tripData && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Truck className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Trip Assigned Yet</h3>
          <p className="text-xs text-slate-400">Check back later or set up a trip from the "Set Up Trip" tab.</p>
        </div>
      )}
    </div>
  );
}
