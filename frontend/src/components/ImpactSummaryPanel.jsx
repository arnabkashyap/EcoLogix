import React, { useState, useEffect, useCallback } from 'react';
import { useSpring, useTransform, motion, AnimatePresence } from 'framer-motion';
import {
  Trees,
  Leaf,
  Layers,
  TrendingDown,
  Award,
  Sparkles,
  RefreshCw,
  Fuel,
  DollarSign,
  Info,
} from 'lucide-react';
import { fetchImpactSummary } from '../services/api';
import { DURATION_STANDARD, DURATION_MICRO, EASE_EMPHASIZED } from '../motion';

// ── AnimatedNumber ────────────────────────────────────────────────────────────
// useSpring drives a MotionValue from the old number to the new number every
// time `value` changes. useTransform formats it as a display string.
// Props:
//   value      — the target number (can be int or float)
//   decimals   — digits after decimal point (default 1)
//   prefix     — prepended string (e.g. "-")
//   suffix     — appended string (e.g. " kg")
//   className  — passed to the <motion.span>
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 1, prefix = '', suffix = '', className = '' }) {
  const numericValue =
    typeof value === 'number' && !isNaN(value) ? value : parseFloat(value) || 0;

  // Spring config: stiffness 120 + damping 20 gives a snappy, live feel
  const springValue = useSpring(numericValue, {
    stiffness: 120,
    damping: 20,
    restDelta: 0.01,
  });

  useEffect(() => {
    springValue.set(numericValue);
  }, [numericValue, springValue]);

  const display = useTransform(springValue, (v) => {
    const safeNum = isNaN(v) ? 0 : v;
    const formatted = safeNum.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  });

  return <motion.span className={className}>{display}</motion.span>;
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function SkeletonImpactPanel() {
  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-[#0F141F]/90 shadow-2xl relative overflow-hidden animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800" />
            <div className="h-5 w-48 bg-slate-800 rounded" />
            <div className="h-5 w-24 bg-slate-800/60 rounded-full" />
          </div>
          <div className="h-3 w-64 bg-slate-800/40 rounded" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-800/60" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6 bg-[#131926] p-5 rounded-xl border border-slate-800/60 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="h-12 w-40 bg-slate-800/80 rounded" />
          <div className="h-3 w-full bg-slate-800/40 rounded" />
        </div>
        <div className="md:col-span-3 bg-[#131926] p-5 rounded-xl border border-slate-800/60 space-y-4">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-10 w-24 bg-slate-800/80 rounded" />
          <div className="h-3 w-36 bg-slate-800/40 rounded" />
        </div>
        <div className="md:col-span-3 bg-[#131926] p-4 rounded-xl border border-slate-800/60 space-y-3">
          <div className="h-6 w-full bg-slate-800/60 rounded" />
          <div className="h-6 w-full bg-slate-800/60 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Zero State Fallback ───────────────────────────────────────────────────────
function ZeroStateImpactPanel({ companyName, onRefresh, isRefreshing }) {
  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-[#0F141F]/90 shadow-2xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide">
              Overall Sustainability Impact
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
              Awaiting Activity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated carbon reduction report for{' '}
            <strong className="text-slate-200">{companyName || 'Active Organization'}</strong>
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-[#131926] hover:bg-[#1A2234] border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Refresh Impact Summary"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="p-8 text-center border border-dashed border-emerald-500/30 rounded-xl bg-[#131926]/60 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-sm font-bold text-slate-200">No Impact Data Recorded Yet</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Run your first route optimization or match empty-return trips to start tracking verified
            cumulative CO₂ avoidance and environmental equivalents.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="px-2.5 py-1 rounded bg-[#0B0E14] border border-slate-800 text-slate-300">
            0 Routes Optimized
          </span>
          <span className="px-2.5 py-1 rounded bg-[#0B0E14] border border-slate-800 text-slate-300">
            0 Pooled Shipments
          </span>
          <span className="px-2.5 py-1 rounded bg-[#0B0E14] border border-slate-800 text-emerald-400">
            0.0 kg CO₂ Avoided
          </span>
        </div>
      </div>
    </div>
  );
}

// ── ImpactSummaryPanel ────────────────────────────────────────────────────────
export function ImpactSummaryPanel({ impactSummary: propImpactSummary, onRefresh: propOnRefresh }) {
  const [data, setData] = useState(propImpactSummary || null);
  const [loading, setLoading] = useState(!propImpactSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else if (!data) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchImpactSummary();
      setData(res);
      if (propOnRefresh) {
        propOnRefresh();
      }
    } catch (err) {
      console.warn('Failed to load impact summary from API:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [data, propOnRefresh]);

  // Synchronize when parent prop changes
  useEffect(() => {
    if (propImpactSummary) {
      setData(propImpactSummary);
      setLoading(false);
    }
  }, [propImpactSummary]);

  // Initial fetch on mount if no prop data provided
  useEffect(() => {
    if (!propImpactSummary) {
      loadData();
    }
  }, [propImpactSummary, loadData]);

  // Listen for global custom events whenever routes or pooling matches complete
  useEffect(() => {
    const handleImpactUpdate = () => {
      loadData(true);
    };

    window.addEventListener('ecologix:impact-updated', handleImpactUpdate);
    window.addEventListener('ecologix:route-completed', handleImpactUpdate);
    window.addEventListener('ecologix:loadpool-matched', handleImpactUpdate);

    return () => {
      window.removeEventListener('ecologix:impact-updated', handleImpactUpdate);
      window.removeEventListener('ecologix:route-completed', handleImpactUpdate);
      window.removeEventListener('ecologix:loadpool-matched', handleImpactUpdate);
    };
  }, [loadData]);

  if (loading && !data) {
    return <SkeletonImpactPanel />;
  }

  // Extract fields strictly from live response, defaulting safely to prevent NaN
  const summary = data || {};
  const combined_total_co2_saved_kg = Number(summary.combined_total_co2_saved_kg ?? 0);
  const total_co2_saved_kg = Number(summary.total_co2_saved_kg ?? 0);
  const total_routes_optimized = Number(summary.total_routes_optimized ?? 0);
  const total_co2_saved_from_pooling_kg = Number(summary.total_co2_saved_from_pooling_kg ?? 0);
  const total_load_pool_matches = Number(summary.total_load_pool_matches ?? 0);
  const equivalent_trees_planted = Number(summary.equivalent_trees_planted ?? 0);
  const total_fuel_saved_liters = Number(summary.total_fuel_saved_liters ?? 0);
  const total_cost_saved_usd = Number(summary.total_cost_saved_usd ?? 0);
  const company_name = summary.company_name || 'Active Organization';
  const tree_note =
    summary.tree_equivalence_factor_note ||
    '~21 kg CO₂ / tree / year (US EPA standard estimate)';

  // Determine if tenant is in brand new / zero state
  const isZeroState =
    total_routes_optimized === 0 &&
    total_load_pool_matches === 0 &&
    combined_total_co2_saved_kg === 0;

  if (isZeroState) {
    return (
      <ZeroStateImpactPanel
        companyName={company_name}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-emerald-500/40 bg-[#0F141F]/90 shadow-2xl relative overflow-hidden">
      {/* Header with Title and Live Tenant Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide">
              Overall Sustainability Impact
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Tenant KPI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated carbon reduction report for{' '}
            <strong className="text-slate-200">{company_name}</strong>
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-[#131926] hover:bg-[#1A2234] border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Refresh Impact Summary"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">Sync Live</span>
        </button>
      </div>

      {/* ── Main Headline Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* ── Large: Combined CO₂ Saved ────────────────────────────────────── */}
        <div className="md:col-span-6 bg-[#131926] p-5 rounded-xl border border-emerald-500/30 flex flex-col justify-between accelerated-ui-element">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> TOTAL CO₂ AVOIDED
            </span>
            <span className="text-[11px] font-mono text-slate-500">Route + Pooling Combined</span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Tenant KPI
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

          <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono truncate" title={tree_note}>
            {tree_note}
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

          {(total_fuel_saved_liters > 0 || total_cost_saved_usd > 0) && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
              {total_fuel_saved_liters > 0 && (
                <div className="flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono text-slate-200">
                    <AnimatedNumber value={total_fuel_saved_liters} decimals={1} suffix=" L fuel" />
                  </span>
                </div>
              )}
              {total_cost_saved_usd > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-slate-200">
                    <AnimatedNumber value={total_cost_saved_usd} decimals={2} prefix="$" suffix=" saved" />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

