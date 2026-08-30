import React, { useEffect, useState } from 'react';
import { fetchDriverAlerts, fetchDriverStatus } from '../../services/api';
import { Bell, Package, CheckCircle2, AlertTriangle, CloudRain, Sparkles, RefreshCw } from 'lucide-react';

export default function MobileAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        const res = await fetchDriverAlerts().catch(() => null);
        if (res?.alerts && res.alerts.length > 0) {
          setAlerts(res.alerts);
        } else {
          const statusRes = await fetchDriverStatus().catch(() => null);
          if (statusRes?.hazard_alerts) {
            setAlerts(statusRes.hazard_alerts);
          }
        }
      } catch (err) {
        console.warn('Alerts fetch warning:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Warnings & Updates <Bell className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Road hazard telemetry and live load opportunities
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> {alerts.length} Active Alerts
        </span>
      </div>

      {loading && alerts.length === 0 && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Fetching live hazard telemetry...</p>
        </div>
      )}

      <div className="space-y-4">
        {alerts.map((alert) => {
          const isWarning = alert.type === 'warning' || alert.type === 'hazard';
          return (
            <div
              key={alert.id || alert.title}
              className={`bg-[#121722]/90 border-l-4 ${
                isWarning ? 'border-l-amber-400' : 'border-l-cyan-400'
              } border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${
                      isWarning
                        ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                        : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                    } flex items-center justify-center font-bold`}
                  >
                    {isWarning ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100">{alert.title || alert.message}</h3>
                    <p className="text-xs text-slate-400 font-medium">{alert.location || 'Guwahati Corridor'}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full ${
                    isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                  } text-[10px] font-extrabold`}
                >
                  {alert.co2_impact || (isWarning ? 'HAZARD AHEAD' : 'LOAD MATCH')}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
                {alert.message}
              </p>
            </div>
          );
        })}

        {/* Historical Verified Trip Record */}
        <div className="bg-[#121722]/60 border-l-4 border-l-emerald-500 border border-slate-800/60 rounded-2xl p-5 shadow-lg space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Trip Audit Completed</h3>
                <p className="text-xs text-slate-400 font-medium">Betkuchi ISBT ➔ ICD Amingaon</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">✓ Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
