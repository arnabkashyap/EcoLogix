import React, { useState } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { api } from '../services/api';
import {
  Layers, ShieldCheck, RefreshCw, ArrowRight, DollarSign,
  Leaf, Lock, CheckCircle2, Truck, Eye, ChevronUp,
} from 'lucide-react';
import {
  EASE_EMPHASIZED,
  DURATION_STANDARD,
} from '../motion';

// ── Shared transition used on every animated element in this panel ───────────
const layoutTransition = {
  type: 'spring',
  duration: DURATION_STANDARD,
  ease: EASE_EMPHASIZED,
  bounce: 0.12,
};

// ── Detail reveal: fades + slides up as card expands ─────────────────────────
const detailVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_STANDARD, ease: EASE_EMPHASIZED, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.12, ease: EASE_EMPHASIZED },
  },
};

export function LoadPoolPanel({ onMatchTriggered }) {
  const [matches, setMatches] = useState([]);
  const [rejectedCandidates, setRejectedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestingCompany, setRequestingCompany] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showRejected, setShowRejected] = useState(false);

  const handleTriggerMatch = async () => {
    setLoading(true);
    try {
      const res = await api.matchLoadPool();
      setMatches(res.matches || []);
      setRejectedCandidates(res.rejected_candidates || []);
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
    <div className="bg-[#0E131F] p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            🚛 Empty Trip Opportunity (Load Pooling)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Combine return journeys with other logistics providers to eliminate empty truck miles.
          </p>
        </div>

        <button
          onClick={handleTriggerMatch}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              Scanning opportunities...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-slate-950" />
              Find Empty Trip Opportunities
            </>
          )}
        </button>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827]/60 border border-slate-800/80 text-xs mb-4">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your company data stays isolated — only shared route opportunities are matched.</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#1F2937] text-[10px] text-emerald-400 border border-slate-700 font-mono shrink-0">
          JWT Isolated
        </span>
      </div>

      {/* Empty State */}
      {!hasRun && (
        <div className="p-8 text-center border-2 border-dashed border-slate-800/80 rounded-xl bg-[#181A20]/40">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">Ready to discover empty-trip opportunities</div>
          <div className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
            Click "Find Empty Trip Opportunities" above to check cross-company load pooling matches.
          </div>
        </div>
      )}

      {hasRun && matches.length === 0 && (
        <div className="p-6 text-center text-xs text-slate-400 bg-[#181A20]/40 border border-slate-800 rounded-xl">
          No compatible empty-trip opportunities found right now. Check back when new shipment routes are posted.
        </div>
      )}

      {/* ── Matches Grid ────────────────────────────────────────────────────────
          Each card is a motion.div with:
            - layoutId={`match-${match.id}`}  — identifies this card across
              future positional shifts (filtering/sorting)
            - layout                           — lets Framer animate the card's
              size change (card grows when detail opens) entirely via CSS
              transform (scaleY), never via height/width, so no layout thrash
          The detail panel inside uses AnimatePresence + motion.div so it
          fades+slides up as the card expands, and fades+slides down on close.
          LayoutGroup wraps the grid so sibling cards reflow smoothly when one
          expands.
      ──────────────────────────────────────────────────────────────────────── */}
      <LayoutGroup>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => {
            const isExpanded = selectedMatch === match.id;

            return (
              <motion.div
                key={match.id}
                layoutId={`match-${match.id}`}
                layout
                transition={layoutTransition}
                className="glass-panel-glow p-4 rounded-xl border border-emerald-500/40 flex flex-col justify-between space-y-3 accelerated-ui-element"
                style={{ originY: 0 }}  // scale from top so grid stays stable
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
                  <div className="p-3 rounded-lg bg-[#181A20]/90 border border-emerald-500/30 text-xs font-medium text-slate-200 leading-relaxed mb-3">
                    Partnering with <strong className="text-emerald-400 font-bold">{match.carrier_b_name}</strong> avoids
                    a separate truck run — saving{' '}
                    <strong className="text-emerald-400 font-bold">{match.co2_saved_kg} kg CO₂</strong> and{' '}
                    <strong className="text-amber-300 font-bold">${match.cost_saved_usd}</strong>.
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
                    <span className="px-2 py-1 rounded bg-[#111827] text-emerald-300 font-bold border border-slate-800">
                      -{match.co2_saved_kg} kg CO₂
                    </span>
                    <span className="px-2 py-1 rounded bg-[#111827] text-amber-300 font-bold border border-slate-800">
                      -${match.cost_saved_usd} Cost
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedMatch(isExpanded ? null : match.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded
                      ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</>
                      : <><Eye       className="w-3.5 h-3.5" /> View Match</>
                    }
                  </button>
                </div>

                {/* ── Expanded detail panel ──────────────────────────────────
                    AnimatePresence here is nested inside the card's motion.div,
                    so it fires after layoutId morphing completes.
                    Animates: opacity + y (transform only — no width/height).
                ──────────────────────────────────────────────────────────── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`detail-${match.id}`}
                      variants={detailVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="p-3 rounded-lg bg-[#111827] border border-slate-700 text-[11px] text-slate-300 space-y-1 overflow-hidden"
                    >
                      <div className="font-bold text-emerald-400">Match Details Verified</div>
                      <div>
                        Carrier Partner:{' '}
                        <span className="font-semibold text-slate-100">{match.carrier_b_name}</span>
                      </div>
                      <div>
                        Corridor:{' '}
                        <span className="font-mono text-slate-200">
                          {match.origin_name} → {match.dest_name}
                        </span>
                      </div>
                      <div className="text-emerald-300 font-medium text-[10px] pt-1 border-t border-slate-800">
                        ✓ Combined journey uses existing vehicle capacity without triggering a secondary return trip.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>

      {/* Why Not Matched / Non-Matched Candidates Section */}
      {hasRun && rejectedCandidates.length > 0 && (
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Non-Matched Candidate Shipments ({rejectedCandidates.length})
            </span>
            <span className="text-[11px] text-slate-500">
              {showRejected ? 'Hide details ▲' : 'Why were some shipments not matched? ▼'}
            </span>
          </button>

          {showRejected && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-slate-400 mb-2">
                The algorithm strictly enforces route radius bounds, load weight capacity, and time windows
                to prevent infeasible or high-detour pairings:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rejectedCandidates.map((rej) => (
                  <div
                    key={rej.shipment_id}
                    className="p-2.5 rounded-lg bg-[#111827]/80 border border-slate-800/80 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">{rej.origin_name} → {rej.dest_name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                        {rej.weight_kg ? `${Math.round(rej.weight_kg)} kg` : 'Load'}
                      </span>
                    </div>
                    <div className="text-amber-400/90 text-[10px] font-mono flex items-center gap-1">
                      <span>✕ {rej.rejection_reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
