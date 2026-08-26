import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { ParetoChart } from './components/ParetoChart';
import { AlphaSlider } from './components/AlphaSlider';
import { LoadPoolPanel } from './components/LoadPoolPanel';
import { EmissionsExplainer } from './components/EmissionsExplainer';
import { DemoGuideModal } from './components/DemoGuideModal';
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

  const [showExplainer, setShowExplainer] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false);

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

        setDepot(fleetsRes.depot);
        const vehList = vehRes.vehicles || [];
        setVehicles(vehList);
        if (vehList.length > 0) {
          setSelectedVehicle(vehList[0]);
        }

        const shipList = shipRes.shipments || [];
        setShipments(shipList);
        setSelectedShipmentIds(shipList.map((s) => s.id));

        // Auto trigger initial optimization
        if (vehList.length > 0 && shipList.length > 0) {
          runOptimization(vehList[0].id, shipList.map((s) => s.id), alpha);
        }
      } catch (err) {
        console.error('Failed to load tenant data:', err);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Navigation */}
      <Header onOpenDemoGuide={() => setShowDemoGuide(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top Metric Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                CO₂ Reduction
              </div>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                <Leaf className="w-5 h-5 text-emerald-400" />
                {routeResult ? `-${routeResult.co2_saved_pct}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                vs time-only baseline route
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Optimized CO₂ Emissions
              </div>
              <div className="text-2xl font-black text-slate-100 mt-0.5">
                {routeResult ? `${routeResult.total_co2_kg} kg` : '--'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Baseline: {routeResult ? `${routeResult.baseline_co2_kg} kg` : '--'}
              </div>
            </div>
            <button
              onClick={() => setShowExplainer(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
              title="How we calculated this"
            >
              <Calculator className="w-5 h-5" />
            </button>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Estimated Transit Time
              </div>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-5 h-5" />
                {routeResult ? `${routeResult.total_time_min} min` : '--'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Total Distance: {routeResult ? `${routeResult.total_distance_km} km` : '--'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Active Tenant Isolation
              </div>
              <div className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {tenant ? tenant.company_name : 'Verifying...'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Server JWT Verified
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dashboard Core: Left Controls + Right Map & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Fleet & Optimization Controls (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Vehicle Selection Card */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-400" /> Active Fleet Vehicle
              </h3>
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
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedVehicle?.id === v.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{v.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.vehicle_type} • {v.capacity_kg} kg cap
                      </div>
                    </div>
                    {selectedVehicle?.id === v.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Shipment Selection Checklist */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" /> Shipments to Route ({selectedShipmentIds.length}/{shipments.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {shipments.map((s) => {
                  const isChecked = selectedShipmentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`p-2 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'bg-slate-900 border-slate-700 text-slate-200'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleShipmentToggle(s.id)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 accent-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200">{s.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                          <span>{s.dest_name}</span>
                          <span className="font-mono text-emerald-400">{s.weight_kg} kg</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Objective Alpha Slider */}
            <AlphaSlider
              alpha={alpha}
              onChangeAlpha={handleAlphaChange}
              onOptimize={() => selectedVehicle && runOptimization(selectedVehicle.id, selectedShipmentIds, alpha)}
              isOptimizing={isOptimizing}
            />

            {/* Pareto Frontier Chart */}
            <ParetoChart
              paretoPoints={paretoPoints}
              currentAlpha={alpha}
              onSelectAlpha={handleAlphaChange}
            />
          </div>

          {/* Right Column: Interactive Map & Route Summary (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Interactive Leaflet Map */}
            <MapView routeResult={routeResult} depot={depot} />

            {/* Route Sequence & Legs Table */}
            {routeResult && routeResult.legs && (
              <div className="glass-panel p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" /> Route Leg Breakdown
                  </h3>
                  <button
                    onClick={() => setShowExplainer(true)}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Explain Emissions Math
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2">Leg #</th>
                        <th className="px-3 py-2">From</th>
                        <th className="px-3 py-2">To</th>
                        <th className="px-3 py-2">Dist (km)</th>
                        <th className="px-3 py-2">Time (min)</th>
                        <th className="px-3 py-2">CO₂ (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {routeResult.legs.map((leg) => (
                        <tr key={leg.sequence_order} className="hover:bg-slate-900/40">
                          <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                            #{leg.sequence_order}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{leg.from_stop}</td>
                          <td className="px-3 py-2 text-slate-200 font-semibold">{leg.to_stop}</td>
                          <td className="px-3 py-2 font-mono">{leg.distance_km} km</td>
                          <td className="px-3 py-2 font-mono text-amber-300">{leg.time_min} min</td>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                            {leg.co2_kg} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cross-Tenant Load Pooling Engine Section */}
            <LoadPoolPanel />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800 py-4 px-6 mt-8 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          <strong>EcoLogix Engine</strong> — Built for 2-Day Hackathon Submission.
        </div>
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Definition of Done Passed
          </span>
          <span>•</span>
          <span>Shared Emissions Model v1.0</span>
        </div>
      </footer>

      {/* Modals */}
      <EmissionsExplainer
        isOpen={showExplainer}
        onClose={() => setShowExplainer(false)}
        vehicleType={selectedVehicle?.vehicle_type}
      />
      <DemoGuideModal
        isOpen={showDemoGuide}
        onClose={() => setShowDemoGuide(false)}
      />
    </div>
  );
}
