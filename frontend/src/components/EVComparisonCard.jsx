import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Zap, Leaf, RefreshCw, Sparkles, AlertCircle, DollarSign, TrendingDown } from 'lucide-react';

export function EVComparisonCard({ routeResult, selectedVehicle }) {
  const [loading, setLoading] = useState(false);
  const [evData, setEvData] = useState(null);
  const [error, setError] = useState(null);

  const distanceKm = routeResult?.total_distance_km;
  const currentCo2 = routeResult?.total_co2_kg;
  const vehicleType = selectedVehicle?.vehicle_type || 'heavy_truck';
  const vehicleName = selectedVehicle?.name || 'Current Fleet Vehicle';

  const fetchEVComparison = async () => {
    if (!distanceKm || distanceKm <= 0) {
      setEvData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.compareEV({
        distance_km: distanceKm,
        current_vehicle_type: vehicleType,
        current_co2_kg: currentCo2,
        load_factor: 0.5,
        congestion_index: 0.2,
      });
      setEvData(res);
    } catch (err) {
      console.error('EV comparison fetch error:', err);
      setError('Unable to calculate live EV comparison.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically trigger comparison whenever routeResult or selectedVehicle changes
  useEffect(() => {
    if (distanceKm && distanceKm > 0) {
      fetchEVComparison();
    } else {
      setEvData(null);
    }
  }, [distanceKm, currentCo2, vehicleType]);

  // Empty state if no active route exists
  if (!routeResult || !distanceKm) {
    return (
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-[#121722]/50 text-center py-7">
        <Zap className="w-7 h-7 text-teal-500/40 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-300">Fleet Electrification Scenario</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Select a fleet vehicle and shipments to compute real-time GLEC diesel vs. EV emissions comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-teal-950/30 shadow-xl space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Fleet Electrification Scenario
            </h3>
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px] font-bold font-mono border border-teal-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> GLEC Standard Model
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Live comparison of {vehicleName} against an all-electric equivalent (eCascadia / Ultra EV).
          </p>
        </div>

        <button
          onClick={fetchEVComparison}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          title="Recompute EV Comparison"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          {loading ? 'Calculating...' : 'Refresh Scenario'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state placeholder */}
      {loading && !evData && (
        <div className="p-6 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Querying backend GLEC emissions model...</p>
        </div>
      )}

      {/* Live Comparison Data Grid */}
      {evData && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Box 1: Current Fleet Baseline */}
            <div className="bg-[#181A20]/90 p-3.5 rounded-xl border border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Current Fleet
                </span>
                <span className="text-[10px] text-rose-400 font-mono px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 uppercase">
                  {evData.current_fuel_type}
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-rose-400 tracking-tight font-mono">
                  {evData.current_co2_kg.toLocaleString()} <span className="text-xs font-medium text-slate-400">kg CO₂</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Fuel Burned:</span>
                  <span className="font-mono font-semibold text-slate-200">{evData.current_fuel_L} L</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>Est. Fuel Cost:</span>
                  <span className="font-mono font-semibold text-slate-200">${evData.diesel_cost_usd}</span>
                </div>
              </div>
            </div>

            {/* Box 2: EV Equivalent Alternative */}
            <div className="bg-[#181A20]/90 p-3.5 rounded-xl border border-teal-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> EV Alternative
                </span>
                <span className="text-[10px] text-teal-400 font-mono px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 uppercase">
                  {evData.ev_fuel_type}
                </span>
              </div>
              <div>
                <div className="text-xl font-black text-teal-400 tracking-tight font-mono">
                  {evData.ev_co2_kg.toLocaleString()} <span className="text-xs font-medium text-slate-400">kg CO₂</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Energy Used:</span>
                  <span className="font-mono font-semibold text-slate-200">{evData.ev_energy_kwh} kWh</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>Est. Power Cost:</span>
                  <span className="font-mono font-semibold text-slate-200">${evData.ev_electricity_cost_usd}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Electrification Delta & Cost Avoidance */}
            <div className="bg-gradient-to-br from-teal-950/70 via-slate-900/90 to-emerald-950/70 p-3.5 rounded-xl border border-emerald-500/40 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                    Net Impact Delta
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                    -{evData.co2_reduction_percentage}%
                  </span>
                </div>
                <div className="text-xl font-extrabold text-emerald-300 mt-1 flex items-center gap-1.5 tracking-tight font-mono">
                  <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
                  -{evData.co2_saved_kg} <span className="text-xs font-medium text-emerald-200">kg CO₂ avoided</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cost Savings:
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  +${evData.cost_saved_usd} saved
                </span>
              </div>
            </div>
          </div>

          {/* Traceable GLEC Standard Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1 px-1">
            <span>
              Route Distance: <strong className="text-slate-400 font-mono">{evData.distance_km} km</strong>
            </span>
            <span>
              Grid Emission Index: <strong className="text-slate-400 font-mono">0.18 kg CO₂/kWh</strong> (Clean Hydro/Solar Grid)
            </span>
            <span>
              Combustion Index: <strong className="text-slate-400 font-mono">2.68 kg CO₂/L</strong> (Well-to-Wheel Diesel)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

