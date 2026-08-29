import React from 'react';
import { Bell, Package, CheckCircle2, AlertTriangle, CloudRain, Sparkles } from 'lucide-react';

export default function MobileAlerts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Driver Alerts & Telemetry <Bell className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Real-time hazard notifications & load pooling opportunities
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 2 Active Alerts
        </span>
      </div>

      <div className="space-y-4">
        {/* Load Pool Opportunity Alert */}
        <div className="bg-[#121722]/90 border-l-4 border-l-amber-400 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100">Return Load Pooling Available</h3>
                <p className="text-xs text-slate-400 font-medium">Guwahati Hub ➔ Shillong Cargo Depot</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold">
              HIGH CO₂ SAVINGS
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            Your return trip from Guwahati has a 400 kg candidate load available. Accepting this reduces empty distance by 102 km and saves up to 14.2 kg CO₂.
          </p>
        </div>

        {/* Weather Hazard Alert */}
        <div className="bg-[#121722]/90 border-l-4 border-l-cyan-400 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100">Weather Risk Telemetry Warning</h3>
                <p className="text-xs text-slate-400 font-medium">National Highway 37 Flood Zone</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold">
              MODERATE RAIN
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            Light waterlogging detected near Jorhat bypass. Recommended speed limit: 55 km/h. Fuel consumption estimated +6%.
          </p>
        </div>

        {/* Completed Trip Notification */}
        <div className="bg-[#121722]/60 border-l-4 border-l-emerald-500 border border-slate-800/60 rounded-2xl p-5 shadow-lg space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Trip Completed & Audited</h3>
                <p className="text-xs text-slate-400 font-medium">Jorhat ➔ Guwahati Hub</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Passed DoD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
