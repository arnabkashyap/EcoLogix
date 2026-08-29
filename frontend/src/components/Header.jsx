import React from 'react';
import { Leaf, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDriverMode = location.pathname.includes('/driver');

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4 relative">
      {/* Brand Logo & Pitch Tagline */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
          <div className="w-full h-full bg-[#181A20] rounded-[10px] flex items-center justify-center">
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

      {/* Navigation Toggle */}
      <div className="flex items-center bg-[#0B0F17] p-1 rounded-full border border-slate-800 shrink-0">
        <button 
          onClick={() => navigate('/')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            !isDriverMode 
              ? 'bg-slate-800 text-slate-100 shadow-sm cursor-default' 
              : 'text-slate-400 hover:text-slate-200 font-medium cursor-pointer'
          }`}
        >
          <Leaf className={`w-3.5 h-3.5 ${!isDriverMode ? 'text-emerald-400' : ''}`} />
          Admin Console
        </button>
        <button 
          onClick={() => navigate('/driver')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            isDriverMode 
              ? 'bg-slate-800 text-slate-100 shadow-sm cursor-default' 
              : 'text-slate-400 hover:text-slate-200 font-medium cursor-pointer'
          }`}
        >
          <Truck className={`w-3.5 h-3.5 ${isDriverMode ? 'text-emerald-400' : ''}`} />
          Driver Mode
        </button>
      </div>
    </header>
  );
}
