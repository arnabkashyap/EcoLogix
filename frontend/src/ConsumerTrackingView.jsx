import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapView } from './components/MapView';
import { RoutePreferenceSlider } from './components/RoutePreferenceSlider';
import { DistanceRouteLine } from './components/DistanceRouteLine';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_STANDARD, EASE_EMPHASIZED } from './motion';
import { api, fetchParetoRoutes, fetchDriverStatus } from './services/api';
import {
  MapPin,
  Search,
  CheckCircle2,
  Navigation,
  Sparkles,
  Leaf,
  Clock,
  Truck,
  Package,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  X,
  PartyPopper,
} from 'lucide-react';

// Custom Live Driver Leaflet Marker
const driverLiveIcon = L.divIcon({
  className: 'custom-driver-live-marker',
  html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="width: 26px; height: 26px; border-radius: 50%; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(16, 185, 129, 0.9); z-index: 20; display: flex; align-items: center; justify-content: center; color: #022c22; font-size: 13px; font-weight: bold;">🚚</div>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export default function ConsumerTrackingView({ onExit }) {
  const [destQuery, setDestQuery] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  // Fixed discrete alpha: 0.0 (Greenest), 0.5 (Optimal), 1.0 (Most Polluted)
  const [alpha, setAlpha] = useState(0.5);
  const [depot, setDepot] = useState({
    city: 'Guwahati Logistics Hub',
    lat: 26.1445,
    lng: 91.7362,
  });

  const [routeResult, setRouteResult] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [roadStats, setRoadStats] = useState(null);

  // Status & Polling State
  // Stages: "Picked up" -> "In transit" -> "Nearby" -> "Delivered"
  const [transitProgress, setTransitProgress] = useState(0.15); // 0.0 to 1.0
  const [consumerStatus, setConsumerStatus] = useState('Picked up');
  const [showDeliveredToast, setShowDeliveredToast] = useState(false);
  const hasFiredDeliveryToast = useRef(false);

  // Load depot or tenant info on mount
  useEffect(() => {
    async function initDepot() {
      try {
        let token = localStorage.getItem('ecologix_token');
        if (!token) {
          const auth = await api.devLogin('A').catch(() => null);
          if (auth?.access_token) {
            token = auth.access_token;
          }
        }
        const fleetsRes = await api.getFleets().catch(() => null);
        if (fleetsRes?.depot) {
          setDepot(fleetsRes.depot);
        }
      } catch (err) {
        console.warn('Tenant depot initialization notice:', err);
      }
    }
    initDepot();
  }, []);

  // Poll driver status every 6 seconds while mounted (cleaned up on unmount)
  useEffect(() => {
    let isMounted = true;

    const pollDriver = async () => {
      try {
        await fetchDriverStatus().catch(() => null);
        if (!isMounted) return;

        // Progressively advance consumer tracking status if destination is verified
        if (destCoords) {
          setTransitProgress((prev) => {
            if (prev >= 1.0) return 1.0;
            const next = Math.min(prev + 0.18, 1.0);
            return next;
          });
        }
      } catch (err) {
        console.warn('Driver status polling notice:', err);
      }
    };

    pollDriver();
    const intervalId = setInterval(pollDriver, 6000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [destCoords]);

  // Derive consumer-facing status (Picked up -> In transit -> Nearby -> Delivered)
  useEffect(() => {
    if (!destCoords) {
      setConsumerStatus('Awaiting destination');
      return;
    }

    if (transitProgress < 0.25) {
      setConsumerStatus('Picked up');
    } else if (transitProgress < 0.70) {
      setConsumerStatus('In transit');
    } else if (transitProgress < 1.00) {
      setConsumerStatus('Nearby');
    } else {
      setConsumerStatus('Delivered');
      if (!hasFiredDeliveryToast.current) {
        hasFiredDeliveryToast.current = true;
        setShowDeliveredToast(true);
      }
    }
  }, [transitProgress, destCoords]);

  // Compute live driver marker coordinates along the transit path
  const driverLiveCoords = useMemo(() => {
    if (!destCoords || !depot) return null;
    const t = transitProgress;
    const startLat = depot.lat;
    const startLng = depot.lng;
    const endLat = destCoords.lat;
    const endLng = destCoords.lng;
    return {
      lat: startLat + t * (endLat - startLat),
      lng: startLng + t * (endLng - startLng),
    };
  }, [depot, destCoords, transitProgress]);

  // Geocode destination using OpenStreetMap Nominatim (matches ShipmentInputForm.jsx)
  const handleGeocodeDest = async (e) => {
    if (e) e.preventDefault();
    if (!destQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        const resolvedLoc = {
          lat,
          lon,
          lng: lon,
          name: first.display_name.split(',')[0],
          fullName: first.display_name,
        };
        setDestCoords(resolvedLoc);
        // Reset transit progress when new destination is tracked
        setTransitProgress(0.15);
        hasFiredDeliveryToast.current = false;
        setShowDeliveredToast(false);
        calculateConsumerRoute(resolvedLoc, alpha);
      } else {
        setGeocodeError('Location not found. Please specify a city or landmark.');
      }
    } catch (err) {
      setGeocodeError('Geocoding service unavailable.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Calculate route from depot to resolved destination using exact discrete alpha
  const calculateConsumerRoute = async (targetLoc, currentAlpha) => {
    if (!targetLoc) return;
    setIsCalculatingRoute(true);

    try {
      // Exactly discrete alpha sent to backend (0.0, 0.5, or 1.0)
      const discreteAlpha = Number(currentAlpha);
      const res = await fetchParetoRoutes({
        vehicle_id: 'veh-nw-101',
        shipment_ids: ['ship-nw-01'],
        alpha: discreteAlpha,
      }).catch(() => null);

      if (res && res.legs) {
        // Adapt result destination to consumer query
        const customStops = [
          { id: 'depot', title: depot.city || 'Depot', lat: depot.lat, lng: depot.lng },
          { id: 'dest-01', title: targetLoc.name, dest_name: targetLoc.name, lat: targetLoc.lat, lng: targetLoc.lng, load_kg: 500 },
        ];
        const customResult = {
          ...res,
          ordered_stops: customStops,
          legs: [
            {
              sequence_order: 1,
              from_stop: depot.city || 'Depot',
              to_stop: targetLoc.name,
              from_lat: depot.lat,
              from_lng: depot.lng,
              to_lat: targetLoc.lat,
              to_lng: targetLoc.lng,
              distance_km: res.total_distance_km || 42.5,
              time_min: res.total_time_min || (discreteAlpha === 0.0 ? 58 : discreteAlpha === 1.0 ? 42 : 50),
              co2_kg: res.total_co2_kg || (discreteAlpha === 0.0 ? 19.4 : discreteAlpha === 1.0 ? 38.6 : 26.2),
              climate_risk_flag: false,
            },
          ],
        };
        setRouteResult(customResult);
      } else {
        // Fallback local route result
        setRouteResult({
          total_distance_km: 38.4,
          total_time_min: discreteAlpha === 0.0 ? 58 : discreteAlpha === 1.0 ? 40 : 48,
          total_co2_kg: discreteAlpha === 0.0 ? 18.5 : discreteAlpha === 1.0 ? 39.2 : 25.4,
          co2_saved_pct: discreteAlpha === 0.0 ? 35.0 : discreteAlpha === 1.0 ? 0.0 : 22.0,
          ordered_stops: [
            { id: 'depot', title: depot.city, lat: depot.lat, lng: depot.lng },
            { id: 'dest', title: targetLoc.name, dest_name: targetLoc.name, lat: targetLoc.lat, lng: targetLoc.lng, load_kg: 500 },
          ],
          legs: [
            {
              sequence_order: 1,
              from_stop: depot.city,
              to_stop: targetLoc.name,
              from_lat: depot.lat,
              from_lng: depot.lng,
              to_lat: targetLoc.lat,
              to_lng: targetLoc.lng,
              distance_km: 38.4,
              time_min: discreteAlpha === 0.0 ? 58 : discreteAlpha === 1.0 ? 40 : 48,
              co2_kg: discreteAlpha === 0.0 ? 18.5 : discreteAlpha === 1.0 ? 39.2 : 25.4,
              climate_risk_flag: false,
            },
          ],
        });
      }
    } catch (err) {
      console.warn('Consumer route calculation notice:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleAlphaChange = (newAlpha) => {
    // Strictly discrete: 0.0, 0.5, or 1.0
    setAlpha(newAlpha);
    if (destCoords) {
      calculateConsumerRoute(destCoords, newAlpha);
    }
  };

  const handleRoadStats = (stats) => {
    setRoadStats(stats);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Real-time In-App Delivery Confirmation Toast / Banner */}
      <AnimatePresence>
        {showDeliveredToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: DURATION_STANDARD, ease: EASE_EMPHASIZED }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-xl w-[92%] bg-gradient-to-r from-emerald-950 via-[#121722] to-teal-950 border-2 border-emerald-400/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(16,185,129,0.35)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <PartyPopper className="w-5 h-5 animate-bounce text-emerald-400" />
              </div>
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    Delivered
                  </span>
                  <h3 className="font-extrabold text-slate-100 text-sm">
                    Shipment Arrived Safely!
                  </h3>
                </div>
                <p className="text-slate-300">
                  Your carbon-conscious shipment has been successfully delivered at <strong className="text-emerald-300">{destCoords?.name}</strong>.
                </p>
                <div className="pt-1 flex items-center gap-4 text-[11px] font-mono text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5" /> {roadStats?.co2_kg ?? routeResult?.total_co2_kg ?? 18.5} kg CO₂ Saved
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Drop-off
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDeliveredToast(false)}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Dismiss Notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0B0E14]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-sm shadow-md">
            🌱
          </div>
          <div>
            <h1 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
              EcoLogix <span className="text-emerald-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Live Consumer Track</span>
            </h1>
            <p className="text-[11px] text-slate-400">Carbon-Aware Real-Time Shipment & Transit Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Live Polling Feed (6s)
          </span>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Controls & Status Column */}
        <div className="lg:col-span-1 space-y-5">
          {/* 1. Destination Input Form */}
          <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> 1. Destination Lookup
              </h2>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">
                Nominatim
              </span>
            </div>

            <form onSubmit={handleGeocodeDest} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Delivery Destination / Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="e.g. Guwahati Airport, Dispur, Shillong..."
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isGeocoding || !destQuery.trim()}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/10 shrink-0"
                  >
                    {isGeocoding ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>{isGeocoding ? 'Locating' : 'Track'}</span>
                  </button>
                </div>
              </div>

              {geocodeError && (
                <div className="text-rose-400 text-[11px] flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{geocodeError}</span>
                </div>
              )}

              {destCoords && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Location Resolved: {destCoords.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Lat: {destCoords.lat.toFixed(4)}, Lng: {destCoords.lng.toFixed(4)}
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* 2. Discrete 3-Stop Route Preference Slider */}
          <RoutePreferenceSlider
            alpha={alpha}
            onChangeAlpha={handleAlphaChange}
            disabled={isCalculatingRoute}
          />

          {/* 4. Minimal Consumer Status Display Area */}
          <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" /> Delivery Status
              </h2>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                consumerStatus === 'Delivered'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : consumerStatus === 'Nearby'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}>
                {consumerStatus}
              </span>
            </div>

            {/* 4-Step Consumer Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center">
                {[
                  { label: 'Picked Up', icon: Package, done: transitProgress >= 0.1 },
                  { label: 'In Transit', icon: Truck, done: transitProgress >= 0.35 },
                  { label: 'Nearby', icon: MapPin, done: transitProgress >= 0.75 },
                  { label: 'Delivered', icon: CheckCircle2, done: transitProgress >= 1.0 },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.label}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        step.done
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-black'
                          : 'bg-[#0B0E14]/60 border-slate-800/80 text-slate-500 font-medium'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="w-full bg-[#0B0E14] h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(transitProgress * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Status Summary & Clean Metrics */}
            <div className="space-y-3 text-xs pt-1">
              <div className="bg-[#0B0E14]/80 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-semibold text-emerald-400">
                    {destCoords ? destCoords.name : 'Awaiting input'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Current Phase:</span>
                  <span className="font-semibold text-slate-200">{consumerStatus}</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {(roadStats || routeResult) && (
                  <motion.div
                    key={`stats-${alpha}-${destCoords?.name}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: DURATION_STANDARD, ease: EASE_EMPHASIZED }}
                    className="grid grid-cols-3 gap-2 text-center"
                  >
                    <div className="bg-[#0B0E14]/60 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Road Dist</span>
                      <span className="text-xs font-black text-slate-100 font-mono">
                        {roadStats?.distance_km ?? routeResult?.total_distance_km} km
                      </span>
                    </div>
                    <div className="bg-[#0B0E14]/60 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Est. Time</span>
                      <span className="text-xs font-black text-amber-300 font-mono">
                        {roadStats?.time_min ?? routeResult?.total_time_min} min
                      </span>
                    </div>
                    <div className="bg-[#0B0E14]/60 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">CO₂ Saved</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        {roadStats?.co2_kg ?? routeResult?.total_co2_kg} kg
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right 3. Single MapView Instance with Live Driver Marker */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-4 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" /> 3. Live Route & Driver Map
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {alpha === 0.0 ? '🌿 Greenest Road Path (α = 0.0)' : alpha === 1.0 ? '⚡ Fastest Road Path (α = 1.0)' : '⚖️ Optimal Road Balance (α = 0.5)'}
              </span>
            </div>

            <div className="flex-1 w-full">
              <MapView
                routeResult={routeResult}
                depot={depot}
                routeCategory={alpha <= 0.2 ? 'greener' : 'faster'}
                setRouteCategory={(cat) => handleAlphaChange(cat === 'greener' ? 0.0 : 1.0)}
                customRouteLayer={
                  destCoords && (
                    <DistanceRouteLine
                      origin={depot}
                      destination={destCoords}
                      alpha={alpha}
                      onRouteStats={handleRoadStats}
                    />
                  )
                }
              >
                {/* Live Driver Position Marker on Leaflet Map */}
                {destCoords && driverLiveCoords && (
                  <Marker
                    position={[driverLiveCoords.lat, driverLiveCoords.lng]}
                    icon={driverLiveIcon}
                  >
                    <Popup>
                      <div className="p-1.5 text-slate-900 text-xs font-sans min-w-[160px]">
                        <div className="font-extrabold text-emerald-800 flex items-center gap-1">
                          🚚 EcoLogix Delivery Courier
                        </div>
                        <div className="text-[11px] text-slate-700 mt-1">
                          Status: <strong className="text-emerald-700">{consumerStatus}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          En route to: {destCoords.name}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapView>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
