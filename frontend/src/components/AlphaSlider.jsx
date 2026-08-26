import React from 'react';
import { Zap, Leaf, Sliders, RefreshCw } from 'lucide-react';

export function AlphaSlider({ alpha, onChangeAlpha, onOptimize, isOptimizing }) {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Objective Weighting Slider (α)
        </label>
        <span className="mono-font text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          α = {alpha.toFixed(2)}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3">
        Slide left for <span className="text-emerald-400 font-semibold">Cleanest Route</span> (Min CO₂), right for <span className="text-amber-400 font-semibold">Fastest Delivery</span> (Min Time).
      </p>

      {/* Slider Input */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex items-center text-xs text-emerald-400 font-semibold gap-1 min-w-[75px]">
          <Leaf className="w-4 h-4" /> Greenest
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.25"
          value={alpha}
          onChange={(e) => onChangeAlpha(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
        <div className="flex items-center text-xs text-amber-400 font-semibold gap-1 min-w-[70px] justify-end">
          Fastest <Zap className="w-4 h-4" />
        </div>
      </div>

      {/* Quick Alpha Buttons */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {[0.0, 0.25, 0.5, 0.75, 1.0].map((val) => (
          <button
            key={val}
            onClick={() => onChangeAlpha(val)}
            className={`py-1 rounded text-[11px] font-semibold border transition-all ${
              alpha === val
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {val === 0 ? 'Min CO₂' : val === 1 ? 'Min Time' : `α=${val}`}
          </button>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onOptimize}
        disabled={isOptimizing}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
      >
        {isOptimizing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            Solving VRP Route (Async Queue...)...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 text-slate-950" />
            Optimize Fleet Route (α = {alpha})
          </>
        )}
      </button>
    </div>
  );
}
