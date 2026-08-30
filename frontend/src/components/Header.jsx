import React, { useState } from 'react';
import { Leaf, Truck, HelpCircle, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MockScenarioPicker } from './MockScenarioPicker';
import { notifyScenarioSelected } from '../services/api';

export function Header({ onOpenDemoGuide }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDriverMode = location.pathname.startsWith('/driver');
  const [isScenarioPickerOpen, setIsScenarioPickerOpen] = useState(false);

  const handleSelectScenario = (scenario) => {
    notifyScenarioSelected(scenario);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0B0E14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 py-3 shadow-2xl">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 p-2 shadow-lg shadow-emerald-500/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Eco<span className="text-emerald-400">Logix</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium hidden md:block">
                Save fuel, cut CO₂, find shared loads — all in one place
              </p>
            </div>
          </div>

          {/* Navigation Mode Switcher & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick 50 Scenarios Picker Button */}
            <button
              onClick={() => setIsScenarioPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-black border border-emerald-500/40 shadow-sm transition-all cursor-pointer select-none"
              title="Browse 50 instant mock data scenarios"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>50 Scenarios</span>
            </button>

            {onOpenDemoGuide && (
              <button
                onClick={onOpenDemoGuide}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                How It Works
              </button>
            )}

          <div className="flex items-center bg-[#0B0F17] p-1 rounded-full border border-slate-800 shrink-0 shadow-inner">
            <button
              onClick={() => navigate('/')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isDriverMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm cursor-default'
                  : 'text-slate-400 hover:text-slate-200 font-medium cursor-pointer'
              }`}
            >
              <Leaf className={`w-3.5 h-3.5 ${!isDriverMode ? 'text-emerald-400' : ''}`} />
              Consumer Hub
            </button>
            <button
              onClick={() => navigate('/driver')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isDriverMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm cursor-default'
                  : 'text-slate-400 hover:text-slate-200 font-medium cursor-pointer'
              }`}
            >
              <Truck className={`w-3.5 h-3.5 ${isDriverMode ? 'text-emerald-400' : ''}`} />
              Driver App
            </button>
          </div>
        </div>
      </div>
    </header>

    <MockScenarioPicker
      isOpen={isScenarioPickerOpen}
      onClose={() => setIsScenarioPickerOpen(false)}
      onSelectScenario={handleSelectScenario}
    />
  </>
);
}
