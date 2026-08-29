import React, { useEffect, useRef } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';
import { Trees, Leaf, Layers, TrendingDown, Award, Sparkles } from 'lucide-react';
import { DURATION_STANDARD, DURATION_MICRO, EASE_EMPHASIZED } from '../motion';

// ── AnimatedNumber ────────────────────────────────────────────────────────────
// useSpring drives a MotionValue from the old number to the new number every
// time `value` changes.  useTransform formats it as a display string.
// This is a pure Framer Motion approach — no requestAnimationFrame loops,
// no third-party count-up library.
//
// Props:
//   value      — the target number (can be int or float)
//   decimals   — digits after decimal point (default 1)
//   prefix     — prepended string (e.g. "-")
//   suffix     — appended string (e.g. " kg")
//   className  — passed to the <motion.span>
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 1, prefix = '', suffix = '', className = '' }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  // Spring config:
  //   stiffness 120 + damping 20 gives a tight, snappy feel that reads as a
  //   "live update" rather than a slow reveal.  The duration effectively lands
  //   between DURATION_MICRO (0.15 s) and DURATION_STANDARD (0.3 s) for typical
  //   delta values like 0 → 26.8.
  const springValue = useSpring(numericValue, {
    stiffness: 120,
    damping: 20,
    restDelta: 0.01,
  });

  // Drive the spring to the new target whenever the prop changes.
  // On first mount this is a no-op (spring already starts at the right value).
  useEffect(() => {
    springValue.set(numericValue);
  }, [numericValue, springValue]);

  // Format the live spring number into a display string.
  const display = useTransform(springValue, (v) => {
    const formatted = v.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  });

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}

// ── ImpactSummaryPanel ────────────────────────────────────────────────────────
export function ImpactSummaryPanel({ impactSummary }) {
  const summary = impactSummary || {
    combined_total_co2_saved_kg: 26.8,
    total_co2_saved_kg: 0,
    total_routes_optimized: 6,
    total_co2_saved_from_pooling_kg: 26.8,
    total_load_pool_matches: 1,
    equivalent_trees_planted: 1.3,
    company_name: 'Northwind Logistics',
  };

  const {
    combined_total_co2_saved_kg,
    total_co2_saved_kg,
    total_routes_optimized,
    total_co2_saved_from_pooling_kg,
    total_load_pool_matches,
    equivalent_trees_planted,
    company_name,
  } = summary;

  return (
    <div className="p-6 rounded-2xl border border-emerald-500/40 bg-[#0F141F]/90 shadow-2xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide">
              Overall Sustainability Impact
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              Live Tenant KPI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated carbon reduction report for{' '}
            <strong className="text-slate-200">{company_name || 'Northwind Logistics'}</strong>
          </p>
        </div>
      </div>

      {/* ── Main Headline Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* ── Large: Combined CO₂ Saved ──────────────────────────────────────
            .accelerated-ui-element promotes to compositor layer so the spring
            animation runs off the main thread.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="md:col-span-6 bg-[#131926] p-5 rounded-xl border border-emerald-500/30 flex flex-col justify-between accelerated-ui-element">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> TOTAL CO₂ AVOIDED
            </span>
            <span className="text-[11px] font-mono text-slate-500">Route + Combined</span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            {/* AnimatedNumber springs from previous → new value on every
                impactSummary update (route re-optimized or alpha changed).  */}
            <AnimatedNumber
              value={combined_total_co2_saved_kg}
              decimals={1}
              className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.35)] tabular-nums"
            />
            <span className="text-base font-extrabold text-slate-300">kg CO₂</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5 mt-2 flex items-center justify-between">
            <span>Verified cumulative emissions offset</span>
            <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Demo Update
            </span>
          </div>
        </div>

        {/* ── Equivalency: Tree-years ────────────────────────────────────── */}
        <div className="md:col-span-3 bg-[#131926] p-5 rounded-xl border border-slate-800 flex flex-col justify-between accelerated-ui-element">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-emerald-400" /> ENVIRONMENTAL EQUIV.
          </div>

          <div className="my-2">
            <div className="text-3xl font-black text-slate-100 flex items-baseline gap-2">
              <span>🌲</span>
              <AnimatedNumber
                value={equivalent_trees_planted}
                decimals={1}
                className="tabular-nums"
              />
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              tree-years of carbon absorption
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
            ~21 kg CO₂ / tree / year (US EPA factor)
          </div>
        </div>

        {/* ── Breakdown: Route opt + Load pool ──────────────────────────── */}
        <div className="md:col-span-3 bg-[#131926] p-4 rounded-xl border border-slate-800 flex flex-col justify-center space-y-3 text-xs accelerated-ui-element">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Route Opt. ({total_routes_optimized})</span>
            </div>
            <div className="font-bold text-emerald-400 font-mono text-sm tabular-nums flex items-center gap-0.5">
              <span>-</span>
              <AnimatedNumber
                value={total_co2_saved_kg}
                decimals={1}
                suffix=" kg"
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Combine Shipments ({total_load_pool_matches})</span>
            </div>
            <div className="font-bold text-amber-400 font-mono text-sm tabular-nums flex items-center gap-0.5">
              <span>-</span>
              <AnimatedNumber
                value={total_co2_saved_from_pooling_kg}
                decimals={1}
                suffix=" kg"
                className="tabular-nums"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
