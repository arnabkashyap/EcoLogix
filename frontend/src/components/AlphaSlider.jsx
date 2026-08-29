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
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          ⚡ Faster ←────────→ 🌱 Greener
        </label>
        <span
          className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30"
        >
          {getModeLabel(alpha)}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Choose your priority. <span className="text-slate-300">Moving toward greener routes reduces carbon emissions and may increase travel time slightly.</span>
      </p>

      {/* Slider Input */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex items-center text-xs text-emerald-400 font-bold gap-1 min-w-[75px]">
          <Leaf className="w-4 h-4" /> 🌱 Greener
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.25"
          value={alpha}
          onChange={(e) => onChangeAlpha(parseFloat(e.target.value))}
          className="w-full h-2 bg-[#1F2937] rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
        <div className="flex items-center text-xs text-amber-400 font-bold gap-1 min-w-[70px] justify-end">
          ⚡ Faster <Zap className="w-4 h-4" />
        </div>
      </div>

      {/* Quick Mode Preset Buttons */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {[0.0, 0.25, 0.5, 0.75, 1.0].map((val) => (
          <button
            key={val}
            onClick={() => onChangeAlpha(val)}
            className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
              alpha === val
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#111827]/90 text-slate-400 border-slate-800 hover:bg-[#1F2937] hover:text-slate-200'
            }`}
          >
            {getModeLabel(val).split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onOptimize}
        disabled={isOptimizing}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
      >
        {isOptimizing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            Optimizing route...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 text-slate-950" />
            Apply Trade-off Choice
          </>
        )}
      </button>
    </div>
  );
}
