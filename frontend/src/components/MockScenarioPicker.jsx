import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MOCK_SCENARIOS,
  SCENARIO_GROUPS,
} from '../services/mockScenarios';
import {
  Zap,
  Sparkles,
  Search,
  X,
  Shuffle,
  Check,
  AlertTriangle,
  Leaf,
  Clock,
  MapPin,
  Truck,
  ArrowRight,
  Filter,
} from 'lucide-react';

export function MockScenarioPicker({
  isOpen,
  onClose,
  onSelectScenario,
  activeScenarioId,
}) {
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredScenarios = useMemo(() => {
    return MOCK_SCENARIOS.filter((s) => {
      const matchGroup = selectedGroup === 'All' || s.group === selectedGroup;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.vehicle.name.toLowerCase().includes(q) ||
        s.routeResult.legs.some(
          (l) =>
            l.from_stop.toLowerCase().includes(q) ||
            l.to_stop.toLowerCase().includes(q)
        );
      return matchGroup && matchSearch;
    });
  }, [selectedGroup, searchQuery]);

  const handleRandomSelect = () => {
    const randomIdx = Math.floor(Math.random() * MOCK_SCENARIOS.length);
    const chosen = MOCK_SCENARIOS[randomIdx];
    onSelectScenario(chosen);
    if (onClose) onClose();
  };

  const getGroupBadgeColor = (group) => {
    switch (group) {
      case 'Climate Risk':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EV Truck':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Cold Chain':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Highway':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Express':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Complex':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0f141e] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#141b29] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  Select Mock Scenario
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    50 Datasets Ready
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instant real-time data preview without waiting for optimizer calculations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomSelect}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Select a random scenario from all 50"
              >
                <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Random Pick</span>
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-[#111723] flex flex-col gap-3 shrink-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search across 50 scenarios by corridor, stop name, vehicle type, or ID (e.g. Saraighat, EV, Bongaigaon)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090d14] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/70"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {SCENARIO_GROUPS.map((grp) => {
                const count =
                  grp === 'All'
                    ? MOCK_SCENARIOS.length
                    : MOCK_SCENARIOS.filter((s) => s.group === grp).length;
                const isSelected = selectedGroup === grp;
                return (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                        : 'bg-[#182133] hover:bg-[#202b42] text-slate-300 border border-slate-700/50'
                    }`}
                  >
                    <span>{grp}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenarios Grid List */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-[#0a0e17]">
            {filteredScenarios.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Filter className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">
                  No scenarios match your search query "{searchQuery}"
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGroup('All');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredScenarios.map((sc) => {
                const isSelected = activeScenarioId === sc.id;
                const firstLeg = sc.routeResult.legs[0];
                const lastLeg = sc.routeResult.legs[sc.routeResult.legs.length - 1];
                const stopsCount = sc.routeResult.legs.length + 1;
                const hasClimateHazard = sc.routeResult.legs.some((l) => l.climate_risk_flag);

                return (
                  <motion.div
                    key={sc.id}
                    whileHover={{ scale: 1.005 }}
                    onClick={() => {
                      onSelectScenario(sc);
                      if (onClose) onClose();
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'bg-[#121927] hover:bg-[#182235] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: ID, Title, Stops */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {sc.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getGroupBadgeColor(
                              sc.group
                            )}`}
                          >
                            {sc.group}
                          </span>
                          {hasClimateHazard && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Hazard Corridor
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <Truck className="w-3 h-3 text-slate-500" />
                            {sc.vehicle.name}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-100 truncate">
                          {sc.label}
                        </h4>

                        {/* Origin -> Destination Route summary */}
                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap font-medium">
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {firstLeg?.from_stop}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {lastLeg?.to_stop}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({stopsCount} stops, {sc.routeResult.legs.length} segments)
                          </span>
                        </div>
                      </div>

                      {/* Right: Metrics & Select Button */}
                      <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-slate-800 sm:pl-4 justify-between sm:justify-end">
                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-center">
                          <div className="bg-[#0b1018] px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                            <div className="text-[10px] text-slate-500 font-semibold">Distance</div>
                            <div className="text-xs font-black text-slate-200 font-mono">
                              {sc.routeResult.total_distance_km} km
                            </div>
                          </div>

                          <div className="bg-[#0b1018] px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                            <div className="text-[10px] text-slate-500 font-semibold">Time</div>
                            <div className="text-xs font-black text-amber-300 font-mono">
                              {sc.routeResult.total_time_min}m
                            </div>
                          </div>

                          <div className="bg-[#0b1018] px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                            <div className="text-[10px] text-slate-500 font-semibold">CO₂ Cut</div>
                            <div className="text-xs font-black text-emerald-400 font-mono">
                              {sc.routeResult.co2_saved_pct}%
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectScenario(sc);
                            if (onClose) onClose();
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" /> Load
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-slate-800 bg-[#0d131f] text-center text-xs text-slate-400 flex items-center justify-between px-5 shrink-0">
            <span>Showing {filteredScenarios.length} of 50 mock scenarios</span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              Instant load • No optimizer wait
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Floating / Embedded trigger button with quick scenario picker dropdown
 */
export function ScenarioPickerTrigger({
  onSelectScenario,
  activeScenarioId,
  className = '',
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeScenario = useMemo(() => {
    return MOCK_SCENARIOS.find((s) => s.id === activeScenarioId) || MOCK_SCENARIOS[0];
  }, [activeScenarioId]);

  const handleQuickCycle = (direction = 1) => {
    const currentIndex = MOCK_SCENARIOS.findIndex((s) => s.id === activeScenarioId);
    const nextIndex =
      (currentIndex + direction + MOCK_SCENARIOS.length) % MOCK_SCENARIOS.length;
    onSelectScenario(MOCK_SCENARIOS[nextIndex]);
  };

  return (
    <>
      <div
        className={`flex items-center gap-1.5 bg-[#121927] border border-slate-800 p-1 rounded-xl shadow-lg ${className}`}
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Scenarios (50)</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 text-[10px] font-mono">
            {activeScenario ? activeScenario.id : 'S01'}
          </span>
        </button>

        <button
          onClick={() => handleQuickCycle(1)}
          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          title="Cycle to next mock scenario"
        >
          Next →
        </button>
      </div>

      <MockScenarioPicker
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectScenario={onSelectScenario}
        activeScenarioId={activeScenarioId}
      />
    </>
  );
}
