import React from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2 } from 'lucide-react';

export function WalkthroughTooltip({ step, onNext, onPrev, onDismiss }) {
  if (step < 0 || step >= 3) return null;

  const steps = [
    {
      title: '1. CO₂ Savings Headline',
      target: 'Headline Banner',
      description:
        'See your route\'s CO₂ reduction and distance savings in plain English at a glance right at the top of the dashboard.',
    },
    {
      title: '2. Fastest ↔ Greenest Slider',
      target: 'Route Preference Slider',
      description:
        'Adjust the slider to prioritize maximum CO₂ reduction or fastest delivery time for your fleet.',
    },
    {
      title: '3. Shared Return Trips',
      target: 'Load Pooling Panel',
      description:
        'Find empty return legs from partner carriers to haul shipments with zero extra trucks and 100% data privacy.',
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed bottom-6 right-6 z-[999] max-w-sm w-full glass-panel p-4 rounded-2xl border border-emerald-500/40 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 bg-slate-950/95">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Quick Tour • Step {step + 1} of 3</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Dismiss walkthrough"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h4 className="text-sm font-bold text-slate-100 mb-1">{currentStep.title}</h4>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {currentStep.description}
      </p>

      <div className="flex items-center justify-between">
        <button
          onClick={onDismiss}
          className="text-[11px] text-slate-400 hover:text-slate-200 font-medium transition-colors"
        >
          Skip Tour
        </button>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={onPrev}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}

          <button
            onClick={step === 2 ? onDismiss : onNext}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {step === 2 ? (
              <>
                Got it <CheckCircle2 className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Next <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
