import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ZAxis,
  Cell,
} from 'recharts';
import { TrendingDown, Zap, Leaf, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export function ParetoChart({ paretoPoints, currentAlpha, onSelectAlpha, solutionMethod }) {
  const [showMath, setShowMath] = useState(false);

  if (!paretoPoints || paretoPoints.length === 0) {
    return null;
  }

  // Format data for Recharts
  const data = paretoPoints.map((p) => ({
    alpha: p.alpha,
    time: p.time_min,
    co2: p.co2_kg,
    saved: p.co2_saved_pct,
    label: p.label,
    isSelected: p.alpha === currentAlpha,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pt = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-xl border border-emerald-500/40 text-xs shadow-2xl bg-[#181A20]/95">
          <div className="font-bold text-emerald-400 mb-1 flex items-center justify-between gap-2">
            <span>{pt.label}</span>
            {pt.isSelected && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded">Active</span>}
          </div>
          <div className="text-slate-200">Delivery Time: <span className="font-semibold text-amber-300">{pt.time} min</span></div>
          <div className="text-slate-200">Carbon Output: <span className="font-semibold text-emerald-300">{pt.co2} kg CO₂</span></div>
          <div className="text-emerald-400 font-bold mt-1">Saved vs Standard Route: -{pt.saved}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" /> Speed vs. CO₂ Trade-off
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Choose the balance that works best for your schedule. Click any point to select.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <Leaf className="w-3 h-3" /> Cleanest
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            <Zap className="w-3 h-3" /> Fastest
          </span>
        </div>
      </div>

      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <XAxis
              type="number"
              dataKey="time"
              name="Time"
              unit="m"
              domain={['auto', 'auto']}
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{ value: 'Travel Time (minutes)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="co2"
              name="CO2"
              unit="kg"
              domain={['auto', 'auto']}
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{ value: 'CO2 (kg)', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 10 }}
            />
            <ZAxis range={[120, 120]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              line={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
              onClick={(e) => e && e.alpha !== undefined && onSelectAlpha(e.alpha)}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isSelected ? '#10b981' : entry.alpha === 1.0 ? '#f59e0b' : '#38bdf8'}
                  stroke={entry.isSelected ? '#ffffff' : 'none'}
                  strokeWidth={entry.isSelected ? 3 : 0}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Expandable Technical Calculation Accordion (Req #6 & #8) */}
      <div className="mt-3 border-t border-slate-800/80 pt-2">
        <button
          onClick={() => setShowMath(!showMath)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-emerald-400 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            How does EcoLogix calculate this trade-off?
          </span>
          {showMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showMath && (
          <div className="mt-2 p-3 rounded-xl bg-[#111827]/90 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
            <div>
              <strong>Bi-Objective Optimization Formula:</strong> EcoLogix balances time and carbon using normalized weights <span className="text-emerald-400 font-mono">Cost = (1-α)×CO₂ + α×Time</span> across parameter <span className="text-emerald-400 font-mono">α ∈ [0, 1]</span>.
            </div>
            {solutionMethod && (
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center gap-2">
                <span>Solver Algorithm:</span>
                <span className="font-mono text-emerald-300 bg-[#181A20] px-1.5 py-0.5 rounded border border-slate-800">
                  {solutionMethod === 'exact_optimal' ? 'Exact Optimal Combinatorial Search' : 'Greedy Nearest-Neighbor Heuristic'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
