import React from 'react';
import { Leaf, Truck, HelpCircle, Navigation } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Header({ onOpenDemoGuide }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDriverMode = location.pathname.startsWith('/driver');

  return (
    <header className="sticky top-0 z-50 bg-[#0B0E14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 py-3 shadow-2xl">
      <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 p-2 shadow-lg shadow-emerald-500/10 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Eco<span className="text-emerald-400">Logix</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                {isDriverMode ? 'Driver App' : 'Admin Panel'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden md:block">
              Save fuel, cut CO₂, find shared loads — all in one place
            </p>
          </div>
        </div>

        {/* Navigation Mode Switcher & Actions */}
        <div className="flex items-center gap-3">
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
              Admin Panel
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
  );
}
