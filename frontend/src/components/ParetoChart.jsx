import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ZAxis,
  Cell,
  Line,
} from 'recharts';
import { TrendingDown, Zap, Leaf } from 'lucide-react';

export function ParetoChart({ paretoPoints, currentAlpha, onSelectAlpha, solutionMethod }) {
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
        <div className="glass-panel p-3 rounded-xl border border-emerald-500/30 text-xs shadow-xl">
          <div className="font-bold text-emerald-400 mb-1">{pt.label} (α = {pt.alpha})</div>
          <div className="text-slate-200">Transit Time: <span className="font-semibold text-amber-300">{pt.time} min</span></div>
          <div className="text-slate-200">Emissions: <span className="font-semibold text-emerald-300">{pt.co2} kg CO₂</span></div>
          <div className="text-emerald-400 font-semibold mt-1">Saved vs Baseline: -{pt.saved}%</div>
        </div>
      );
    };
    return null;
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" /> Pareto Frontier (Time vs CO₂)
            </h3>
            {solutionMethod && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  solutionMethod === 'exact_optimal'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
                title={
                  solutionMethod === 'exact_optimal'
                    ? 'Exact combinatorial search (optimal for ≤9 stops)'
                    : 'Greedy nearest-neighbor heuristic'
                }
              >
                {solutionMethod === 'exact_optimal' ? 'Exact Optimal' : 'Heuristic'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Interactive trade-off curve across α ∈ [0, 1]
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-3 h-3" /> α=0 (Greenest)
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-3 h-3" /> α=1 (Fastest)
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
              label={{ value: 'Transit Time (min)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="co2"
              name="CO2"
              unit="kg"
              domain={['auto', 'auto']}
              stroke="#64748b"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{ value: 'CO2 (kg)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
            />
            <ZAxis range={[120, 120]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              line={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }}
              onClick={(e) => onSelectAlpha(e.alpha)}
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
    </div>
  );
}
