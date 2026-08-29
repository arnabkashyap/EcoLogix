import React from 'react';
import { Zap, Leaf, Sliders, RefreshCw } from 'lucide-react';

export function AlphaSlider({ alpha, onChangeAlpha, onOptimize, isOptimizing }) {
  const getModeLabel = (val) => {
    if (val === 0) return 'Cleanest Route';
    if (val === 0.25) return 'Mostly Green';
    if (val === 0.5) return 'Balanced Choice';
    if (val === 0.75) return 'Faster Delivery';
    if (val === 1) return 'Fastest Route';
    return 'Balanced Choice';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <span>Choose Priority:</span>
          <span className="text-emerald-400">⚡ Faster ←────────→ 🌱 Greener</span>
        </label>
        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {getModeLabel(alpha)}
        </span>
      </div>

      {/* Slider Input */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-emerald-400 font-medium whitespace-nowrap">🌱 Greener</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.25"
          value={alpha}
          onChange={(e) => onChangeAlpha(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
        <span className="text-[11px] text-amber-400 font-medium whitespace-nowrap">⚡ Faster</span>
      </div>

      {/* Quick Mode Preset Buttons */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {[0.0, 0.25, 0.5, 0.75, 1.0].map((val) => (
          <button
            key={val}
            onClick={() => onChangeAlpha(val)}
            className={`py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
              alpha === val
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {getModeLabel(val).split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
