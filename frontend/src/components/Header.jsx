import React from 'react';
import { Leaf } from 'lucide-react';

export function Header() {
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
    </header>
  );
}
