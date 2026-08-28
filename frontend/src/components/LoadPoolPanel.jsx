import React, { useState } from 'react';
import { api } from '../services/api';
import { Layers, ShieldCheck, RefreshCw, ArrowRight, DollarSign, Leaf, Lock, CheckCircle2 } from 'lucide-react';

export function LoadPoolPanel({ onMatchTriggered }) {
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
      if (onMatchTriggered) {
        onMatchTriggered();
      }
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
            Find a Return Shipment
          </h3>
          <p className="text-xs text-slate-400">
            Cross-Company Combine Shipments Engine — Find empty return legs from other transport companies to haul your shipments for free CO₂ & cost.
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
              Finding matches...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-slate-950" />
              Find a Match
            </>
          )}
        </button>
      </div>

      {/* Multi-Tenant Boundary Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-4">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your shipment data stays private — we only show potential matches, not company data.</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono shrink-0">
          JWT Verified
        </span>
      </div>

      {/* Matches List */}
      {!hasRun && (
        <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-400">No load pool match executed yet</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Click "Find a Match" above to evaluate cross-tenant empty leg opportunities.
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
                  <Leaf className="w-3 h-3" /> Matched Return Leg ({Math.round(match.match_score * 100)}% Match)
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Isolated
                </span>
              </div>

              {/* Prominent Sentence Presentation (Req #7) */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-xs font-medium text-slate-200 leading-relaxed mb-3">
                Matched with <strong className="text-emerald-400 font-bold">{match.carrier_b_name}</strong>'s empty return leg — saves <strong className="text-emerald-400 font-bold">{match.co2_saved_kg} kg CO₂</strong> and <strong className="text-amber-400 font-bold">${match.cost_saved_usd}</strong>.
              </div>

              <h4 className="text-xs font-bold text-slate-300 mb-1">{match.empty_leg_title}</h4>
              <div className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1">
                <span>{match.origin_name}</span>
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{match.dest_name}</span>
              </div>
            </div>

            {/* Proof Tagline */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
              <span>Transport Company: <strong className="text-slate-200">{match.carrier_b_name}</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zero Extra Trucks
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
