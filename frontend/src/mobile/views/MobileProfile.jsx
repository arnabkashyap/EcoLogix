import React from 'react';
import { User, Truck, ShieldCheck, Leaf, Award, ExternalLink, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MobileProfile({ onExit }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Driver Profile & Credentials
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Certified EcoLogix Heavy Fleet Driver
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
        </span>
      </div>

      {/* Profile Info Card */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg shadow-emerald-500/10">
          <User className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-100">John Doe</h3>
          <p className="text-xs text-slate-400 font-mono font-semibold">Driver ID: DRV-001 • Class 1 Heavy License</p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" /> Eco-Tier Driver Gold
          </span>
        </div>
      </div>

      {/* Vehicle Specs */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" /> Assigned Vehicle Details
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Vehicle Name</span>
            <span className="text-slate-100 font-bold font-mono">NW Heavy Freightliner #101</span>
          </div>
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Vehicle Class</span>
            <span className="text-slate-100 font-bold">Heavy Truck (MHCV)</span>
          </div>
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Max Payload Capacity</span>
            <span className="text-slate-100 font-bold font-mono">18,000 kg</span>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" /> Cumulative Lifetime Impact
        </h3>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-[#0B0E14]/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Completed Trips</span>
            <span className="text-xl font-black text-slate-100 font-mono">124</span>
          </div>
          <div className="bg-[#0B0E14]/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">CO₂ Saved</span>
            <span className="text-xl font-black text-emerald-400 font-mono">1,402 kg</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <button
        onClick={() => {
          if (onExit) onExit();
          else navigate('/');
        }}
        className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
      >
        <ExternalLink className="w-4 h-4 text-emerald-400" />
        Switch to Consumer Hub
      </button>
    </div>
  );
}
