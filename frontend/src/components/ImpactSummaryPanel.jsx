import React from 'react';
import { Trees, Leaf, Layers, TrendingDown, Award, Sparkles } from 'lucide-react';

export function ImpactSummaryPanel({ impactSummary }) {
  const summary = impactSummary || {
    combined_total_co2_saved_kg: 26.8,
    total_co2_saved_kg: 0,
    total_routes_optimized: 6,
    total_co2_saved_from_pooling_kg: 26.8,
    total_load_pool_matches: 1,
    equivalent_trees_planted: 1.3,
    company_name: 'Northwind Logistics',
  };

  const {
    combined_total_co2_saved_kg,
    total_co2_saved_kg,
    total_routes_optimized,
    total_co2_saved_from_pooling_kg,
    total_load_pool_matches,
    equivalent_trees_planted,
    company_name,
  } = summary;

  return (
    <div className="p-6 rounded-2xl border border-emerald-500/40 bg-[#0F141F]/90 shadow-2xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide">
              Overall Sustainability Impact
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              Live Tenant KPI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated carbon reduction report for <strong className="text-slate-200">{company_name || 'Northwind Logistics'}</strong>
          </p>
        </div>
      </div>

      {/* Main Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Large Metric Card: Combined CO2 Saved */}
        <div className="md:col-span-6 bg-[#131926] p-5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> TOTAL CO₂ AVOIDED
            </span>
            <span className="text-[11px] font-mono text-slate-500">Route + Combined</span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]">
              {combined_total_co2_saved_kg}
            </span>
            <span className="text-base font-extrabold text-slate-300">kg CO₂</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5 mt-2 flex items-center justify-between">
            <span>Verified cumulative emissions offset</span>
            <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Demo Update
            </span>
          </div>
        </div>

        {/* Equivalency Card */}
        <div className="md:col-span-3 bg-[#131926] p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-emerald-400" /> ENVIRONMENTAL EQUIV.
          </div>

          <div className="my-2">
            <div className="text-3xl font-black text-slate-100 flex items-baseline gap-2">
              <span>🌲 {equivalent_trees_planted}</span>
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              tree-years of carbon absorption
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
            ~21 kg CO₂ / tree / year (US EPA factor)
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="md:col-span-3 bg-[#131926] p-4 rounded-xl border border-slate-800 flex flex-col justify-center space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Route Opt. ({total_routes_optimized})</span>
            </div>
            <span className="font-bold text-emerald-400 font-mono text-sm">
              -{total_co2_saved_kg} kg
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Combine Shipments ({total_load_pool_matches})</span>
            </div>
            <span className="font-bold text-amber-400 font-mono text-sm">
              -{total_co2_saved_from_pooling_kg} kg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
