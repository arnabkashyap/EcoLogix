import React, { useState } from 'react';
import { api } from '../services/api';
import { Layers, ShieldCheck, RefreshCw, ArrowRight, DollarSign, Leaf, Lock } from 'lucide-react';

export function LoadPoolPanel() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestingCompany, setRequestingCompany] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const handleTriggerMatch = async () => {
    setLoading(true);
    try {
      const res = await api.matchLoadPool();
      setMatches(res.matches || []);
      setRequestingCompany(res.requesting_company);
      setHasRun(true);
    } catch (err) {
      console.error('Load pool match error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Cross-Company Load Pool Engine
          </h3>
          <p className="text-xs text-slate-400">
            Find empty return legs from other carriers to haul your shipments for free CO₂ & cost.
          </p>
        </div>

        <button
          onClick={handleTriggerMatch}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              Matching Corridor Proximity...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-slate-950" />
              Trigger Load Pool Match
            </>
          )}
        </button>
      </div>

      {/* Multi-Tenant Boundary Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-4">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-emerald-400">Tenant Isolation Boundary:</span>
          <span>Only match opportunities are visible — partner internal shipment rosters remain 100% private.</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono">
          JWT Verified
        </span>
      </div>

      {/* Matches List */}
      {!hasRun && (
        <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-400">No load pool match executed yet</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Click "Trigger Load Pool Match" above to evaluate cross-tenant empty leg opportunities.
          </div>
        </div>
      )}

      {hasRun && matches.length === 0 && (
        <div className="p-6 text-center text-xs text-slate-400">
          No load pool matches found for current corridor constraints.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="glass-panel-glow p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Matched Leg ({Math.round(match.match_score * 100)}% Match)
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Isolated
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100 mb-1">{match.empty_leg_title}</h4>
              <div className="text-xs text-slate-300 font-medium mb-3 flex items-center gap-1">
                <span>{match.origin_name}</span>
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{match.dest_name}</span>
              </div>

              {/* Metrics Badge */}
              <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">CO₂ Avoided</div>
                  <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5" /> -{match.co2_saved_kg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Cost Saved</div>
                  <div className="text-amber-400 font-bold text-sm flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> ${match.cost_saved_usd}
                  </div>
                </div>
              </div>
            </div>

            {/* Proof Tagline */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
              <span>Host Carrier: <strong className="text-slate-200">{match.carrier_b_name}</strong></span>
              <span className="text-emerald-400 font-semibold">Zero Extra Trucks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
