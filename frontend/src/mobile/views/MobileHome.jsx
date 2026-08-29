import React, { useEffect, useState } from 'react';
import { fetchParetoRoutes } from '../../services/api';
import { Truck, MapPin, Clock, Leaf, ArrowRight, RefreshCw, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function MobileHome({ onStartTrip }) {
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadTodayTrip() {
      try {
        const res = await fetchParetoRoutes({
          vehicle_id: 2,
          shipment_ids: [1, 2]
        });
        
        const activeRoute = res.routes.find((r) => r.route_type === 'BALANCED') || res.routes[0];
        
        setTripData({
          origin: res.baseline.origin || 'Shillong',
          destination: res.baseline.destination || 'Guwahati',
          distance: activeRoute.total_distance_km,
          time: `${activeRoute.total_time_min} min`,
          co2: activeRoute.total_co2_kg,
          vehicle: 'NW Heavy Freightliner #101',
          routeObj: activeRoute
        });
      } catch (err) {
        console.warn('Driver app fetch error', err);
        setErrorMsg('Unable to connect to route engine.');
      } finally {
        setLoading(false);
      }
    }
    loadTodayTrip();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Good Morning, Driver 👋
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Dispatch Queue & Active Assignment
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Ready for Dispatch
        </span>
      </div>

      {loading && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Retrieving optimized route dispatch...</p>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-300 font-semibold">{errorMsg}</p>
          <button
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {!loading && tripData && (
        <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-6 shadow-2xl shadow-emerald-950/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>

          {/* Vehicle Badge & Dispatch Status */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-100">{tripData.vehicle}</h4>
                <p className="text-[11px] text-slate-400 font-medium">Assigned Fleet Heavy Duty (MHCV)</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> DISPATCHED
            </span>
          </div>

          {/* Route Overview */}
          <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">ORIGIN</span>
              <span className="text-base font-black text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" /> {tripData.origin}
              </span>
            </div>
            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{tripData.distance} km</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">DESTINATION</span>
              <span className="text-base font-black text-slate-100 flex items-center gap-1.5 justify-end">
                {tripData.destination} <MapPin className="w-4 h-4 text-cyan-400" />
              </span>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Distance</span>
              <span className="text-sm font-black text-slate-100 font-mono">{tripData.distance} km</span>
            </div>
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Est. Duration</span>
              <span className="text-sm font-black text-amber-300 font-mono">{tripData.time}</span>
            </div>
            <div className="bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">CO₂ Output</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{tripData.co2} kg</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onStartTrip(tripData)}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
            Launch Active Route Execution
          </button>
        </div>
      )}

      {!loading && !tripData && !errorMsg && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Truck className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Active Trips Assigned</h3>
          <p className="text-xs text-slate-400">Check back later or configure a manual trip from the configurator.</p>
        </div>
      )}
    </div>
  );
}
