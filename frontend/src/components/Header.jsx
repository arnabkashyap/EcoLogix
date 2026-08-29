import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, ShieldCheck, HelpCircle, Settings } from 'lucide-react';

export function Header({ onOpenDemoGuide }) {
  const { tenant, activeCompanyKey, loginAsCompany, loading } = useAuth();
  const [showControls, setShowControls] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4 relative">
      {/* Brand Logo & Pitch Tagline */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Eco<span className="text-emerald-400">Logix</span></h1>
          </div>
          <p className="text-xs text-slate-400 font-medium hidden md:block">
            Multiple Transport Types Route & Eco-Friendly Goods Transportation Engine
          </p>
        </div>
      </div>

      {/* Demo / Judge Controls Toggle Button */}
      <div className="relative">
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Settings className="w-4 h-4 text-emerald-400" />
          <span>Demo Controls</span>
        </button>

        {/* Collapsed Dropdown Menu */}
        {showControls && (
          <div className="absolute right-0 mt-2 w-72 p-4 rounded-2xl glass-panel border border-slate-800 shadow-2xl bg-slate-950/95 space-y-4 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-800">
              <span>Demo / Judge Controls</span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>

            {/* Tenant Switcher */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Switch Tenant:
              </div>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => loginAsCompany('A')}
                  disabled={loading}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    activeCompanyKey === 'A'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Company A
                </button>
                <button
                  onClick={() => loginAsCompany('B')}
                  disabled={loading}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    activeCompanyKey === 'B'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Company B
                </button>
              </div>
            </div>

            {/* Active Tenant Status */}
            {tenant && (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300 font-medium">{tenant.company_name}</span>
                </div>
                <span className="mono-font text-[10px] text-slate-500">[{tenant.tenant_id}]</span>
              </div>
            )}

            {/* Demo Guide Script Button */}
            <button
              onClick={() => {
                setShowControls(false);
                onOpenDemoGuide();
              }}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-teal-400" />
              4-Min Demo Script
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
