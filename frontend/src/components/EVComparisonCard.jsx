import React, { useState } from 'react';
import { api } from '../services/api';
import { Zap, Leaf, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

export function EVComparisonCard({ routeResult }) {
  const [loading, setLoading] = useState(false);
  const [evData, setEvData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  if (!routeResult) return null;

  const handleRunComparison = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      // Route calculation strictly through backend calculate_segment_emissions API
      const res = await api.estimateEmissions({
        vehicle_type: 'ev_truck',
        distance_km: routeResult.total_distance_km,
        load_factor: 0.5,
        congestion_index: 0.2,
      });
      setEvData(res);
    } catch (err) {
      console.error('EV comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  const dieselCo2 = routeResult.total_co2_kg || 0;
  const evCo2 = evData ? evData.co2_kg : 0;
  const co2Saved = Math.max(0, roundOneDec(dieselCo2 - evCo2));
  const pctReduction = dieselCo2 > 0 ? Math.round((co2Saved / dieselCo2) * 100) : 0;

  function roundOneDec(val) {
    return Math.round(val * 10) / 10;
  }

  return (
    <div className="glass-panel p-4 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-teal-950/30 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Fleet Electrification Scenario
            </h3>
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px] font-bold font-mono border border-teal-500/20">
              Renewable Energy Impact
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare diesel emissions against an all-electric EV fleet (Freightliner eCascadia).
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              Computing EV Model...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              What if this were an EV fleet?
            </>
          )}
        </button>
      </div>

      {/* Comparison Drawer / Side-by-side Result */}
      {isOpen && evData && (
        <div className="mt-4 pt-4 border-t border-slate-800 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Diesel Current Box */}
            <div className="bg-[#181A20]/80 p-3 rounded-xl border border-rose-500/20 text-xs">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                Current Diesel Fleet
              </div>
              <div className="text-lg font-black text-rose-400 mt-0.5">
                {dieselCo2} kg CO₂
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Combustion Factor: 2.68 kg CO₂/L
              </div>
            </div>

            {/* EV Equivalent Box */}
            <div className="bg-[#181A20]/80 p-3 rounded-xl border border-teal-500/30 text-xs">
              <div className="text-[10px] text-teal-400 uppercase font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> EV Fleet Equivalent
              </div>
              <div className="text-lg font-black text-teal-400 mt-0.5">
                {evCo2} kg CO₂
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Energy: {evData.energy_kwh} kWh (0.18 kg CO₂/kWh grid)
              </div>
            </div>

            {/* Side-by-side Delta Badge */}
            <div className="bg-gradient-to-br from-teal-950/60 to-emerald-950/60 p-3 rounded-xl border border-emerald-500/40 text-xs flex flex-col justify-between">
              <div className="text-[10px] text-emerald-400 uppercase font-bold">
                Electrification Delta
              </div>
              <div className="text-xl font-extrabold text-emerald-300 flex items-center gap-1">
                <Leaf className="w-4 h-4 text-emerald-400" />
                -{pctReduction}% CO₂ (-{co2Saved} kg)
              </div>
              <div className="text-[10px] text-slate-300 font-mono">
                Backend Computed Traceable Delta
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
