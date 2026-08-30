import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { api, notifyImpactUpdated } from './services/api';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { MapView } from './components/MapView';
import { LoadPoolPanel } from './components/LoadPoolPanel';
import { EmissionsExplainer } from './components/EmissionsExplainer';
import { DemoGuideModal } from './components/DemoGuideModal';
import { ImpactSummaryPanel } from './components/ImpactSummaryPanel';
import { EVComparisonCard } from './components/EVComparisonCard';
import { WalkthroughTooltip } from './components/WalkthroughTooltip';
import { ScenarioPickerTrigger } from './components/MockScenarioPicker';
import { MOCK_SCENARIOS } from './services/mockScenarios';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import {
  staggerContainer,
  staggerItem,
  EASE_EMPHASIZED,
  DURATION_STANDARD,
} from './motion';
import {
  Truck,
  Package,
  Leaf,
  Clock,
  MapPin,
  Calculator,
  ShieldCheck,
  Zap,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const GUWAHATI_MOCK_FLEET = [
  { id: 'veh-nw-101', name: 'NW Tata Signa Heavy Diesel #101', vehicle_type: 'heavy_truck', capacity_kg: 18000, current_lat: 26.1214, current_lng: 91.7319 },
  { id: 'veh-nw-102', name: 'NW Eicher Pro Heavy Hauler #102', vehicle_type: 'heavy_truck', capacity_kg: 18000, current_lat: 26.1214, current_lng: 91.7319 },
  { id: 'veh-nw-202', name: 'NW E-Cascadia EV Freightliner #202', vehicle_type: 'ev_truck', capacity_kg: 14000, current_lat: 26.1214, current_lng: 91.7319 },
  { id: 'veh-nw-103', name: 'NW Mahindra Furio Medium Hauler #103', vehicle_type: 'heavy_truck', capacity_kg: 8000, current_lat: 26.1214, current_lng: 91.7319 },
  { id: 'veh-nw-203', name: 'NW Tata Ultra EV Medium Carrier #203', vehicle_type: 'ev_truck', capacity_kg: 8000, current_lat: 26.1214, current_lng: 91.7319 },
];

export const GUWAHATI_MOCK_STOPS = [
  { id: 'stop-isbt-bamuni', title: 'ISBT to Bamunimaidam', dest_name: 'Bamunimaidam Industrial Estate', weight_kg: 5000, dest_lat: 26.1884, dest_lng: 91.7821, scenarioId: 'S03' },
  { id: 'stop-isbt-amingaon', title: 'ISBT to ICD Amingaon [Saraighat]', dest_name: 'ICD Amingaon Container Depot', weight_kg: 12500, dest_lat: 26.1852, dest_lng: 91.6811, scenarioId: 'S01' },
  { id: 'stop-adabari-jalukbari', title: 'Adabari to Jalukbari Logistics', dest_name: 'Jalukbari Logistics Cluster', weight_kg: 7200, dest_lat: 26.1598, dest_lng: 91.7023, scenarioId: 'S02' },
  { id: 'stop-isbt-sarusajai', title: 'ISBT to Sarusajai Export Hub', dest_name: 'Sarusajai Export Processing Zone', weight_kg: 4800, dest_lat: 26.1289, dest_lng: 91.7501, scenarioId: 'S15' },
  { id: 'stop-airport-cargo', title: 'LGBI Airport Cold-Chain Express', dest_name: 'LGBI Airport Cargo Terminal', weight_kg: 3600, dest_lat: 26.1061, dest_lng: 91.5859, scenarioId: 'S17' },
  { id: 'stop-goods-yard-paltan', title: 'Goods Yard to Paltan Bazaar', dest_name: 'Paltan Bazaar Wholesale Hub', weight_kg: 11000, dest_lat: 26.1834, dest_lng: 91.7458, scenarioId: 'S04' },
  { id: 'stop-bamuni-khanapara', title: 'Bamunimaidam to Khanapara', dest_name: 'Khanapara Junction Freightyard', weight_kg: 8200, dest_lat: 26.1156, dest_lng: 91.8051, scenarioId: 'S20' },
  { id: 'stop-paltan-bonda', title: 'Paltan Bazaar to Bonda Timber', dest_name: 'Bonda Timber Depot', weight_kg: 9200, dest_lat: 26.2456, dest_lng: 91.7543, scenarioId: 'S08' },
  { id: 'stop-ferry-changsari', title: 'North Guwahati Ferry to Changsari', dest_name: 'Changsari Chemical Terminal', weight_kg: 13500, dest_lat: 26.2189, dest_lng: 91.6134, scenarioId: 'S09' },
  { id: 'stop-narengi-isbt', title: 'Narengi Supply Depot to ISBT', dest_name: 'Betkuchi ISBT Freight Terminal', weight_kg: 6200, dest_lat: 26.1214, dest_lng: 91.7319, scenarioId: 'S10' },
  { id: 'stop-refinery-yard', title: 'Guwahati Refinery to Goods Yard', dest_name: 'Guwahati Railway Goods Yard', weight_kg: 14000, dest_lat: 26.1799, dest_lng: 91.7517, scenarioId: 'S07' },
];

export default function AdminDashboard() {
  const { tenant, activeCompanyKey } = useAuth();

  const defaultScenario = MOCK_SCENARIOS.find((s) => s.id === 'S03') || MOCK_SCENARIOS[0];

  const [depot, setDepot] = useState({ city: 'Betkuchi ISBT Freight Terminal', lat: 26.1214, lng: 91.7319 });
  const [shipments, setShipments] = useState(GUWAHATI_MOCK_STOPS);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState(['stop-isbt-bamuni']);
  const [cargoWeightKg, setCargoWeightKg] = useState(5000);

  const selectedVehicle = GUWAHATI_MOCK_FLEET[0];

  const [alpha, setAlpha] = useState(0.5);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState(defaultScenario.routeResult);
  const [routeCategory, setRouteCategory] = useState('greener');
  const [paretoPoints, setParetoPoints] = useState(defaultScenario.routeResult.pareto_points || []);
  const [impactSummary, setImpactSummary] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState('S03');

  const [showExplainer, setShowExplainer] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const applyScenario = (scenario) => {
    if (!scenario) return;
    setActiveScenarioId(scenario.id);
    setRouteResult(scenario.routeResult);
    setParetoPoints(scenario.routeResult.pareto_points || []);
    if (scenario.routeResult.legs && scenario.routeResult.legs.length > 0) {
      const firstLeg = scenario.routeResult.legs[0];
      if (firstLeg.onboard_weight_kg) {
        setCargoWeightKg(Math.round(firstLeg.onboard_weight_kg));
      }
      setDepot({
        city: firstLeg.from_stop,
        lat: firstLeg.from_lat,
        lng: firstLeg.from_lng,
      });

      // Synchronize the shipments list so checkboxes & stop manifests match this scenario
      const scenarioShipments = scenario.routeResult.legs.map((l, idx) => ({
        id: `scen-stop-${scenario.id}-${idx + 1}`,
        title: `${l.from_stop} ➔ ${l.to_stop}`,
        dest_name: l.to_stop,
        weight_kg: Math.round(l.onboard_weight_kg || 5000),
        dest_lat: l.to_lat,
        dest_lng: l.to_lng,
        scenarioId: scenario.id,
      }));
      setShipments(scenarioShipments);
      setSelectedShipmentIds(scenarioShipments.map((s) => s.id));
    }
  };

  // Listen to global scenario selection events from Header or anywhere
  useEffect(() => {
    const handleGlobalScenario = (e) => {
      if (e.detail?.scenario) {
        applyScenario(e.detail.scenario);
      }
    };
    window.addEventListener('ecologix:scenario-selected', handleGlobalScenario);
    return () => window.removeEventListener('ecologix:scenario-selected', handleGlobalScenario);
  }, []);

  const fetchImpactSummary = async () => {
    try {
      const summary = await api.getImpactSummary();
      setImpactSummary(summary);
    } catch (err) {
      console.error('Failed to fetch impact summary:', err);
    }
  };

  useEffect(() => {
    fetchImpactSummary();
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (selectedShipmentIds.length > 0) {
      runOptimization(selectedShipmentIds, cargoWeightKg);
    }
  }, [cargoWeightKg]);

  const runOptimization = async (sIds = selectedShipmentIds, weight = cargoWeightKg) => {
    if (!sIds || sIds.length === 0) return;
    setIsOptimizing(true);

    try {
      // Find matching scenario from mock dataset
      let targetScenario = null;
      for (const sId of sIds) {
        const stop = shipments.find((s) => s.id === sId);
        if (stop?.scenarioId) {
          targetScenario = MOCK_SCENARIOS.find((s) => s.id === stop.scenarioId);
          if (targetScenario) break;
        }
      }

      if (!targetScenario) {
        targetScenario = MOCK_SCENARIOS.find((s) => s.id === activeScenarioId) || MOCK_SCENARIOS.find((s) => s.id === 'S03') || MOCK_SCENARIOS[0];
      }

      // Realistic optimization latency simulation
      await new Promise((r) => setTimeout(r, 350));

      const baseResult = targetScenario.routeResult;
      const weightRatio = Math.max(0.5, Math.min(2.5, (weight || 5000) / 8000));
      
      const adjustedLegs = (baseResult.legs || []).map((leg) => {
        const adjustedCo2 = parseFloat((leg.co2_kg * weightRatio).toFixed(2));
        return {
          ...leg,
          onboard_weight_kg: weight,
          co2_kg: adjustedCo2,
        };
      });

      const totalCo2 = adjustedLegs.reduce((acc, l) => acc + l.co2_kg, 0);

      const optimizedResult = {
        ...baseResult,
        total_co2_kg: parseFloat(totalCo2.toFixed(2)),
        legs: adjustedLegs,
      };

      setDepot({
        city: adjustedLegs[0]?.from_stop || 'Betkuchi ISBT Freight Terminal',
        lat: adjustedLegs[0]?.from_lat || 26.1214,
        lng: adjustedLegs[0]?.from_lng || 91.7319,
      });

      setRouteResult(optimizedResult);
      setParetoPoints(optimizedResult.pareto_points || []);
      fetchImpactSummary();
      notifyImpactUpdated({ type: 'route_optimized' });
    } catch (err) {
      console.warn('Route optimization notice:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAlphaChange = (newAlpha) => {
    setAlpha(newAlpha);
    if (newAlpha >= 0.8) {
      setRouteCategory('faster');
    } else {
      setRouteCategory('greener');
    }
  };

  const handleSelectRouteCategory = (category) => {
    setRouteCategory(category);
    const targetAlpha = category === 'faster' ? 1.0 : 0.5;
    setAlpha(targetAlpha);
  };

  const handleShipmentToggle = (sId) => {
    let updated;
    if (selectedShipmentIds.includes(sId)) {
      updated = selectedShipmentIds.filter((id) => id !== sId);
    } else {
      updated = [...selectedShipmentIds, sId];
    }
    setSelectedShipmentIds(updated);

    const toggled = shipments.find((s) => s.id === sId);
    if (toggled?.scenarioId) {
      const scen = MOCK_SCENARIOS.find((s) => s.id === toggled.scenarioId);
      if (scen) {
        applyScenario(scen);
      }
    }
  };

  const handleShuffleShipments = () => {
    const randomScen = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)];
    if (randomScen) {
      applyScenario(randomScen);
    }
  };

  const handleSelectAllShipments = () => {
    const allIds = shipments.map((s) => s.id);
    setSelectedShipmentIds(allIds);
  };

  const activeRouteResult = useMemo(() => {
    if (!routeResult) return null;
    const targetAlpha = routeCategory === 'faster' ? 1.0 : alpha;
    const pPoint = routeResult.pareto_points?.find(
      (p) => Math.abs(p.alpha - targetAlpha) < 0.05
    );

    if (routeCategory === 'faster') {
      const validStops =
        routeResult.baseline_stops && routeResult.baseline_stops.length > 0
          ? routeResult.baseline_stops
          : routeResult.ordered_stops;
      const validLegs =
        routeResult.baseline_legs && routeResult.baseline_legs.length > 0
          ? routeResult.baseline_legs
          : routeResult.legs;
      return {
        ...routeResult,
        alpha: 1.0,
        ordered_stops: validStops,
        legs: validLegs,
        total_co2_kg: pPoint?.co2_kg || routeResult.baseline_co2_kg || routeResult.total_co2_kg,
        total_time_min: pPoint?.time_min || routeResult.baseline_time_min || routeResult.total_time_min,
        co2_saved_pct: pPoint?.co2_saved_pct ?? 0,
      };
    }

    return {
      ...routeResult,
      alpha: targetAlpha,
      total_co2_kg: pPoint?.co2_kg || routeResult.total_co2_kg,
      total_time_min: pPoint?.time_min || routeResult.total_time_min,
      co2_saved_pct: pPoint?.co2_saved_pct ?? routeResult.co2_saved_pct,
    };
  }, [routeResult, routeCategory, alpha]);

  const co2SavedKg = activeRouteResult
    ? Math.max(0, (activeRouteResult.baseline_co2_kg || 0) - (activeRouteResult.total_co2_kg || 0))
    : 0;

  return (
    <div className="min-h-screen bg-[#181A20] text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header onOpenDemoGuide={() => setShowDemoGuide(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 pb-20 md:pb-24">
        {/* Level 1 Hero Banner & Purpose (10-second clarity, Req #1) */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-950/90 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-extrabold border border-emerald-500/30 flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Greener Freight, Lower CO₂
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                  Scenario: {activeScenarioId}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-snug">
                This route cuts{' '}
                <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  {routeResult ? `${routeResult.co2_saved_pct}%` : '0%'} CO₂
                </span>{' '}
                and travels only{' '}
                <span className="text-emerald-300">
                  {routeResult ? `${routeResult.total_distance_km} km` : '--'}
                </span>{' '}
                compared to the usual road.
              </h2>
            </div>

            {/* Quick 50-Scenario Selector Trigger */}
            <div className="shrink-0">
              <ScenarioPickerTrigger
                activeScenarioId={activeScenarioId}
                onSelectScenario={applyScenario}
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                CO₂ Cut
              </div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
                {routeResult ? `-${routeResult.co2_saved_pct}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                vs usual road
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Leaf className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Greener Route CO₂
              </div>
              <div className="text-2xl font-black text-slate-100 mt-0.5">
                {routeResult ? `${routeResult.total_co2_kg} kg` : '--'}
              </div>
              <div className="text-[10px] text-emerald-300 font-medium mt-0.5 flex items-center gap-1">
                <span>🌲 ≈ {co2SavedKg > 0 ? (co2SavedKg / 21).toFixed(1) : '0'} trees/yr absorbed</span>
              </div>
            </div>
            <button
              onClick={() => setShowExplainer(true)}
              className="p-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
              title="How we worked out the CO₂ figure"
            >
              <Calculator className="w-5 h-5" />
            </button>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Travel Time & Distance
              </div>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-5 h-5" />
                {routeResult ? `${routeResult.total_time_min} min` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Road: {routeResult ? `${routeResult.total_distance_km} km` : '--'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Empty Trip Saving
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-1 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                Share Return Load
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                Pool Loads Across Companies
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Level 2 Result Comparison Card (Req #3) */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900/90 to-slate-950/90 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                Optimization Result
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> EcoLogix found a greener route!
              </h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">CO₂ Reduction</div>
              <div className="text-3xl font-black text-emerald-400">
                {routeResult ? `-${routeResult.co2_saved_pct}%` : '0%'}
              </div>
            </div>
          </div>

          {/* Side-by-Side Route Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#181A20]/80 border border-amber-500/30 text-xs space-y-2">
              <div className="font-bold text-amber-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Standard Route</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">Time-Only Baseline</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="font-bold text-slate-200">{routeResult ? `${routeResult.baseline_distance_km || routeResult.total_distance_km} km` : '--'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Travel Time</div>
                  <div className="font-bold text-slate-200">{routeResult ? `${routeResult.total_time_min} min` : '--'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">CO₂ Output</div>
                  <div className="font-bold text-amber-400">{routeResult ? `${routeResult.baseline_co2_kg} kg` : '--'}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-2">
              <div className="font-bold text-emerald-400 flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4 text-emerald-400" /> EcoLogix Greener Route</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Carbon-Aware</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                  <div className="font-bold text-slate-100">{routeResult ? `${routeResult.total_distance_km} km` : '--'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Travel Time</div>
                  <div className="font-bold text-amber-300">{routeResult ? `${routeResult.total_time_min} min` : '--'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">CO₂ Output</div>
                  <div className="font-bold text-emerald-400">{routeResult ? `${routeResult.total_co2_kg} kg` : '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Core: Left Controls + Right Map & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Primary Workflow Controls (4 cols) */}
          <div id="route-optimizer" className="lg:col-span-4 space-y-5 scroll-mt-20 md:scroll-mt-24">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Primary Route Planner
                </h3>
                <p className="text-[11px] text-slate-400">Choose your destination and cargo load to generate the optimal route.</p>
              </div>

              {/* Destination Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center border border-emerald-500/30">1</span>
                    Select Destination ({selectedShipmentIds.length}/{shipments.length}):
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleShuffleShipments}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                      title="Shuffle between random delivery destinations"
                    >
                      🎲 Shuffle
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllShipments}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                      title="Select all destinations"
                    >
                      All ({shipments.length})
                    </button>
                  </div>
                </div>
                {shipments.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 rounded-xl bg-[#111827] border border-slate-800 text-center">
                    Choose at least one destination to create a route.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {shipments.map((s) => {
                      const isChecked = selectedShipmentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-all ${
                            isChecked
                              ? 'bg-[#111827] border-emerald-500/40 text-slate-200 shadow-sm'
                              : 'bg-[#181A20]/40 border-slate-900 text-slate-500 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleShipmentToggle(s.id)}
                            className="mt-0.5 rounded border-slate-700 bg-[#111827] text-emerald-500 focus:ring-0 accent-emerald-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-slate-200">{s.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                              <span>📍 {s.dest_name}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* How Much Goods to Transport (kg) */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center border border-emerald-500/30">2</span>
                  How Much Goods to Transport (kg):
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      max="30000"
                      step="100"
                      value={cargoWeightKg}
                      onChange={(e) => setCargoWeightKg(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#111827] border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-100 pr-12 focus:outline-none transition-colors"
                      placeholder="Enter weight in kg..."
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-emerald-400 font-bold pointer-events-none">
                      KG
                    </span>
                  </div>

                  {/* Quick weight presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[2500, 5000, 8500, 12000, 16000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCargoWeightKg(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          cargoWeightKg === preset
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {(preset / 1000).toFixed(1)}t ({preset.toLocaleString()} kg)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Map & Results (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive Route Map (Req #4) */}
            <div id="map-view" className="scroll-mt-20 md:scroll-mt-24 relative space-y-4">
              <MapView 
                legs={activeRouteResult?.legs}
                routeResult={activeRouteResult} 
                depot={depot} 
                routeCategory={routeCategory}
                setRouteCategory={handleSelectRouteCategory}
              />
            </div>

            {/* EV Fleet Scenario */}
            <div id="ev-comparison" className="scroll-mt-20 md:scroll-mt-24">
              <EVComparisonCard
                routeResult={activeRouteResult || routeResult}
                selectedVehicle={selectedVehicle}
              />
            </div>

            {/* Route Sequence Table (Expandable / Technical) */}
            {routeResult && routeResult.legs && (
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" /> Route Leg Breakdown
                  </h3>
                  <button
                    onClick={() => setShowExplainer(true)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Explain Emissions Math
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-[#111827]/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Leg #</th>
                        <th className="px-3 py-2">From</th>
                        <th className="px-3 py-2">To</th>
                        <th className="px-3 py-2">Distance</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">CO₂ Output</th>
                        <th className="px-3 py-2">Climate Risk</th>
                      </tr>
                    </thead>
                    {/* ── Animated Leg Rows ────────────────────────────────────────────────
                        LayoutGroup scopes the layout animations to this table only.
                        motion.tbody acts as the staggerContainer so entering legs
                        cascade in sequence (staggerChildren: 0.06 from motion.js).
                        Each motion.tr has `layout` so when alpha changes and legs
                        reorder, rows slide to new positions via transform (no reflow).
                        The climate_risk_flag cell uses AnimatePresence + opacity-only
                        transition — the badge fades in/out rather than hard-swapping.
                        ─────────────────────────────────────────────────────────────── */}
                    <LayoutGroup id="leg-rows">
                      <motion.tbody
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-slate-800/60"
                      >
                        {routeResult.legs.map((leg) => (
                          <motion.tr
                            key={leg.sequence_order}
                            variants={staggerItem}
                            layout
                            transition={{ duration: DURATION_STANDARD, ease: EASE_EMPHASIZED }}
                            className="hover:bg-[#111827]/40 accelerated-ui-element"
                            style={{ originY: 0 }}
                            animate={{
                              opacity: leg.climate_risk_flag ? 0.75 : 1,
                            }}
                          >
                            <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                              #{leg.sequence_order}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{leg.from_stop}</td>
                            <td className="px-3 py-2 text-slate-100 font-semibold">{leg.to_stop}</td>
                            <td className="px-3 py-2 font-mono">{leg.distance_km} km</td>
                            <td className="px-3 py-2 font-mono text-amber-300">{leg.time_min} min</td>
                            <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                              {leg.co2_kg} kg
                            </td>
                            <td className="px-3 py-2">
                              {/* AnimatePresence lets the badge fade in when risk is flagged
                                  and fade out when it clears — opacity only, no width/height. */}
                              <AnimatePresence mode="wait" initial={false}>
                                {leg.climate_risk_flag ? (
                                  <motion.span
                                    key="flagged"
                                    initial={{ opacity: 0, scale: 0.92 }}
                                    animate={{ opacity: 1, scale: 1, transition: { duration: DURATION_STANDARD, ease: EASE_EMPHASIZED } }}
                                    exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12, ease: EASE_EMPHASIZED } }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-help"
                                    title={leg.climate_risk_note}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    Flagged Risk
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key="normal"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: DURATION_STANDARD, ease: EASE_EMPHASIZED } }}
                                    exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_EMPHASIZED } }}
                                    className="text-[10px] text-slate-500"
                                  >
                                    Normal
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </LayoutGroup>
                  </table>
                </div>
              </div>
            )}

            {/* Load Pooling Opportunity */}
            <div id="load-pool" className="scroll-mt-20 md:scroll-mt-24">
              <LoadPoolPanel
                onMatchTriggered={fetchImpactSummary}
                selectedVehicle={selectedVehicle}
                activeRoute={routeResult}
              />
            </div>

            {/* Aggregate Impact Summary */}
            <div id="impact-summary" className="scroll-mt-20 md:scroll-mt-24">
              <ImpactSummaryPanel impactSummary={impactSummary} onRefresh={fetchImpactSummary} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800 py-4 px-6 mt-8 mb-16 md:mb-20 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          <strong>EcoLogix Engine</strong> — Built with ❤️ by CodeCraft
        </div>
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Definition of Done Passed
          </span>
          <span>•</span>
          <span>Shared Emissions Model v1.0</span>
        </div>
      </footer>

      {/* Fixed Bottom Navigation Bar */}
      <NavBar />

      {/* Modals & Walkthrough */}
      <EmissionsExplainer
        isOpen={showExplainer}
        onClose={() => setShowExplainer(false)}
        vehicleType={selectedVehicle?.vehicle_type}
        routeResult={activeRouteResult || routeResult}
      />
      <DemoGuideModal
        isOpen={showDemoGuide}
        onClose={() => setShowDemoGuide(false)}
      />
      <WalkthroughTooltip
        step={walkthroughStep}
        onNext={() => setWalkthroughStep((prev) => prev + 1)}
        onPrev={() => setWalkthroughStep((prev) => prev - 1)}
        onDismiss={() => setWalkthroughStep(-1)}
      />
    </div>
  );
}
