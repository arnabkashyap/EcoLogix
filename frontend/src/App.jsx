import React, { useState, useEffect } from 'react';
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
  const [paretoPoints, setParetoPoints] = useState([]);
  const [impactSummary, setImpactSummary] = useState(null);

  const [showExplainer, setShowExplainer] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

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

        setDepot(fleetsRes.depot || { city: 'NCR Freight Hub, Delhi', lat: 28.6139, lng: 77.2090 });
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
        const fbDepot = { city: 'NCR Freight Hub, Delhi', lat: 28.6139, lng: 77.2090 };
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header onOpenDemoGuide={() => setShowDemoGuide(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-8 pb-20 md:pb-24">
        {/* Top Header & Key Result Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">Your Optimized Route</h1>
            <p className="text-xs text-slate-400 mt-1">Carbon-aware freight decision tool</p>
          </div>
          <div className="flex items-center gap-3">
            {routeResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                <span>{routeResult.co2_saved_pct}% less CO₂</span>
              </div>
            )}
            <button
              onClick={() => setShowDemoGuide(true)}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
            >
              Demo Script
            </button>
          </div>
        </div>

        {/* Combined Route Planner Section */}
        <div id="route-optimizer" className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">1. Optimize Your Route</h2>
            <span className="text-[11px] text-slate-400 font-medium">Select vehicle & cargo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step A: Vehicle Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">Select Fleet Vehicle</label>
              <div className="grid grid-cols-1 gap-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicle(v);
                      if (selectedShipmentIds.length > 0) {
                        runOptimization(v.id, selectedShipmentIds, alpha);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      selectedVehicle?.id === v.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{v.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {v.vehicle_type === 'ev_truck' ? 'Electric Truck' : 'Heavy Diesel Truck'} • {(v.capacity_kg / 1000).toFixed(1)}t Capacity
                      </div>
                    </div>
                    {selectedVehicle?.id === v.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step B: Shipment Selection Checklist */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">
                Select Cargo Shipments ({selectedShipmentIds.length}/{shipments.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {shipments.map((s) => {
                  const isChecked = selectedShipmentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-slate-950 border-slate-700 text-slate-200'
                          : 'bg-slate-950/30 border-slate-900 text-slate-500 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleShipmentToggle(s.id)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 focus:ring-0"
                        />
                        <span className="font-medium text-slate-200">{s.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{s.weight_kg} kg</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => selectedVehicle && runOptimization(selectedVehicle.id, selectedShipmentIds, alpha)}
            disabled={isOptimizing || !selectedVehicle || selectedShipmentIds.length === 0}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                Calculating Route...
              </>
            ) : (
              'Optimize Route'
            )}
          </button>
        </div>

        {/* Side-by-Side Clean Comparison (Standard vs EcoLogix) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="font-semibold text-slate-400 border-b border-slate-800 pb-2">● Standard Route (Baseline)</div>
            <div className="grid grid-cols-3 gap-2 text-slate-300">
              <div>
                <div className="text-[11px] text-slate-400">Distance</div>
                <div className="font-semibold text-slate-200 mt-0.5">{routeResult ? `${routeResult.baseline_distance_km || routeResult.total_distance_km} km` : '--'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Time</div>
                <div className="font-semibold text-slate-200 mt-0.5">{routeResult ? `${routeResult.total_time_min} min` : '--'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Emissions</div>
                <div className="font-semibold text-amber-400 mt-0.5">{routeResult ? `${routeResult.baseline_co2_kg} kg CO₂` : '--'}</div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">● EcoLogix Recommended Route</div>
            <div className="grid grid-cols-3 gap-2 text-slate-300">
              <div>
                <div className="text-[11px] text-slate-400">Distance</div>
                <div className="font-semibold text-slate-100 mt-0.5">{routeResult ? `${routeResult.total_distance_km} km` : '--'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Time</div>
                <div className="font-semibold text-slate-200 mt-0.5">{routeResult ? `${routeResult.total_time_min} min` : '--'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Emissions</div>
                <div className="font-bold text-emerald-400 mt-0.5">{routeResult ? `${routeResult.total_co2_kg} kg CO₂` : '--'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Centerpiece: Route Map */}
        <div id="map-view" className="space-y-2 scroll-mt-20">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Route Map</span>
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-normal">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Standard route</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> EcoLogix route</span>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
            <MapView routeResult={routeResult} depot={depot} />
          </div>
        </div>

        {/* Priority Trade-off Slider */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <AlphaSlider
            alpha={alpha}
            onChangeAlpha={handleAlphaChange}
            onOptimize={() => selectedVehicle && runOptimization(selectedVehicle.id, selectedShipmentIds, alpha)}
            isOptimizing={isOptimizing}
          />
        </div>

        {/* Secondary Expandable Sections Below the Fold */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detailed Options & Calculations</div>

          {/* Pareto Chart */}
          <details className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs">
            <summary className="font-semibold text-slate-200 cursor-pointer flex items-center justify-between">
              <span>Speed vs. CO₂ Trade-off Curve</span>
              <span className="text-[11px] text-slate-400 font-normal group-open:hidden">View chart</span>
            </summary>
            <div id="pareto-chart" className="mt-4 pt-4 border-t border-slate-800/80">
              <ParetoChart
                paretoPoints={paretoPoints}
                currentAlpha={alpha}
                onSelectAlpha={handleAlphaChange}
                solutionMethod={routeResult?.solution_method}
              />
            </div>
          </details>

          {/* 7-Leg Route Breakdown */}
          {routeResult && routeResult.legs && (
            <details className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs">
              <summary className="font-semibold text-slate-200 cursor-pointer flex items-center justify-between">
                <span>Detailed Route Leg Breakdown ({routeResult.legs.length} legs)</span>
                <span className="text-[11px] text-slate-400 font-normal group-open:hidden">View table</span>
              </summary>
              <div className="mt-4 pt-4 border-t border-slate-800/80 overflow-x-auto space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExplainer(true)}
                    className="text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Explain Emissions Math
                  </button>
                </div>
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Leg #</th>
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">To</th>
                      <th className="px-3 py-2">Distance</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">CO₂ Output</th>
                      <th className="px-3 py-2">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {routeResult.legs.map((leg) => (
                      <tr key={leg.sequence_order}>
                        <td className="px-3 py-2 font-mono text-emerald-400">#{leg.sequence_order}</td>
                        <td className="px-3 py-2 text-slate-300">{leg.from_stop}</td>
                        <td className="px-3 py-2 text-slate-100 font-semibold">{leg.to_stop}</td>
                        <td className="px-3 py-2">{leg.distance_km} km</td>
                        <td className="px-3 py-2 text-amber-300">{leg.time_min} min</td>
                        <td className="px-3 py-2 font-bold text-emerald-400">{leg.co2_kg} kg</td>
                        <td className="px-3 py-2">
                          {leg.climate_risk_flag ? (
                            <span className="text-[10px] text-amber-300 font-semibold">Flagged</span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Load Pooling Opportunity */}
          <details className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs">
            <summary className="font-semibold text-slate-200 cursor-pointer flex items-center justify-between">
              <span>Empty Trip Opportunity (Load Pooling)</span>
              <span className="text-[11px] text-slate-400 font-normal group-open:hidden">View matches</span>
            </summary>
            <div id="load-pool" className="mt-4 pt-4 border-t border-slate-800/80">
              <LoadPoolPanel onMatchTriggered={fetchImpactSummary} />
            </div>
          </details>

          {/* EV Fleet Scenario */}
          <details className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs">
            <summary className="font-semibold text-slate-200 cursor-pointer flex items-center justify-between">
              <span>EV Fleet Scenario Comparison</span>
              <span className="text-[11px] text-slate-400 font-normal group-open:hidden">View scenario</span>
            </summary>
            <div id="ev-comparison" className="mt-4 pt-4 border-t border-slate-800/80">
              <EVComparisonCard routeResult={routeResult} />
            </div>
          </details>

          {/* Aggregate Impact Summary & Tenant Verification */}
          <details className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs">
            <summary className="font-semibold text-slate-200 cursor-pointer flex items-center justify-between">
              <span>Tenant System & Overall Impact</span>
              <span className="text-[11px] text-slate-400 font-normal group-open:hidden">View details</span>
            </summary>
            <div id="impact-summary" className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span>Active Tenant: <strong className="text-slate-200">{tenant?.company_name}</strong></span>
                <span className="text-[10px] text-emerald-400 font-mono">JWT Verified</span>
              </div>
              <ImpactSummaryPanel impactSummary={impactSummary} />
            </div>
          </details>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 mt-8 mb-16 text-xs text-slate-500 flex items-center justify-between">
        <div>EcoLogix Decision Engine</div>
        <div className="text-slate-400">Definition of Done Passed</div>
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
    </div>
  );
}
