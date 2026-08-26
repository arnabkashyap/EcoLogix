import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, ShieldCheck, RefreshCw, Layers, HelpCircle, ArrowRight } from 'lucide-react';

export function Header({ onOpenDemoGuide }) {
  const { tenant, activeCompanyKey, loginAsCompany, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
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
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">HACKATHON BUILD</span>
          </div>
          <p className="text-xs text-slate-400 font-medium hidden md:block">
            Multimodal Route & Carbon-Aware Logistics Engine
          </p>
        </div>
      </div>

      {/* Multi-Tenant Switcher (Proof of Tenant Isolation) */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <span className="text-xs font-semibold text-slate-400 px-3 flex items-center gap-1.5 hidden sm:flex">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Tenant:
        </span>
        <button
          onClick={() => loginAsCompany('A')}
          disabled={loading}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeCompanyKey === 'A'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Company A <span className="text-[10px] opacity-75">(Northwind)</span>
        </button>
        <button
          onClick={() => loginAsCompany('B')}
          disabled={loading}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeCompanyKey === 'B'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Company B <span className="text-[10px] opacity-75">(Apex)</span>
        </button>
      </div>

      {/* Active Tenant Status Badge & Demo Helper */}
      <div className="flex items-center space-x-3">
        {tenant && (
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">{tenant.company_name}</span>
            <span className="mono-font text-[10px] text-slate-500">[{tenant.tenant_id}]</span>
          </div>
        )}

        <button
          onClick={onOpenDemoGuide}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
          4-Min Demo Script
        </button>
      </div>
    </header>
  );
}
