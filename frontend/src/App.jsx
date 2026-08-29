import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { MapView } from './components/MapView';
import { ParetoChart } from './components/ParetoChart';
import { AlphaSlider } from './components/AlphaSlider';
import { LoadPoolPanel } from './components/LoadPoolPanel';
import { EmissionsExplainer } from './components/EmissionsExplainer';
import { DemoGuideModal } from './components/DemoGuideModal';
import { ImpactSummaryPanel } from './components/ImpactSummaryPanel';
import { EVComparisonCard } from './components/EVComparisonCard';
import { WalkthroughTooltip } from './components/WalkthroughTooltip';
import { ShipmentInputForm } from './components/ShipmentInputForm';
import { VoiceNavigation } from './components/VoiceNavigation';
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
  Navigation,
} from 'lucide-react';

export default function App() {
  const { tenant, activeCompanyKey } = useAuth();

  const [depot, setDepot] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState([]);

  const [alpha, setAlpha] = useState(0.5);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [routeCategory, setRouteCategory] = useState('greener');
  const [paretoPoints, setParetoPoints] = useState([]);
  const [impactSummary, setImpactSummary] = useState(null);

  const [showExplainer, setShowExplainer] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [activeNavigationRoute, setActiveNavigationRoute] = useState(null);

  const fetchImpactSummary = async () => {
    try {
      const summary = await api.getImpactSummary();
      setImpactSummary(summary);
    } catch (err) {
      console.error('Failed to fetch impact summary:', err);
    }
  };

  // Load tenant domain data when active tenant changes
  useEffect(() => {
    async function loadTenantData() {
      if (!tenant) return;
      try {
        const [fleetsRes, vehRes, shipRes] = await Promise.all([
          api.getFleets(),
          api.getVehicles(),
          api.getShipments(),
        ]);

        setDepot(fleetsRes.depot || { city: 'Guwahati Hub', lat: 26.1445, lng: 91.7362 });
        const vehList = vehRes.vehicles || [];
        setVehicles(vehList);
        if (vehList.length > 0) {
          setSelectedVehicle(vehList[0]);
        }

        const shipList = shipRes.shipments || [];
        setShipments(shipList);
        setSelectedShipmentIds(shipList.map((s) => s.id));

        fetchImpactSummary();

        // Auto trigger initial optimization
        if (vehList.length > 0 && shipList.map((s) => s.id).length > 0) {
          runOptimization(vehList[0].id, shipList.map((s) => s.id), alpha);
        }
      } catch (err) {
        console.error('Failed to load tenant data:', err);
        const fbDepot = { city: 'Guwahati Hub', lat: 26.1445, lng: 91.7362 };
        const fbVehicles = [
          { id: 'veh-nw-101', name: 'NW Heavy Freightliner #101', vehicle_type: 'heavy_truck', capacity_kg: 18000, current_lat: 28.6139, current_lng: 77.2090 },
          { id: 'veh-nw-202', name: 'NW E-Cascadia EV Truck #202', vehicle_type: 'ev_truck', capacity_kg: 14000, current_lat: 28.6139, current_lng: 77.2090 },
        ];
        const fbShipments = [
          { id: 'ship-nw-01', title: 'Gurugram Cyber City Cargo', dest_name: 'Gurugram Industrial Hub', weight_kg: 4200, dest_lat: 28.4595, dest_lng: 77.0266 },
          { id: 'ship-nw-02', title: 'Noida Commercial Delivery', dest_name: 'Noida Sector 62 Commerce Center', weight_kg: 2800, dest_lat: 28.6280, dest_lng: 77.3649 },
          { id: 'ship-nw-03', title: 'Faridabad Manufacturing Consignment', dest_name: 'Faridabad Industrial Area', weight_kg: 3500, dest_lat: 28.4089, dest_lng: 77.3178 },
        ];
        setDepot(fbDepot);
        setVehicles(fbVehicles);
        setSelectedVehicle(fbVehicles[0]);
        setShipments(fbShipments);
        setSelectedShipmentIds(fbShipments.map((s) => s.id));
      }
    }
    loadTenantData();
  }, [tenant]);

  const runOptimization = async (vId, sIds, currentAlpha) => {
    if (!vId || !sIds || sIds.length === 0) return;
    setIsOptimizing(true);
    try {
      // 1. Submit optimization job
      const jobRes = await api.optimizeRoute(vId, sIds, currentAlpha);
      const jobId = jobRes.job_id;

      // 2. Poll for job completion
      let attempts = 0;
      let completedJob = null;
      while (attempts < 15) {
        await new Promise((r) => setTimeout(r, 600));
        const statusRes = await api.getJobStatus(jobId);
        if (statusRes.status === 'completed') {
          completedJob = statusRes;
          break;
        }
        attempts++;
      }

      if (completedJob && completedJob.result) {
        setRouteResult(completedJob.result);
        setParetoPoints(completedJob.result.pareto_points || []);
        fetchImpactSummary();
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAlphaChange = (newAlpha) => {
    setAlpha(newAlpha);
    if (selectedVehicle && selectedShipmentIds.length > 0) {
      runOptimization(selectedVehicle.id, selectedShipmentIds, newAlpha);
    }
  };

  const handleShipmentToggle = (sId) => {
    let updated;
    if (selectedShipmentIds.includes(sId)) {
      updated = selectedShipmentIds.filter((id) => id !== sId);
    } else {
      updated = [...selectedShipmentIds, sId];
    }
    setSelectedShipmentIds(updated);
    if (selectedVehicle && updated.length > 0) {
      runOptimization(selectedVehicle.id, updated, alpha);
    }
  };

  const co2SavedKg = routeResult
    ? Math.max(0, (routeResult.baseline_co2_kg || 0) - (routeResult.total_co2_kg || 0))
    : 0;

  const activeRouteResult = useMemo(() => {
    if (!routeResult) return null;
    if (routeCategory === 'faster') {
      return { ...routeResult, ordered_stops: routeResult.baseline_stops };
    }
    return routeResult;
  }, [routeResult, routeCategory]);

  return (
    <div className="min-h-screen bg-[#181A20] text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header onOpenDemoGuide={() => setShowDemoGuide(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 pb-20 md:pb-24">
        {/* Level 1 Hero Banner & Purpose (10-second clarity, Req #1) */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-950/90 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-extrabold border border-emerald-500/30 flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Carbon-Aware Freight Optimization
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-snug">
                This route saves{' '}
                <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  {routeResult ? `${routeResult.co2_saved_pct}%` : '0%'} CO₂
                </span>{' '}
                and uses{' '}
                <span className="text-emerald-300">
                  {routeResult ? `${routeResult.total_distance_km} km` : '--'}
                </span>{' '}
                compared to the standard route.
              </h2>
            </div>
          </div>
        </div>

        {/* Level 1 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                CO₂ Reduction
              </div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
                {routeResult ? `-${routeResult.co2_saved_pct}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                vs standard route
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
              title="How we calculated emissions"
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
                Distance: {routeResult ? `${routeResult.total_distance_km} km` : '--'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Empty Trip Opportunity
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-1 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                Return Leg Matching
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                Cross-Company Load Pooling
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
            <div className="flex items-center gap-3">
              {routeResult && (
                <button
                  onClick={() =>
                    setActiveNavigationRoute({
                      category: alpha === 1 ? 'fast' : alpha === 0 ? 'green' : 'balanced',
                      waypoints: (routeResult.ordered_stops || []).map((s) => ({ lat: s.lat, lng: s.lng })),
                    })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Start Voice Navigation</span>
                </button>
              )}
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">CO₂ Reduction</div>
                <div className="text-3xl font-black text-emerald-400">
                  {routeResult ? `-${routeResult.co2_saved_pct}%` : '0%'}
                </div>
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
          {/* Left Column: Primary 3-Step Workflow Controls (4 cols, Req #2) */}
          <div id="route-optimizer" className="lg:col-span-4 space-y-5 scroll-mt-20 md:scroll-mt-24">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Primary Route Planner
                </h3>
                <p className="text-[11px] text-slate-400">Follow 3 simple steps to generate a greener route.</p>
              </div>

              {/* Step 1: Select Fleet Vehicle */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center border border-emerald-500/30">1</span>
                  Select Fleet Vehicle:
                </div>
                {vehicles.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 rounded-xl bg-[#111827] border border-slate-800 text-center">
                    Select a vehicle to start optimizing.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVehicle(v);
                          if (selectedShipmentIds.length > 0) {
                            runOptimization(v.id, selectedShipmentIds, alpha);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          selectedVehicle?.id === v.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-slate-100 font-semibold shadow-md shadow-emerald-500/10'
                            : 'bg-[#111827]/60 border-slate-800 text-slate-400 hover:bg-[#1F2937]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-200">{v.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {v.vehicle_type === 'ev_truck' ? '⚡ Electric Truck' : '🚛 Heavy Diesel Truck'} • {(v.capacity_kg / 1000).toFixed(1)}t Payload
                          </div>
                        </div>
                        {selectedVehicle?.id === v.id && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Shipments */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center border border-emerald-500/30">2</span>
                  Select Shipments ({selectedShipmentIds.length}/{shipments.length}):
                </div>
                {shipments.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 rounded-xl bg-[#111827] border border-slate-800 text-center">
                    Choose at least one shipment to create a route.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {shipments.map((s) => {
                      const isChecked = selectedShipmentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-all ${
                            isChecked
                              ? 'bg-[#111827] border-slate-700 text-slate-200'
                              : 'bg-[#181A20]/40 border-slate-900 text-slate-500 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleShipmentToggle(s.id)}
                            className="mt-0.5 rounded border-slate-700 bg-[#111827] text-emerald-500 focus:ring-0 accent-emerald-500"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-slate-200">{s.title}</div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                              <span>📍 {s.dest_name}</span>
                              <span className="font-semibold text-emerald-400">{s.weight_kg} kg</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Optimize Action */}
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center border border-emerald-500/30">3</span>
                  Optimize Route:
                </div>
                <button
                  onClick={() => selectedVehicle && runOptimization(selectedVehicle.id, selectedShipmentIds, alpha)}
                  disabled={isOptimizing || !selectedVehicle || selectedShipmentIds.length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      Optimizing Route...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                      Optimize Route
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Smart Shipment Spec & Risk Entry Form */}
            <ShipmentInputForm
              onSubmit={(smartData) => {
                if (selectedVehicle && selectedShipmentIds.length > 0) {
                  runOptimization(selectedVehicle.id, selectedShipmentIds, alpha);
                }
              }}
            />

            {/* Faster ↔ Greener Slider */}
            <AlphaSlider
              alpha={alpha}
              onChangeAlpha={handleAlphaChange}
              onOptimize={() => selectedVehicle && runOptimization(selectedVehicle.id, selectedShipmentIds, alpha)}
              isOptimizing={isOptimizing}
            />

          </div>

          {/* Right Column: Map & Results (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive Route Map (Req #4) */}
            <div id="map-view" className="scroll-mt-20 md:scroll-mt-24 relative space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => routeResult && setRouteCategory('faster')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                    routeCategory === 'faster'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#111827] border-slate-700 text-slate-400 hover:bg-[#1F2937]'
                  } ${!routeResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Faster Route (Time-Optimized)
                </button>
                <button
                  onClick={() => routeResult && setRouteCategory('greener')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                    routeCategory === 'greener'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#111827] border-slate-700 text-slate-400 hover:bg-[#1F2937]'
                  } ${!routeResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Greener Route (Carbon-Aware)
                </button>
              </div>
              <MapView routeResult={activeRouteResult} depot={depot} />
            </div>

            {/* EV Fleet Scenario */}
            <div id="ev-comparison" className="scroll-mt-20 md:scroll-mt-24">
              <EVComparisonCard routeResult={routeResult} />
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
                    <tbody className="divide-y divide-slate-800/60">
                      {routeResult.legs.map((leg) => (
                        <tr key={leg.sequence_order} className="hover:bg-[#111827]/40">
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
                            {leg.climate_risk_flag ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-help"
                                title={leg.climate_risk_note}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Flagged Risk
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Load Pooling Opportunity */}
            <div id="load-pool" className="scroll-mt-20 md:scroll-mt-24">
              <LoadPoolPanel onMatchTriggered={fetchImpactSummary} />
            </div>

            {/* Aggregate Impact Summary */}
            <div id="impact-summary" className="scroll-mt-20 md:scroll-mt-24">
              <ImpactSummaryPanel impactSummary={impactSummary} />
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

      {/* Voice Navigation Overlay */}
      {activeNavigationRoute && (
        <VoiceNavigation
          route={activeNavigationRoute}
          onExit={() => setActiveNavigationRoute(null)}
        />
      )}
    </div>
  );
}
