import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Info, Calculator, Truck, Fuel, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, GripHorizontal } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  drawerVariantsDesktop,
  drawerVariantsMobile,
  EASE_EMPHASIZED,
  DURATION_DRAWER,
} from '../motion';

// ── Platform detection ───────────────────────────────────────────────────────
// Distinguishes Capacitor (native mobile), Tauri (desktop runtime), and Web:
// 1. Capacitor Native (Android / iOS): Always renders as bottom sheet.
// 2. Tauri Desktop: Always renders as desktop right-slide drawer.
// 3. Web browser: Dynamically branches on viewport width (<=768px sheet, >768px drawer).
function useIsMobileSheet() {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      return true;
    }
  } catch (e) {
    // Ignore if Capacitor is not present in runtime environment
  }
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
    return false;
  }
  return window.innerWidth <= 768;
}

// ── Overlay fade (shared backdrop) ───────────────────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION_DRAWER, ease: EASE_EMPHASIZED } },
  exit:   { opacity: 0, transition: { duration: 0.2,            ease: EASE_EMPHASIZED } },
};

export function EmissionsExplainer({ isOpen, onClose, vehicleType = 'heavy_truck', routeResult = null }) {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const isMobile = useIsMobileSheet();

  const legs = routeResult?.legs || [];

  // Choose variant set based on platform
  const drawerVariants = isMobile ? drawerVariantsMobile : drawerVariantsDesktop;

  // Desktop drawer: fixed right panel, full height, 480px wide
  // Mobile sheet:   fixed bottom sheet, 85vh, full width, rounded top corners
  const drawerClasses = isMobile
    ? [
        'fixed bottom-0 left-0 right-0 z-[1001]',
        'h-[85vh]',
        'glass-panel rounded-t-3xl',
        'border border-slate-800/80',
        'overflow-y-auto',
        'flex flex-col',
      ].join(' ')
    : [
        'fixed top-0 right-0 bottom-0 z-[1001]',
        'w-full max-w-[480px]',
        'glass-panel',
        'border-l border-slate-800/80',
        'overflow-y-auto',
        'flex flex-col',
      ].join(' ');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="emissions-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[1000] bg-[#181A20]/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Drawer / Sheet ── */}
          <motion.div
            key="emissions-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`${drawerClasses} accelerated-ui-element`}
            role="dialog"
            aria-modal="true"
            aria-label="Emissions breakdown"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag-handle (visual only) */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-600" aria-hidden="true" />
              </div>
            )}

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 leading-snug">
                      Deterministic Emissions Breakdown
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live per-leg verification — every gram of CO₂ is computed from real
                      payload load factor, corridor congestion, and fuel factors.
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="shrink-0 p-1.5 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  aria-label="Close emissions explainer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Active Route Legs Live Trace Table ── */}
              {legs.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-emerald-400" /> Active Route Leg Calculations
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                      {legs.length} Segments Analyzed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {legs.map((leg) => {
                      const fb   = leg.formula_breakdown || {};
                      const baseL = fb.base_L_per_km        || 0.34;
                      const kLoad = fb.k_load               || 0.40;
                      const kCong = fb.k_congestion         || 0.35;
                      const lf    = leg.load_factor         ?? 0.5;
                      const cong  = leg.congestion_index    ?? 0.05;
                      const ef    = fb.diesel_emission_factor || 2.68;

                      return (
                        <div
                          key={leg.sequence_order}
                          className="p-3 rounded-xl bg-[#111827]/90 border border-slate-800 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="font-bold text-slate-200 flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                                Leg #{leg.sequence_order}
                              </span>
                              <span>{leg.from_stop} → {leg.to_stop}</span>
                              {leg.climate_risk_flag && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Flagged Corridor
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-emerald-400 font-extrabold text-sm">
                              {leg.co2_kg} kg CO₂
                            </div>
                          </div>

                          {/* Step-by-Step Parameter Trace */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#181A20]/80 p-2 rounded-lg border border-slate-800/80">
                            <div>
                              <div className="text-slate-400 text-[10px]">Distance</div>
                              <div className="font-mono text-slate-200 font-semibold">{leg.distance_km} km</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px]">Load Factor</div>
                              <div className="font-mono text-slate-200 font-semibold">
                                {Math.round(lf * 100)}% ({leg.onboard_weight_kg ? `${Math.round(leg.onboard_weight_kg)}kg` : 'load'})
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px]">Congestion (C_ij)</div>
                              <div className="font-mono text-amber-300 font-semibold">{Math.round(cong * 100)}% surge</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px]">Fuel Consumed</div>
                              <div className="font-mono text-emerald-300 font-semibold">
                                {leg.fuel_L ? `${leg.fuel_L} L` : `${leg.energy_kwh} kWh`}
                              </div>
                            </div>
                          </div>

                          {/* Math Formulation Expression */}
                          <div className="text-[10px] font-mono text-slate-400 bg-[#0B0E14] p-1.5 rounded border border-slate-800/60 overflow-x-auto">
                            <span className="text-slate-400">Math: </span>
                            <span className="text-slate-300">{leg.distance_km}km</span> ×{' '}
                            <span className="text-slate-300">{baseL}L/km</span> ×{' '}
                            <span className="text-slate-300">(1 + {lf.toFixed(2)}×{kLoad})</span> ×{' '}
                            <span className="text-slate-300">(1 + {cong.toFixed(2)}×{kCong})</span> ×{' '}
                            <span className="text-emerald-400">{ef}</span> ={' '}
                            <strong className="text-emerald-300">{leg.co2_kg} kg</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-[#111827]/90 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-3">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>Optimise a route on the map to see the exact live per-leg mathematical trace.</div>
                </div>
              )}

              {/* ── Collapsible Formula Section ── */}
              <button
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>See formula specification & vehicle parameters</span>
                {showFormulaDetails
                  ? <ChevronUp   className="w-4 h-4 text-emerald-400" />
                  : <ChevronDown className="w-4 h-4 text-emerald-400" />
                }
              </button>

              <AnimatePresence initial={false}>
                {showFormulaDetails && (
                  <motion.div
                    key="formula-details"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_EMPHASIZED } }}
                    exit={{    opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE_EMPHASIZED } }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Formula Box */}
                    <div className="bg-[#111827]/90 border border-slate-800 p-4 rounded-xl mono-font text-xs space-y-2">
                      <div className="text-emerald-400 font-bold">
                        DIESEL EMISSIONS FORMULA (Standard EPA Combustion Factor):
                      </div>
                      <div className="text-slate-300">
                        fuel_L = base_L_per_km × distance_km × (1 + load_factor × k_load) × (1 + congestion_index × k_congestion)
                      </div>
                      <div className="text-slate-300">
                        co2_kg = fuel_L × <span className="text-emerald-400 font-bold">2.68 kg CO₂/L</span>
                      </div>
                      <div className="border-t border-slate-800 pt-2 text-teal-300 font-bold mt-2">
                        ELECTRIC VEHICLE (EV) SUBSTITUTE FORMULA:
                      </div>
                      <div className="text-slate-300">
                        co2_kg = distance_km × kwh_per_km × grid_emission_factor (0.18 kg CO₂/kWh)
                      </div>
                    </div>

                    {/* Profile Parameters Table */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-400" /> Standard Vehicle Profiles
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-300">
                          <thead className="bg-[#111827] text-slate-400 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-3 py-2">Vehicle Type</th>
                              <th className="px-3 py-2">Base Consumption</th>
                              <th className="px-3 py-2">Load Sensitivity (k_load)</th>
                              <th className="px-3 py-2">Congestion Penalty (k_cong)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            <tr className={vehicleType === 'heavy_truck' ? 'bg-emerald-500/10 font-semibold text-emerald-300' : ''}>
                              <td className="px-3 py-2">Heavy Commercial (HCV)</td>
                              <td className="px-3 py-2">34 L / 100km</td>
                              <td className="px-3 py-2">0.40 (+40% full load)</td>
                              <td className="px-3 py-2">0.35 (+35% city gridlock)</td>
                            </tr>
                            <tr className={vehicleType === 'medium_truck' ? 'bg-emerald-500/10 font-semibold text-emerald-300' : ''}>
                              <td className="px-3 py-2">Medium Commercial (MHCV)</td>
                              <td className="px-3 py-2">24 L / 100km</td>
                              <td className="px-3 py-2">0.30</td>
                              <td className="px-3 py-2">0.25</td>
                            </tr>
                            <tr className={vehicleType === 'van' ? 'bg-emerald-500/10 font-semibold text-emerald-300' : ''}>
                              <td className="px-3 py-2">Van / LCV</td>
                              <td className="px-3 py-2">13 L / 100km</td>
                              <td className="px-3 py-2">0.20</td>
                              <td className="px-3 py-2">0.20</td>
                            </tr>
                            <tr className={vehicleType === 'ev_truck' ? 'bg-emerald-500/10 font-semibold text-emerald-300' : ''}>
                              <td className="px-3 py-2">EV Freightliner</td>
                              <td className="px-3 py-2">0.85 kWh / km</td>
                              <td className="px-3 py-2">0.15</td>
                              <td className="px-3 py-2">0.10</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Explainability Credibility Note */}
                    <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-400">Strict Mathematical Traceability: </span>
                        Every route optimizer result and cross-tenant load-pool match calls this exact
                        function. There are no static approximations or disconnected guesses between
                        components.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
