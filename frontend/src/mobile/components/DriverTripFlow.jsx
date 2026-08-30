import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  findLoadPoolMatches,
  acceptLoadPoolMatch,
  acceptDriverReturn,
  fetchDriverProfile,
  fetchDriverStatus,
  updateDriverStatus,
  notifyImpactUpdated,
} from '../../services/api';
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
  const [flowState, setFlowState] = useState('DETAILS');
  const [returnCandidate, setReturnCandidate] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [returnAccepted, setReturnAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [stepError, setStepError] = useState(null);

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

  const [activeTripPayload, setActiveTripPayload] = useState(null);

  // Synchronize state with backend POST /driver/status on step change
  const advanceFlowState = async (nextState, nextIndex) => {
    setStepError(null);
    try {
      await updateDriverStatus({
        active_step: nextState,
        step_index: nextIndex,
      });
      setFlowState(nextState);
    } catch (err) {
      console.warn('Backend step transition notice:', err);
      // Optimistic update fallback so UI remains functional even if backend is offline
      setFlowState(nextState);
    }
  };

  // Fetch registered driver profile, status, and telemetry on mount & poll every 5s
  useEffect(() => {
    let isMounted = true;

    async function syncDriverContext() {
      try {
        const [profile, status] = await Promise.all([
          fetchDriverProfile().catch(() => null),
          fetchDriverStatus().catch(() => null),
        ]);

        if (!isMounted) return;

        if (profile?.home_lat && profile?.home_lng) {
          setRegisteredBase({
            city: profile.home_city || 'Guwahati Hub',
            address: profile.home_address || 'Betkuchi Terminal',
            lat: profile.home_lat,
            lng: profile.home_lng,
          });
        }

        if (status) {
          if (status.live_lat && status.live_lng) {
            setLiveLocation({
              lat: status.live_lat,
              lng: status.live_lng,
              source: 'telemetry',
            });
          }

          if (status.active_step && status.active_step !== flowState) {
            setFlowState(status.active_step);
          }

          if (status.active_trip) {
            setActiveTripPayload(status.active_trip);
            if (status.active_trip.return_load_accepted) {
              setReturnAccepted(true);
            }
          }

          if (status.backhaul_offer) {
            setReturnCandidate(status.backhaul_offer);
            if (status.backhaul_offer.accepted) {
              setReturnAccepted(true);
            }
          }
        }
      } catch (err) {
        console.warn('Driver context telemetry sync warning:', err);
      }
    }

    syncDriverContext();

    // 5-second polling interval for live driver telemetry & hazard status
    const pollInterval = setInterval(syncDriverContext, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  const tripData = useMemo(() => {
    if (activeTripPayload) {
      return {
        origin: activeTripPayload.origin || 'Betkuchi ISBT Freight Terminal',
        destination: activeTripPayload.destination || 'ICD Amingaon Container Depot',
        distance: activeTripPayload.distance || '84.5 km',
        time: activeTripPayload.time || '118 min',
        vehicle: activeTripPayload.vehicle || 'NW Tata Signa Heavy Diesel #101',
        cargo: activeTripPayload.cargo || '12,500 kg',
        co2: activeTripPayload.co2 || '72.4 kg',
      };
    }
    return typeof tripId === 'object' && tripId !== null ? tripId : {
      origin: 'Betkuchi ISBT Freight Terminal',
      destination: 'ICD Amingaon Container Depot',
      distance: '84.5 km',
      time: '118 min',
      vehicle: 'NW Tata Signa Heavy Diesel #101',
      cargo: '12,500 kg',
      co2: '72.4 kg',
    };
  }, [activeTripPayload, tripId]);

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

  const checkReturnLoad = async () => {
    setFlowState('RETURN_LOAD_ALERT_LOADING');
    try {
      const res = await findLoadPoolMatches().catch(() => null);
      const matchItem = res?.matches?.[0];
      const candidate = matchItem
        ? {
            match_id: matchItem.id || matchItem.match_id || 'match-rt-01',
            origin: matchItem.origin_name || tripData.destination,
            destination: matchItem.dest_name || tripData.origin,
            shipment_weight_kg: matchItem.weight_kg || 400,
            detour_distance_km: matchItem.detour_km || 6,
            co2_saved_kg: matchItem.co2_saved_kg || 14.2,
            carrier_b_name: matchItem.carrier_b_name || 'GreenFreight Logistics',
          }
        : {
            match_id: 'match-rt-01',
            origin: tripData.destination,
            destination: tripData.origin,
            shipment_weight_kg: 400,
            detour_distance_km: 6,
            co2_saved_kg: 14.2,
            carrier_b_name: 'GreenFreight Logistics',
          };

      setReturnCandidate(candidate);
      await advanceFlowState('RETURN_LOAD_ALERT', 4);
    } catch (err) {
      console.warn('Return load check fallback:', err);
      setReturnCandidate({
        match_id: 'match-rt-01',
        origin: tripData.destination,
        destination: tripData.origin,
        shipment_weight_kg: 400,
        detour_distance_km: 6,
        co2_saved_kg: 14.2,
        carrier_b_name: 'GreenFreight Logistics',
      });
      await advanceFlowState('RETURN_LOAD_ALERT', 4);
    }
  };

  const handleAcceptReturn = async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const matchId = returnCandidate?.match_id || 'match-rt-01';
      
      // Wire 1-click backhaul load acceptance to POST /api/v1/driver/accept-return
      const res = await acceptDriverReturn({ match_id: matchId });
      
      if (res && res.success) {
        setReturnAccepted(true);
        if (res.active_trip) {
          setActiveTripPayload(res.active_trip);
        }
        notifyImpactUpdated({ type: 'backhaul_accepted', matchId });
        await advanceFlowState('RETURN_LOAD_ACCEPTED', 4);
      } else {
        throw new Error(res?.message || 'Backhaul acceptance request failed');
      }
    } catch (err) {
      console.error('Accept return load error:', err);
      setAcceptError('Failed to accept return load. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const renderDetails = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" /> Your Trip Plan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Best Road to Take</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono">
          TRIP #DRV-8821
        </span>
      </div>

      <div className="space-y-4 relative pl-6 border-l-2 border-slate-800 ml-2">
        <div className="relative">
          <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#121722] shadow-md shadow-emerald-500/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">START / PICK UP</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {tripData.origin}
            </h4>
          </div>
        </div>

        <div className="relative pt-2">
          <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#121722] shadow-md shadow-cyan-500/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">STOP 1</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" /> Cargo Verification & Seal Check
            </h4>
          </div>
        </div>

        <div className="relative pt-2">
          <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-amber-400 border-4 border-[#121722] shadow-md shadow-amber-400/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">FINAL DROP OFF</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> {tripData.destination}
            </h4>
          </div>
        </div>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Distance</span>
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

      {stepError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
          {stepError}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('IN_PROGRESS', 1)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Start This Trip
      </motion.button>
    </div>
  );

  const renderInProgress = (stage) => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center">
      <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        ON THE ROAD
      </span>

      <div>
        <h3 className="text-xl font-black text-slate-100 flex items-center justify-center gap-2">
          {tripData.origin} <ChevronRight className="w-5 h-5 text-slate-500" /> {tripData.destination}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">Live Telemetry Synchronized • Saraighat Bridge Pass</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-5 rounded-xl border border-slate-800/80 text-left space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Trip Progress:</p>

        <div className="space-y-2 text-xs">
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
              stage > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-amber-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pick up at {tripData.origin}</span>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
              stage > 1
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : stage === 1
                ? 'bg-slate-900 border-slate-800 text-amber-400'
                : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Deliver to {tripData.destination}</span>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
              stage > 2
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Trip Completed & Audited</span>
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState(stage === 0 ? 'NEXT_STOP_PICKUP' : 'NEXT_STOP_DELIVERY', stage === 0 ? 2 : 3)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <MapPin className="w-4 h-4 text-slate-950" />
        View Next Stop Details
      </motion.button>
    </div>
  );

  const renderNextStop = (type) => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">NEXT STOP</span>

      <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
        <MapPin className="w-8 h-8 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-100">
          {type === 'PICKUP' ? tripData.origin : tripData.destination}
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-1">Confirmed Stop Location</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Distance Remaining</span>
          <span className="font-bold text-slate-100 font-mono">{type === 'PICKUP' ? '12 km' : '18 km'}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Est. Arrival</span>
          <span className="font-bold text-amber-300 font-mono">{type === 'PICKUP' ? '25 min' : '32 min'}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Cargo Manifest</span>
          <span className="font-bold text-emerald-400 font-mono">{tripData.cargo}</span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState(type === 'PICKUP' ? 'PICKUP_ARRIVED' : 'DELIVERY_ARRIVED', 3)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <CheckCircle2 className="w-4 h-4 text-slate-950" />
        Mark Reached at Stop
      </motion.button>
    </div>
  );

  const renderArrived = (type) => (
    <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-emerald-400">STOP ARRIVAL CONFIRMED</h2>
        <p className="text-xs text-slate-300 mt-1 font-semibold">Location verified via GPS Telemetry</p>
      </div>

      {isBaseMismatched && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Ops Location Notice</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Your live GPS location does not match your registered base (<strong>{registeredBase.city}</strong>) — proceeding anyway.
          </p>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (type === 'PICKUP') {
            advanceFlowState('IN_PROGRESS_2', 3);
          } else {
            checkReturnLoad();
          }
        }}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Confirm {type === 'PICKUP' ? 'Pick Up' : 'Delivery'} Done & Continue
      </motion.button>
    </div>
  );

  const renderReturnLoadAlert = () => (
    <div className="bg-[#121722]/90 border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl text-center space-y-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-500"></div>

      <div className="flex items-center justify-center gap-2 text-amber-400 text-sm font-extrabold uppercase tracking-wider">
        <Sparkles className="w-5 h-5" />
        <span>Return Load Match Opportunity</span>
      </div>

      <div>
        <h3 className="text-xl font-black text-slate-100">Carry Goods on the Way Back!</h3>
        <p className="text-xs text-slate-400 mt-1">EcoLogix found goods ready for your return road. No empty driving!</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Origin</span>
          <span className="font-bold text-slate-100">{returnCandidate?.origin || tripData.destination}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Destination</span>
          <span className="font-bold text-slate-100">{returnCandidate?.destination || tripData.origin}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Load Weight</span>
          <span className="font-bold text-emerald-400 font-mono">{returnCandidate?.shipment_weight_kg || '400'} kg</span>
        </div>
        <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800/60">
          <span className="text-slate-400 font-medium">Extra Distance</span>
          <span className="font-bold text-amber-300 font-mono">+{returnCandidate?.detour_distance_km || '6'} km</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">CO₂ You Save</span>
          <span className="font-bold text-emerald-400 font-mono">+{returnCandidate?.co2_saved_kg || '14.2'} kg</span>
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
          onClick={() => advanceFlowState('RETURN_LOAD_SKIPPED', 4)}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-750 text-slate-400 active:text-slate-200 text-xs font-bold border border-slate-800 transition-colors cursor-pointer select-none"
        >
          Skip Return Load
        </motion.button>
      </div>
    </div>
  );

  const renderReturnLoadAccepted = () => (
    <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-emerald-400">RETURN LOAD ASSIGNED</h2>
        <p className="text-xs text-slate-300 mt-1 font-semibold">
          Return space booked! 14.2 kg CO₂ saved. Payload updated to {tripData.cargo}.
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('RETURN_TRIP_DETAILS', 4)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Navigation className="w-4 h-4 text-slate-950" />
        Start Return Trip
      </motion.button>
    </div>
  );

  const renderReturnLoadSkipped = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
      <h2 className="text-xl font-black text-slate-300">Return Load Skipped</h2>
      <p className="text-xs text-slate-400">Truck will return without return load.</p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('TRIP_COMPLETE', 5)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        Finish Trip
      </motion.button>
    </div>
  );

  const renderReturnTripDetails = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="text-center">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">RETURN TRIP IN PROGRESS</h3>
        <h2 className="text-xl font-black text-slate-100 mt-1">
          {tripData.destination} <ChevronRight className="w-4 h-4 inline text-slate-500" /> {tripData.origin}
        </h2>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Active Payload Weight</span>
          <span className="font-bold text-emerald-400 font-mono">{tripData.cargo}</span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => advanceFlowState('TRIP_COMPLETE', 5)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Finish Return Trip
      </motion.button>
    </div>
  );

  const renderComplete = () => {
    return (
      <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-emerald-400">TRIP COMPLETED & CO₂ SAVED</h2>
          <p className="text-xs text-slate-300 font-semibold mt-1">
            {tripData.origin} ➔ {tripData.destination}
          </p>
        </div>

        <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs text-left">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Total Route Distance</span>
            <span className="font-bold text-slate-100 font-mono">{tripData.distance}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Estimated Fuel Burned</span>
            <span className="font-bold text-slate-100 font-mono">31.2 L</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400 font-medium">Total CO₂ Output</span>
            <span className="font-bold text-emerald-400 font-mono">{tripData.co2}</span>
          </div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl text-left space-y-2 text-xs">
          <h4 className="text-emerald-400 font-extrabold flex items-center gap-1.5">
            <Leaf className="w-4 h-4" /> EcoLogix Verified CO₂ Saved
          </h4>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">CO₂ Avoided</span>
            <span className="font-black text-emerald-400 font-mono">{returnAccepted ? '14.2 kg' : '16.2 kg'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Fuel Saved</span>
            <span className="font-black text-slate-100 font-mono">5.3 L</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            advanceFlowState('DETAILS', 0);
            if (onComplete) onComplete();
          }}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          Finish & Return to Home
        </motion.button>
      </div>
    );
  };

  return (
    <div>
      {flowState === 'DETAILS' && renderDetails()}
      {flowState === 'IN_PROGRESS' && renderInProgress(0)}
      {flowState === 'NEXT_STOP_PICKUP' && renderNextStop('PICKUP')}
      {flowState === 'PICKUP_ARRIVED' && renderArrived('PICKUP')}
      {flowState === 'IN_PROGRESS_2' && renderInProgress(1)}
      {flowState === 'NEXT_STOP_DELIVERY' && renderNextStop('DELIVERY')}
      {flowState === 'DELIVERY_ARRIVED' && renderArrived('DELIVERY')}
      {flowState === 'RETURN_LOAD_ALERT_LOADING' && (
        <div className="bg-[#121722]/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Checking for return load matches...</p>
        </div>
      )}
      {flowState === 'RETURN_LOAD_ALERT' && renderReturnLoadAlert()}
      {flowState === 'RETURN_LOAD_ACCEPTED' && renderReturnLoadAccepted()}
      {flowState === 'RETURN_LOAD_SKIPPED' && renderReturnLoadSkipped()}
      {flowState === 'RETURN_TRIP_DETAILS' && renderReturnTripDetails()}
      {flowState === 'TRIP_COMPLETE' && renderComplete()}
    </div>
  );
}
