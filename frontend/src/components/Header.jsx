import React from 'react';
import { Leaf } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-3">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 p-2 shadow-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Eco<span className="text-emerald-400">Logix</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Multiple Transport Types Route & Eco-Friendly Goods Transportation Engine
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
