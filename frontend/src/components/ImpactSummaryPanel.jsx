import React from 'react';
import { Trees, Layers, TrendingDown } from 'lucide-react';

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
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Overall Sustainability Impact</h3>
          <p className="text-[11px] text-slate-400">Aggregated carbon reduction report for {company_name}</p>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono">JWT Verified</span>
      </div>

      {/* Main Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Large Headline Metric: Combined CO2 Saved */}
        <div className="md:col-span-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-medium mb-1">Total CO₂ Avoided</div>
          <div className="text-2xl font-bold text-emerald-400">
            {combined_total_co2_saved_kg.toLocaleString()} <span className="text-xs font-normal text-slate-300">kg CO₂</span>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 mt-2">
            Verified cumulative emissions offset
          </div>
        </div>

        {/* Equivalency Card: Trees Planted */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between text-xs">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Trees className="w-3.5 h-3.5 text-emerald-400" /> Environmental Equiv.
          </div>
          <div className="my-1">
            <div className="text-lg font-bold text-slate-100">
              🌲 {equivalent_trees_planted.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-400">tree-years absorbed</div>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-1.5 font-mono">
            ~21 kg CO₂ / tree / yr
          </div>
        </div>

        {/* Breakdown Card: Route & Pooling Totals */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1 text-slate-300">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Routes ({total_routes_optimized})</span>
            </div>
            <span className="font-bold text-emerald-400 font-mono">
              -{total_co2_saved_kg} kg
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Pooling ({total_load_pool_matches})</span>
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
