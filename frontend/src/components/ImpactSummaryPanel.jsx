import React from 'react';
import { Trees, Leaf, Layers, TrendingDown, Award, Sparkles } from 'lucide-react';

export function ImpactSummaryPanel({ impactSummary }) {
  if (!impactSummary) {
    return null;
  }

  const {
    combined_total_co2_saved_kg = 0,
    total_co2_saved_kg = 0,
    total_routes_optimized = 0,
    total_co2_saved_from_pooling_kg = 0,
    total_load_pool_matches = 0,
    equivalent_trees_planted = 0,
    company_name = '',
  } = impactSummary;

  return (
    <div className="glass-panel-glow p-5 rounded-2xl border border-emerald-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-950/80">
      {/* Background Decorative Graphic */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100 tracking-wide">
              Overall Sustainability Impact
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 font-mono">
              Live Tenant KPI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated carbon reduction report for <strong className="text-slate-200">{company_name}</strong>
          </p>
        </div>
      </div>

      {/* Main Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Large Headline Metric: Combined CO2 Saved */}
        <div className="md:col-span-2 bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="uppercase tracking-wider font-semibold text-emerald-400/90 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Total CO₂ Avoided
            </span>
            <span className="text-[10px] font-mono text-slate-500">Route + Combined</span>
          </div>

          <div className="my-1 flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              {combined_total_co2_saved_kg.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-slate-300">kg CO₂</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-1 flex items-center justify-between">
            <span>Verified cumulative emissions offset</span>
            <span className="text-emerald-400 font-semibold font-mono">Live Demo Update</span>
          </div>
        </div>

        {/* Equivalency Card: Trees Planted */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-emerald-400" /> Environmental Equiv.
          </div>

          <div className="my-1">
            <div className="text-2xl font-black text-slate-100 flex items-center gap-1.5">
              <span>🌲 {equivalent_trees_planted.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 font-medium">
              tree-years of carbon absorption
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 font-mono">
            ~21 kg CO₂ / tree / year (US EPA factor)
          </div>
        </div>

        {/* Breakdown Card: Route & Pooling Totals */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1 text-slate-300">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Route Opt. ({total_routes_optimized})</span>
            </div>
            <span className="font-bold text-emerald-400 font-mono">
              -{total_co2_saved_kg} kg
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Combine Shipments ({total_load_pool_matches})</span>
            </div>
            <span className="font-bold text-amber-400 font-mono">
              -{total_co2_saved_from_pooling_kg} kg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
