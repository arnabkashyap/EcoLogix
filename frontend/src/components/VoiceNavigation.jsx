import React, { useState, useEffect } from 'react';
import { fetchTurnByTurnSteps, speakInstruction, stopSpeech } from '../utils/navigation';
import {
  Navigation,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Zap,
  Leaf,
  Scale,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  GitMerge,
  Flag,
  AlertTriangle,
  Radio,
} from 'lucide-react';

export function VoiceNavigation({ route, onExit }) {
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);

  const category = route?.category || 'green'; // 'fast' | 'green' | 'balanced'

  const getCategoryBadge = () => {
    if (category === 'fast') {
      return (
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> ⚡ Fast Route Guidance
        </span>
      );
    }
    if (category === 'balanced') {
      return (
        <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Scale className="w-3.5 h-3.5 text-teal-400" /> ⚖️ Balanced Route Guidance
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-md">
        <Leaf className="w-3.5 h-3.5 text-emerald-400" /> 🌿 Carbon-Optimal Voice Guidance
      </span>
    );
  };

  useEffect(() => {
    async function loadSteps() {
      setLoading(true);
      const waypoints = route?.waypoints || [];
      const origin = waypoints[0] || { lat: 26.1214, lng: 91.7319, name: 'Betkuchi ISBT Freight Terminal' };
      const dest = waypoints[waypoints.length - 1] || { lat: 26.1852, lng: 91.6811, name: 'ICD Amingaon Container Depot' };
      const fetchedSteps = await fetchTurnByTurnSteps(origin, dest, waypoints.slice(1, -1));

      setSteps(fetchedSteps);
      setLoading(false);
    }
    if (route) {
      loadSteps();
    }

    return () => {
      stopSpeech();
    };
  }, [route]);

  const speakCurrent = (stepIdx) => {
    if (!soundEnabled || !steps[stepIdx]) return;
    setIsSpeaking(true);
    speakInstruction(steps[stepIdx].instruction, {
      rate: 0.95,
      pitch: 1.0,
      onEnd: () => setIsSpeaking(false),
    });
  };

  const handleStartNav = () => {
    setIsNavigating(true);
    setCurrentStepIdx(0);
    speakCurrent(0);
  };

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      speakCurrent(nextIdx);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      speakCurrent(prevIdx);
    }
  };

  const handleRepeatVoice = () => {
    speakCurrent(currentStepIdx);
  };

  const handleToggleSound = () => {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    if (!nextSound) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      speakCurrent(currentStepIdx);
    }
  };

  const currentStep = steps[currentStepIdx];

  // Directional Maneuver Icon Resolver
  const renderManeuverIcon = (step) => {
    if (!step) return <Navigation className="w-7 h-7 text-emerald-400" />;
    if (step.type === 'arrive') return <Flag className="w-7 h-7 text-emerald-400" />;
    if (step.modifier?.includes('left')) return <CornerUpLeft className="w-7 h-7 text-cyan-400" />;
    if (step.modifier?.includes('right')) return <CornerUpRight className="w-7 h-7 text-emerald-400" />;
    if (step.type === 'merge') return <GitMerge className="w-7 h-7 text-amber-400" />;
    return <ArrowUp className="w-7 h-7 text-emerald-400" />;
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Category Banner Pinned at Top */}
      <div className="flex justify-center mb-2">{getCategoryBadge()}</div>

      <div className="bg-[#0B0E14]/95 border-2 border-emerald-500/50 backdrop-blur-2xl rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
        {/* Navigation Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                <span>Turn-by-Turn Voice Navigation</span>
                {isSpeaking && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-ping" />
                    Speaking
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">Driver Spoken Navigation Assistant</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
              title={soundEnabled ? 'Mute voice audio' : 'Enable voice audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                stopSpeech();
                onExit();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer"
              title="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center text-slate-400 text-xs">
            Synthesizing optimal turn-by-turn route maneuvers...
          </div>
        )}

        {/* Pre-Start Prompt Button */}
        {!loading && !isNavigating && (
          <div className="p-4 rounded-xl bg-[#121722] border border-slate-800 text-center space-y-3">
            <div className="text-slate-300 font-medium text-xs">
              {steps.length} navigation maneuvers prepared. Ready for live turn-by-turn voice prompts.
            </div>
            <button
              onClick={handleStartNav}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-slate-950 fill-slate-950" />
              Start Spoken Voice Navigation
            </button>
          </div>
        )}

        {/* Active Navigation Step Display */}
        {!loading && isNavigating && currentStep && (
          <div className="space-y-3">
            {/* Big Driver Maneuver Display Card */}
            <div className="p-4 rounded-xl bg-[#121722] border border-emerald-500/40 shadow-inner flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                {renderManeuverIcon(currentStep)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    Maneuver {currentStepIdx + 1} of {steps.length}
                  </span>
                  {currentStep.distance > 0 ? (
                    <span className="text-emerald-400 font-bold">{currentStep.distance}m ahead</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">At Destination</span>
                  )}
                </div>

                <div className="text-base font-black text-slate-100 leading-snug">
                  {currentStep.instruction}
                </div>
              </div>
            </div>

            {/* Voice Replay & Progress Strip */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handleRepeatVoice}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Speak instruction again"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repeat Voice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIdx === 0}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Previous maneuver"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {currentStepIdx < steps.length - 1 ? (
                  <button
                    onClick={handleNextStep}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>Next Turn</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      stopSpeech();
                      onExit();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done</span>
                  </button>
                )}
              </div>
            </div>

            {/* Driver Cab Eco-Tip Footer */}
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300/90 flex items-center gap-2">
              <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Eco Tip: Maintain 50–55 km/h cruise speed to maximize diesel fuel efficiency and cut CO₂.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
