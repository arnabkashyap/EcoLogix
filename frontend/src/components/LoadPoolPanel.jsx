import React, { useState } from 'react';
import { api } from '../services/api';
import { Layers, ShieldCheck, RefreshCw, ArrowRight, DollarSign, Leaf, Lock, CheckCircle2, Truck, Eye } from 'lucide-react';

export function LoadPoolPanel({ onMatchTriggered }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestingCompany, setRequestingCompany] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

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
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Empty Trip Opportunity (Load Pooling)</h3>
          <p className="text-[11px] text-slate-400">Combine return journeys with other logistics providers to eliminate empty truck miles.</p>
        </div>

        <button
          onClick={handleTriggerMatch}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              Scanning...
            </>
          ) : (
            'Find Opportunities'
          )}
        </button>
      </div>

      {/* 3-Step Plain Language Visual Diagram (Req #7) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-[10px]">1</span>
          <span className="text-slate-300 font-medium">Empty return trip</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 border border-teal-500/30 text-[10px]">2</span>
          <span className="text-slate-300 font-medium">Cargo along route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30 text-[10px]">3</span>
          <span className="text-slate-300 font-medium">Combine & save CO₂</span>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between space-y-2 text-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Leaf className="w-3 h-3 text-emerald-400" /> {Math.round(match.match_score * 100)}% Route Compatibility
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Zero Extra Miles
                </span>
              </div>

              {/* Prominent Impact Statement */}
              <div className="p-3 rounded-lg bg-slate-950/90 border border-emerald-500/30 text-xs font-medium text-slate-200 leading-relaxed mb-3">
                Partnering with <strong className="text-emerald-400 font-bold">{match.carrier_b_name}</strong> avoids an extra truck run — saving <strong className="text-emerald-400 font-bold">{match.co2_saved_kg} kg CO₂</strong> and <strong className="text-amber-300 font-bold">${match.cost_saved_usd}</strong>.
              </div>

              <h4 className="text-xs font-bold text-slate-100 mb-1">{match.empty_leg_title}</h4>
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <span>{match.origin_name}</span>
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{match.dest_name}</span>
              </div>
            </div>

            {/* Impact Metric Chips & CTA */}
            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded bg-slate-900 text-emerald-300 font-bold border border-slate-800">
                  -{match.co2_saved_kg} kg CO₂
                </span>
                <span className="px-2 py-1 rounded bg-slate-900 text-amber-300 font-bold border border-slate-800">
                  -${match.cost_saved_usd} Cost
                </span>
              </div>

              <button
                onClick={() => setSelectedMatch(selectedMatch === match.id ? null : match.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                View Match
              </button>
            </div>

            {selectedMatch === match.id && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 space-y-1 animate-in fade-in">
                <div className="font-bold text-emerald-400">Match Details Verified</div>
                <div>Carrier Partner: <span className="font-semibold text-slate-100">{match.carrier_b_name}</span></div>
                <div>Corridor: <span className="font-mono text-slate-200">{match.origin_name} → {match.dest_name}</span></div>
                <div className="text-emerald-300 font-medium text-[10px] pt-1 border-t border-slate-800">
                  ✓ Combined journey uses existing vehicle capacity without triggering a secondary return trip.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
