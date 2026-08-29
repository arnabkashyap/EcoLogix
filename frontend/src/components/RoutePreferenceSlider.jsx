import React from 'react';
import { Leaf, Sliders, Zap, AlertTriangle, Sparkles } from 'lucide-react';

// Exactly 3 discrete stops:
// Position 0: "Greenest" -> alpha = 0.0
// Position 1: "Optimal" -> alpha = 0.5
// Position 2: "Most Polluted" -> alpha = 1.0
export const ROUTE_PREFERENCE_STOPS = [
  {
    index: 0,
    alpha: 0.0,
    label: 'Greenest',
    sublabel: 'Max CO₂ Savings',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/40',
    description: 'Prioritizes lowest possible emissions and fuel burn over travel time.',
    icon: Leaf,
  },
  {
    index: 1,
    alpha: 0.5,
    label: 'Optimal',
    sublabel: 'Balanced Trade-off',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/40',
    description: 'Pareto-optimal balance between speed and carbon efficiency.',
    icon: Sparkles,
  },
  {
    index: 2,
    alpha: 1.0,
    label: 'Most Polluted',
    sublabel: 'Max Speed (High CO₂)',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/40',
    description: 'Prioritizes fastest arrival along highway corridors, resulting in higher emissions.',
    icon: Zap,
  },
];

export function RoutePreferenceSlider({ alpha = 0.5, onChangeAlpha, disabled = false }) {
  // Map current alpha (0.0, 0.5, 1.0) to discrete index (0, 1, 2)
  const getCurrentIndex = (val) => {
    if (val <= 0.2) return 0;
    if (val >= 0.8) return 2;
    return 1;
  };

  const currentIndex = getCurrentIndex(alpha);
  const currentStop = ROUTE_PREFERENCE_STOPS[currentIndex];

  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    const targetStop = ROUTE_PREFERENCE_STOPS[newIndex] || ROUTE_PREFERENCE_STOPS[1];
    if (onChangeAlpha) {
      // Strictly emit fixed discrete alpha: 0.0, 0.5, or 1.0
      onChangeAlpha(targetStop.alpha);
    }
  };

  const handleStopClick = (targetAlpha) => {
    if (disabled) return;
    if (onChangeAlpha) {
      onChangeAlpha(targetAlpha);
    }
  };

  return (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header & Selected Badge */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-black text-slate-100">Route Carbon Preference</h2>
        </div>
        <span
          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${currentStop.bgColor} ${currentStop.color} ${currentStop.borderColor} font-mono`}
        >
          {currentStop.label} (α = {currentStop.alpha.toFixed(1)})
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        {currentStop.description}
      </p>

      {/* Discrete 3-Stop Slider Track */}
      <div className="space-y-2 pt-1">
        <div className="relative px-1">
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={currentIndex}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2.5 bg-[#0B0E14] rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none disabled:opacity-50 border border-slate-800"
            aria-label="Route Carbon Preference: Greenest, Optimal, or Most Polluted"
          />
          {/* Tick Dots along track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          </div>
        </div>

        {/* Permanent Visual Tick Labels Below Track */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          {ROUTE_PREFERENCE_STOPS.map((stop) => {
            const isSelected = stop.index === currentIndex;
            const Icon = stop.icon;
            return (
              <button
                key={stop.index}
                type="button"
                onClick={() => handleStopClick(stop.alpha)}
                disabled={disabled}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer select-none flex flex-col items-start ${
                  isSelected
                    ? `${stop.bgColor} ${stop.borderColor} shadow-md`
                    : 'bg-[#0B0E14]/60 border-slate-800/80 hover:bg-[#0B0E14] text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1 w-full justify-between">
                  <span
                    className={`text-[11px] font-black ${
                      isSelected ? stop.color : 'text-slate-300'
                    }`}
                  >
                    {stop.label}
                  </span>
                  <Icon
                    className={`w-3 h-3 ${
                      isSelected ? stop.color : 'text-slate-500'
                    }`}
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  α = {stop.alpha.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
