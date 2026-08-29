import React, { useState, useEffect } from 'react';
import { fetchTurnByTurnSteps, speakInstruction } from '../utils/navigation';
import { Navigation, Volume2, VolumeX, X, ChevronRight, Zap, Leaf, Scale, CheckCircle2 } from 'lucide-react';

export function VoiceNavigation({ route, onExit }) {
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const category = route?.category || 'green'; // 'fast' | 'green' | 'balanced'

  const getCategoryBadge = () => {
    if (category === 'fast') {
      return (
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> ⚡ Fast Route Navigation Active
        </span>
      );
    }
    if (category === 'balanced') {
      return (
        <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Scale className="w-3.5 h-3.5 text-teal-400" /> ⚖️ Balanced Route Navigation Active
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
        <Leaf className="w-3.5 h-3.5 text-emerald-400" /> 🌿 Green Route Navigation Active
      </span>
    );
  };

  useEffect(() => {
    async function loadSteps() {
      setLoading(true);
      const waypoints = route?.waypoints || [];
      const origin = waypoints[0] || { lat: 28.6139, lng: 77.2090 };
      const dest = waypoints[waypoints.length - 1] || { lat: 28.4595, lng: 77.0266 };
      const fetchedSteps = await fetchTurnByTurnSteps(origin, dest, waypoints.slice(1, -1));
      setSteps(fetchedSteps);
      setLoading(false);
    }
    if (route) {
      loadSteps();
    }
  }, [route]);

  const handleStartNav = () => {
    setIsNavigating(true);
    setCurrentStepIdx(0);
    if (steps.length > 0 && soundEnabled) {
      speakInstruction(steps[0].instruction);
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      if (soundEnabled) {
        speakInstruction(steps[nextIdx].instruction);
      }
    }
  };

  const currentStep = steps[currentStepIdx];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[600] w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Category Banner Pinned at Top */}
      <div className="flex justify-center mb-2">
        {getCategoryBadge()}
      </div>

      <div className="bg-slate-950/95 border border-emerald-500/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl space-y-4 text-xs text-slate-100">
        {/* Navigation Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <div className="font-extrabold text-sm text-slate-100">Turn-by-Turn Voice Guidance</div>
              <div className="text-[11px] text-slate-400">Real-time driver route navigation</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer"
              title="Exit Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-6 text-center text-slate-400">
            Calculating optimal turn-by-turn route steps...
          </div>
        )}

        {/* Pre-Start Prompt Button (Required by Mobile Browser Audio Policies) */}
        {!loading && !isNavigating && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
            <div className="text-slate-300 font-medium text-xs">
              Route ready ({steps.length} navigation steps). Tap to start voice guidance.
            </div>
            <button
              onClick={handleStartNav}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-slate-950 fill-slate-950" />
              Start Voice Navigation
            </button>
          </div>
        )}

        {/* Active Navigation Step Display */}
        {!loading && isNavigating && currentStep && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Step {currentStepIdx + 1} of {steps.length}</span>
                {currentStep.distance > 0 && (
                  <span className="text-emerald-400 font-bold">{currentStep.distance}m ahead</span>
                )}
              </div>

              <div className="text-sm font-bold text-slate-100 leading-snug">
                {currentStep.instruction}
              </div>
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                {currentStep.type === 'arrive' ? '✓ Route Completed' : 'Advancing with GPS position...'}
              </span>

              {currentStepIdx < steps.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onExit}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Done</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
