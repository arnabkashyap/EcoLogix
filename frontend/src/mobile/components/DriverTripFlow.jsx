import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  findLoadPoolMatches,
  acceptDriverReturn,
  fetchDriverProfile,
  fetchDriverStatus,
  updateDriverStatus,
  notifyImpactUpdated,
} from '../../services/api';
import { VoiceNavigation } from '../../components/VoiceNavigation';
import { speakInstruction } from '../../utils/navigation';
import {
  MapPin,
  Package,
  CheckCircle2,
  Zap,
  Clock,
  Truck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Leaf,
  ChevronRight,
  Navigation,
  ShieldCheck,
  Award,
  Info,
  Volume2,
  RotateCcw,
} from 'lucide-react';

// Haversine distance calculator in kilometers
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const BASE_MISMATCH_THRESHOLD_KM = 1.0;

export default function DriverTripFlow({ tripId, onComplete }) {
  // Flow states: 'DETAILS' | 'EN_ROUTE' | 'AT_STOP' | 'RETURN_LOAD_ALERT' | 'RETURN_LOAD_ACCEPTED' | 'RETURN_LOAD_SKIPPED' | 'RETURN_TRIP' | 'COMPLETE'
  const [flowState, setFlowState] = useState('DETAILS');
  const [currentStopIdx, setCurrentStopIdx] = useState(0);
  const [returnCandidate, setReturnCandidate] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [returnAccepted, setReturnAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [isVoiceNavOpen, setIsVoiceNavOpen] = useState(false);

  // Driver Location & Base State
  const [registeredBase, setRegisteredBase] = useState({
    city: 'Guwahati',
    address: 'Betkuchi ISBT Freight Terminal, Guwahati, Assam',
    lat: 26.1214,
    lng: 91.7319,
  });

  const [liveLocation, setLiveLocation] = useState({
    lat: 26.1214,
    lng: 91.7319,
    source: 'telemetry',
  });

  // Extract structured route stops and legs from tripId
  const tripData = useMemo(() => {
    const defaultData = {
      origin: 'Betkuchi ISBT Freight Terminal',
      destination: 'ICD Amingaon Container Depot',
      distance: '18.5 km',
      time: '42 min',
      vehicle: 'NW Tata Signa Heavy Diesel #101',
      cargo: '12,500 kg',
      co2: '14.2 kg',
      routeObj: null,
    };

    if (typeof tripId === 'object' && tripId !== null) {
      const distStr = typeof tripId.distance === 'number' ? `${tripId.distance} km` : tripId.distance || defaultData.distance;
      const timeStr = typeof tripId.time === 'number' ? `${tripId.time} min` : tripId.time || defaultData.time;
      const co2Str = typeof tripId.co2 === 'number' ? `${tripId.co2} kg` : tripId.co2 || defaultData.co2;

      return {
        origin: tripId.origin || defaultData.origin,
        destination: tripId.destination || defaultData.destination,
        distance: distStr,
        time: timeStr,
        vehicle: tripId.vehicle || defaultData.vehicle,
        cargo: tripId.cargo || '12,500 kg',
        co2: co2Str,
        routeObj: tripId.routeObj || null,
      };
    }
    return defaultData;
  }, [tripId]);

  // Compute all structured stops from route legs or fallback
  const routeStops = useMemo(() => {
    if (tripData.routeObj?.legs && tripData.routeObj.legs.length > 0) {
      const legs = tripData.routeObj.legs;
      const stops = [];

      // Origin
      stops.push({
        id: 'stop-origin',
        type: 'ORIGIN',
        label: 'Start / Depot',
        name: legs[0].from_stop || tripData.origin,
        lat: legs[0].from_lat || 26.1214,
        lng: legs[0].from_lng || 91.7319,
        distanceFromPrev: 0,
        timeFromPrev: 0,
        cargo: tripData.cargo,
        climateHazard: false,
        climateNote: '',
      });

      // Intermediate & final stops
      legs.forEach((leg, idx) => {
        const isFinal = idx === legs.length - 1;
        stops.push({
          id: `stop-${idx + 1}`,
          type: isFinal ? 'DESTINATION' : 'INTERMEDIATE',
          label: isFinal ? 'Final Destination' : `Stop #${idx + 1}`,
          name: leg.to_stop,
          lat: leg.to_lat,
          lng: leg.to_lng,
          distanceFromPrev: leg.distance_km,
          timeFromPrev: leg.time_min,
          cargo: `${Math.round(leg.onboard_weight_kg || 8000)} kg`,
          climateHazard: !!leg.climate_risk_flag,
          climateNote: leg.climate_risk_note || '',
        });
      });

      return stops;
    }

    // Fallback 2-stop sequence
    return [
      {
        id: 'stop-origin',
        type: 'ORIGIN',
        label: 'Start / Depot',
        name: tripData.origin,
        lat: 26.1214,
        lng: 91.7319,
        distanceFromPrev: 0,
        timeFromPrev: 0,
        cargo: tripData.cargo,
        climateHazard: false,
        climateNote: '',
      },
      {
        id: 'stop-dest',
        type: 'DESTINATION',
        label: 'Final Destination',
        name: tripData.destination,
        lat: 26.1852,
        lng: 91.6811,
        distanceFromPrev: 18.5,
        timeFromPrev: 42,
        cargo: tripData.cargo,
        climateHazard: false,
        climateNote: '',
      },
    ];
  }, [tripData]);

  // Waypoints for Voice Navigation
  const voiceNavRoute = useMemo(() => {
    return {
      category: 'green',
      waypoints: routeStops.map((s) => ({
        lat: s.lat,
        lng: s.lng,
        name: s.name,
      })),
    };
  }, [routeStops]);

  // Synchronize state with backend POST /driver/status
  const advanceFlowState = async (nextState) => {
    setFlowState(nextState);
    try {
      await updateDriverStatus({
        active_step: nextState,
        step_index: currentStopIdx,
      });
    } catch (err) {
      console.warn('Backend step transition notice:', err);
    }
  };

  // Fetch driver profile telemetry on mount
  useEffect(() => {
    async function syncProfile() {
      try {
        const [profile, status] = await Promise.all([
          fetchDriverProfile().catch(() => null),
          fetchDriverStatus().catch(() => null),
        ]);

        if (profile?.home_lat && profile?.home_lng) {
          setRegisteredBase({
            city: profile.home_city || 'Guwahati Hub',
            address: profile.home_address || 'Betkuchi Terminal',
            lat: profile.home_lat,
            lng: profile.home_lng,
          });
        }

        if (status?.live_lat && status?.live_lng) {
          setLiveLocation({
            lat: status.live_lat,
            lng: status.live_lng,
            source: 'telemetry',
          });
        }
      } catch (err) {
        console.warn('Driver profile sync notice:', err);
      }
    }
    syncProfile();
  }, []);

  // One-shot ref to prevent re-render resets
  const hasAutoStartedRef = useRef(false);

  // Automatically start voice navigation when driver starts a trip
  useEffect(() => {
    if (tripId?.autoStartNav && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setCurrentStopIdx(0);
      setFlowState('EN_ROUTE');
      setIsVoiceNavOpen(true);
    }
  }, [tripId]);

  const distanceFromBaseKm = useMemo(() => {
    if (!registeredBase?.lat || !liveLocation?.lat) return 0;
    return calculateHaversineDistanceKm(
      liveLocation.lat,
      liveLocation.lng,
      registeredBase.lat,
      registeredBase.lng
    );
  }, [registeredBase, liveLocation]);

  const isBaseMismatched = distanceFromBaseKm > BASE_MISMATCH_THRESHOLD_KM;

  const currentStop = routeStops[currentStopIdx] || routeStops[0];
  const nextTargetStop = routeStops[currentStopIdx + 1] || routeStops[routeStops.length - 1];
  const isFinalStop = currentStopIdx >= routeStops.length - 1;

  // Check return load match
  const checkReturnLoad = async () => {
    const target = routeStops[currentStopIdx + 1] || routeStops[routeStops.length - 1];
    let candidate = null;

    try {
      const driverStatus = await fetchDriverStatus().catch(() => null);
      if (driverStatus?.backhaul_offer) {
        candidate = {
          match_id: driverStatus.backhaul_offer.match_id || 'match-rt-01',
          origin: target?.name || driverStatus.backhaul_offer.origin || tripData.destination,
          destination: tripData.origin || driverStatus.backhaul_offer.destination || 'Betkuchi ISBT Freight Terminal',
          shipment_weight_kg: driverStatus.backhaul_offer.shipment_weight_kg || 400,
          detour_distance_km: driverStatus.backhaul_offer.detour_distance_km || 4.5,
          co2_saved_kg: driverStatus.backhaul_offer.co2_saved_kg || 16.8,
          carrier_b_name: driverStatus.backhaul_offer.carrier_b_name || 'Apex Freight Network',
        };
      }
    } catch (e) {
      console.warn('Driver status backhaul notice:', e);
    }

    if (!candidate) {
      try {
        const res = await findLoadPoolMatches().catch(() => null);
        const matchItem = res?.matches?.[0];
        if (matchItem) {
          candidate = {
            match_id: matchItem.id || matchItem.match_id || 'match-rt-01',
            origin: matchItem.origin_name || target?.name || tripData.destination,
            destination: matchItem.dest_name || tripData.origin || 'Betkuchi ISBT Freight Terminal',
            shipment_weight_kg: matchItem.weight_kg || 400,
            detour_distance_km: matchItem.detour_km || 4.5,
            co2_saved_kg: matchItem.co2_saved_kg || 16.8,
            carrier_b_name: matchItem.carrier_b_name || 'Apex Freight Network',
          };
        }
      } catch (err) {
        console.warn('Load pool matches notice:', err);
      }
    }

    if (!candidate) {
      candidate = {
        match_id: 'match-rt-01',
        origin: target?.name || tripData.destination,
        destination: tripData.origin || 'Betkuchi ISBT Freight Terminal',
        shipment_weight_kg: 400,
        detour_distance_km: 4.5,
        co2_saved_kg: 16.8,
        carrier_b_name: 'Apex Freight Network',
      };
    }

    setReturnCandidate(candidate);
    speakInstruction(`Return load match found at ${candidate.origin}. 400 kilograms cargo available back to ${candidate.destination}.`);
    advanceFlowState('RETURN_LOAD_ALERT');
  };

  const handleAcceptReturn = async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const matchId = returnCandidate?.match_id || 'match-rt-01';
      await acceptDriverReturn({ match_id: matchId }).catch(() => null);
      setReturnAccepted(true);
      notifyImpactUpdated({ type: 'backhaul_accepted', matchId });
      speakInstruction(`Return load accepted. Carrying backhaul goods to ${tripData.origin}.`);
      advanceFlowState('RETURN_LOAD_ACCEPTED');
    } catch (err) {
      console.error('Accept return load notice:', err);
      setReturnAccepted(true);
      speakInstruction(`Return load accepted. Carrying backhaul goods to ${tripData.origin}.`);
      advanceFlowState('RETURN_LOAD_ACCEPTED');
    } finally {
      setIsAccepting(false);
    }
  };

  // 1. TRIP DETAILS VIEW
  const renderDetails = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" /> Active Trip Plan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Optimized Green Freight Route</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono">
          TRIP #DRV-8821
        </span>
      </div>

      {/* Stop list */}
      <div className="space-y-4 relative pl-6 border-l-2 border-slate-800 ml-2">
        {routeStops.map((stop, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === routeStops.length - 1;
          return (
            <div key={stop.id} className="relative">
              <span
                className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-[#121722] shadow-md ${
                  isStart
                    ? 'bg-emerald-500 shadow-emerald-500/50'
                    : isEnd
                    ? 'bg-amber-400 shadow-amber-400/50'
                    : 'bg-cyan-500 shadow-cyan-500/50'
                }`}
              ></span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {stop.label}
                  </span>
                  {stop.climateHazard && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Hazard Zone
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <MapPin
                    className={`w-3.5 h-3.5 ${
                      isStart ? 'text-emerald-400' : isEnd ? 'text-amber-400' : 'text-cyan-400'
                    }`}
                  />
                  {stop.name}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trip Metric Box */}
      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Total Distance</span>
          <span className="font-bold text-slate-100 font-mono">{tripData.distance}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Est. Drive Time</span>
          <span className="font-bold text-amber-300 font-mono">{tripData.time}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Vehicle Unit</span>
          <span className="font-bold text-slate-100">{tripData.vehicle}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Cargo Weight</span>
          <span className="font-bold text-emerald-400 font-mono">{tripData.cargo}</span>
        </div>
      </div>

      <div className="space-y-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setCurrentStopIdx(0);
            advanceFlowState('EN_ROUTE');
            setIsVoiceNavOpen(true);
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
        >
          <Volume2 className="w-4 h-4 text-slate-950 fill-slate-950" />
          Start Trip Navigation with Voice Guidance
        </motion.button>

        <button
          onClick={() => setIsVoiceNavOpen(true)}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-emerald-400" />
          Preview Turn-by-Turn Voice Maneuvers
        </button>
      </div>
    </div>
  );

  // 2. EN ROUTE TO STOP VIEW
  const renderEnRoute = () => {
    const target = routeStops[currentStopIdx + 1] || routeStops[routeStops.length - 1];
    const stopNum = currentStopIdx + 1;
    const totalStops = routeStops.length - 1;

    return (
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center">
        <div className="flex items-center justify-between">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            DRIVING EN ROUTE
          </span>

          <button
            onClick={() => setIsVoiceNavOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" /> Voice Guide
          </button>
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            TARGET STOP {stopNum} OF {totalStops}
          </span>
          <h2 className="text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            {target.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Live GPS Telemetry Active</p>
        </div>

        {target.climateHazard && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Climate Hazard Advisory on Segment</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-snug">
              {target.climateNote || 'Elevated flood risk / monsoon waterlogging advisory. Maintain safe speed.'}
            </p>
          </div>
        )}

        <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Segment Distance</span>
            <span className="font-bold text-slate-100 font-mono">{target.distanceFromPrev || '12.4'} km</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Est. Drive Time</span>
            <span className="font-bold text-amber-300 font-mono">{target.timeFromPrev || '28'} min</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Onboard Payload</span>
            <span className="font-bold text-emerald-400 font-mono">{target.cargo || tripData.cargo}</span>
          </div>
        </div>

        {/* Progress List */}
        <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Route Leg Checklist
          </span>
          {routeStops.slice(1).map((s, idx) => {
            const isDone = idx < currentStopIdx;
            const isCurrent = idx === currentStopIdx;
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between font-bold ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Stop #{idx + 1}: {s.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono shrink-0 ml-2">
                  {isDone ? 'Completed' : isCurrent ? 'Next' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            speakInstruction(`You have arrived at ${target.name}. Stop location verified.`);
            advanceFlowState('AT_STOP');
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          Mark Reached at {target.name}
        </motion.button>
      </div>
    );
  };

  // 3. ARRIVED AT STOP VIEW
  const renderAtStop = () => {
    const target = routeStops[currentStopIdx + 1] || routeStops[routeStops.length - 1];
    const isLastDelivery = currentStopIdx + 1 >= routeStops.length - 1;

    return (
      <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-7 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
            LOCATION VERIFIED
          </span>
          <h2 className="text-2xl font-black text-slate-100">{target.name}</h2>
          <p className="text-xs text-slate-300 mt-1 font-semibold">
            {isLastDelivery ? 'Final Cargo Delivery Reached' : 'Intermediate Stop Cargo Offloaded'}
          </p>
        </div>

        {isBaseMismatched && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Base Station Verification</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Driver base terminal registered as <strong>{registeredBase.city}</strong>. Telemetry is verified.
            </p>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (isLastDelivery) {
              checkReturnLoad();
            } else {
              setCurrentStopIdx((prev) => prev + 1);
              advanceFlowState('EN_ROUTE');
            }
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
        >
          <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
          {isLastDelivery ? 'Confirm Delivery & Check Return Load' : 'Confirm Stop & Proceed to Next Leg'}
        </motion.button>
      </div>
    );
  };

  // 4. RETURN LOAD (BACKHAUL) MATCH OPPORTUNITY
  const renderReturnLoadAlert = () => (
    <div className="bg-[#121722]/90 border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl text-center space-y-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400"></div>

      <div className="flex items-center justify-center gap-2 text-amber-400 text-sm font-extrabold uppercase tracking-wider">
        <Sparkles className="w-5 h-5" />
        <span>Return Load Match Opportunity</span>
      </div>

      <div>
        <h3 className="text-xl font-black text-slate-100">Carry Goods on the Way Back!</h3>
        <p className="text-xs text-slate-400 mt-1">
          EcoLogix matched verified return cargo for your deadhead return road.
        </p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Pickup Location</span>
          <span className="font-bold text-slate-100">{returnCandidate?.origin || tripData.destination}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Return Destination</span>
          <span className="font-bold text-slate-100">{returnCandidate?.destination || tripData.origin}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Cargo Weight</span>
          <span className="font-bold text-emerald-400 font-mono">
            {returnCandidate?.shipment_weight_kg || '400'} kg
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Carrier Partner</span>
          <span className="font-bold text-cyan-400">
            {returnCandidate?.carrier_b_name || 'Apex Freight Network'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800/60">
          <span className="text-slate-400 font-medium">Extra Detour</span>
          <span className="font-bold text-amber-300 font-mono">
            +{returnCandidate?.detour_distance_km || '4.5'} km
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">CO₂ You Avoid</span>
          <span className="font-bold text-emerald-400 font-mono">
            +{returnCandidate?.co2_saved_kg || '16.8'} kg
          </span>
        </div>
      </div>

      {acceptError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{acceptError}</span>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAcceptReturn}
          disabled={isAccepting}
          className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 select-none"
        >
          {isAccepting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              Accepting & Assigning Load...
            </>
          ) : (
            <>
              <Package className="w-4 h-4 text-slate-950" />
              Accept Return Load & Save CO₂
            </>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => advanceFlowState('RETURN_LOAD_SKIPPED')}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 transition-colors cursor-pointer select-none"
        >
          Skip Return Load & Drive Empty
        </motion.button>
      </div>
    </div>
  );

  // 5. RETURN LOAD ACCEPTED CONFIRMATION
  const renderReturnLoadAccepted = () => (
    <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-7 text-center space-y-6 shadow-2xl">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-emerald-400">RETURN LOAD ASSIGNED</h2>
        <p className="text-xs text-slate-300 mt-1 font-semibold">
          Return cargo confirmed! {returnCandidate?.co2_saved_kg || '16.8'} kg CO₂ saved on return road.
        </p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Return Route</span>
          <span className="font-bold text-slate-100">
            {returnCandidate?.origin || tripData.destination} ➔ {returnCandidate?.destination || tripData.origin}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Backhaul Payload</span>
          <span className="font-bold text-emerald-400 font-mono">
            {returnCandidate?.shipment_weight_kg || '400'} kg
          </span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('RETURN_TRIP')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Navigation className="w-4 h-4 text-slate-950" />
        Start Return Trip Navigation
      </motion.button>
    </div>
  );

  // 6. RETURN LOAD SKIPPED VIEW
  const renderReturnLoadSkipped = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-7 text-center space-y-6 shadow-2xl">
      <h2 className="text-xl font-black text-slate-300">Return Load Skipped</h2>
      <p className="text-xs text-slate-400">Returning to home base without pooled cargo.</p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('COMPLETE')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        Finish Trip & View Impact
      </motion.button>
    </div>
  );

  // 7. RETURN TRIP IN PROGRESS
  const renderReturnTrip = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="text-center">
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          RETURN ROAD ACTIVE
        </span>
        <h2 className="text-xl font-black text-slate-100 mt-3 flex items-center justify-center gap-2">
          {returnCandidate?.origin || tripData.destination}{' '}
          <ChevronRight className="w-4 h-4 text-slate-500" />{' '}
          {returnCandidate?.destination || tripData.origin}
        </h2>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Pooled Backhaul Cargo</span>
          <span className="font-bold text-emerald-400 font-mono">
            {returnCandidate?.shipment_weight_kg || '400'} kg
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Partner Carrier</span>
          <span className="font-bold text-cyan-400">
            {returnCandidate?.carrier_b_name || 'Apex Freight Network'}
          </span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('COMPLETE')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Complete Return Trip & Submit Impact
      </motion.button>
    </div>
  );

  // 8. FINAL COMPLETE SUMMARY VIEW
  const renderComplete = () => (
    <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-7 text-center space-y-6 shadow-2xl">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <Award className="w-8 h-8 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-emerald-400">TRIP COMPLETED & VERIFIED</h2>
        <p className="text-xs text-slate-300 font-semibold mt-1">
          {tripData.origin} ➔ {tripData.destination}
        </p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs text-left">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Total Distance Traveled</span>
          <span className="font-bold text-slate-100 font-mono">{tripData.distance}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Total CO₂ Output</span>
          <span className="font-bold text-emerald-400 font-mono">{tripData.co2}</span>
        </div>
      </div>

      <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl text-left space-y-2 text-xs">
        <h4 className="text-emerald-400 font-extrabold flex items-center gap-1.5">
          <Leaf className="w-4 h-4" /> EcoLogix Verified Carbon Savings
        </h4>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Total CO₂ Avoided</span>
          <span className="font-black text-emerald-400 font-mono">
            {returnAccepted ? '31.0 kg' : '14.2 kg'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Return Load Status</span>
          <span className="font-black text-slate-100">
            {returnAccepted ? '✓ Return Load Shared & Audited' : 'Direct Return'}
          </span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          advanceFlowState('DETAILS');
          if (onComplete) onComplete();
        }}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <CheckCircle2 className="w-4 h-4 text-slate-950" />
        Finish & Return to Home
      </motion.button>
    </div>
  );

  return (
    <div className="relative pb-12">
      {flowState === 'DETAILS' && renderDetails()}
      {flowState === 'EN_ROUTE' && renderEnRoute()}
      {flowState === 'AT_STOP' && renderAtStop()}
      {flowState === 'RETURN_LOAD_ALERT' && renderReturnLoadAlert()}
      {flowState === 'RETURN_LOAD_ACCEPTED' && renderReturnLoadAccepted()}
      {flowState === 'RETURN_LOAD_SKIPPED' && renderReturnLoadSkipped()}
      {flowState === 'RETURN_TRIP' && renderReturnTrip()}
      {flowState === 'COMPLETE' && renderComplete()}

      {/* Voice Navigation Modal / Overlay */}
      {isVoiceNavOpen && (
        <VoiceNavigation
          route={voiceNavRoute}
          onExit={() => setIsVoiceNavOpen(false)}
        />
      )}
    </div>
  );
}
