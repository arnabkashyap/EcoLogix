import React, { useState } from 'react';
import { findLoadPoolMatches, acceptLoadPoolMatch } from '../../services/api';
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
} from 'lucide-react';

export default function DriverTripFlow({ tripId, onComplete }) {
  const [flowState, setFlowState] = useState('DETAILS');
  const [returnCandidate, setReturnCandidate] = useState(null);
  const [returnMatchData, setReturnMatchData] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [returnAccepted, setReturnAccepted] = useState(false);

  const tripData = tripId || {
    origin: 'Shillong',
    destination: 'Guwahati',
    distance: '102 km',
    time: '2h 45m',
    vehicle: 'NW Heavy Freightliner #101',
    cargo: '2,500 kg',
    co2: '82.4 kg'
  };

  const checkReturnLoad = async () => {
    try {
      setFlowState('RETURN_LOAD_ALERT_LOADING');
      const res = await findLoadPoolMatches(2);
      setReturnMatchData(res);
      const candidate = res?.matches?.find((m) => m.status === 'CANDIDATE' || m.status === 'PROPOSED') || res?.matches?.[0];
      
      if (candidate && candidate.is_eligible) {
        setReturnCandidate(candidate);
        setFlowState('RETURN_LOAD_ALERT');
      } else {
        setFlowState('TRIP_COMPLETE');
      }
    } catch (err) {
      console.warn('Return load check failed:', err);
      setFlowState('TRIP_COMPLETE');
    }
  };

  const handleAcceptReturn = async () => {
    if (!returnCandidate) return;
    setIsAccepting(true);
    try {
      await acceptLoadPoolMatch(returnCandidate.match_id);
      setReturnAccepted(true);
      setFlowState('RETURN_LOAD_ACCEPTED');
    } catch (err) {
      console.error('Accept return load failed:', err);
      setFlowState('TRIP_COMPLETE');
    } finally {
      setIsAccepting(false);
    }
  };

  const renderDetails = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" /> Active Trip Itinerary & Manifest
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Optimized Multi-Stop Route Plan</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono">
          TRIP #DRV-8821
        </span>
      </div>

      {/* Progress Timeline Nodes */}
      <div className="space-y-4 relative pl-6 border-l-2 border-slate-800 ml-2">
        <div className="relative group">
          <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#121722] shadow-md shadow-emerald-500/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ORIGIN PICKUP</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {tripData.origin} Logistics Hub
            </h4>
          </div>
        </div>

        <div className="relative group pt-2">
          <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#121722] shadow-md shadow-cyan-500/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">WAYPOINT / STOP 1</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" /> Cargo Verification & Seal Check
            </h4>
          </div>
        </div>

        <div className="relative group pt-2">
          <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-amber-400 border-4 border-[#121722] shadow-md shadow-amber-400/50"></span>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">FINAL DESTINATION</span>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> {tripData.destination} Commerce Depot
            </h4>
          </div>
        </div>
      </div>

      {/* Manifest Summary */}
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

      <button
        onClick={() => setFlowState('IN_PROGRESS')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Begin Active Route Execution
      </button>
    </div>
  );

  const renderInProgress = (stage) => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center">
      <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        ROUTE EXECUTION IN PROGRESS
      </span>

      <div>
        <h3 className="text-xl font-black text-slate-100 flex items-center justify-center gap-2">
          {tripData.origin} <ChevronRight className="w-5 h-5 text-slate-500" /> {tripData.destination}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">Live Telemetry Connected • GPS Active</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-5 rounded-xl border border-slate-800/80 text-left space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Milestone Progress:</p>

        <div className="space-y-2 text-xs">
          <div className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
            stage > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-amber-400'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pickup at {tripData.origin} Hub</span>
          </div>

          <div className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
            stage > 1
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : (stage === 1 ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-900/40 border-slate-800/40 text-slate-500')
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Delivery at {tripData.destination} Depot</span>
          </div>

          <div className={`p-3 rounded-lg border flex items-center gap-2.5 font-bold transition-all ${
            stage > 2
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Trip Audit & Final Completion</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setFlowState(stage === 0 ? 'NEXT_STOP_PICKUP' : 'NEXT_STOP_DELIVERY')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <MapPin className="w-4 h-4 text-slate-950" />
        View Next Waypoint Details
      </button>
    </div>
  );

  const renderNextStop = (type) => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">UPCOMING WAYPOINT</span>
      
      <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
        <MapPin className="w-8 h-8 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-100">
          {type === 'PICKUP' ? `${tripData.origin} Logistics Hub` : `${tripData.destination} Commerce Depot`}
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-1">Confirmed Waypoint Location</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Distance Remaining</span>
          <span className="font-bold text-slate-100 font-mono">{type === 'PICKUP' ? '12 km' : '90 km'}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Est. Arrival</span>
          <span className="font-bold text-amber-300 font-mono">{type === 'PICKUP' ? '25 min' : '2h 20m'}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Cargo Manifest</span>
          <span className="font-bold text-emerald-400 font-mono">{tripData.cargo}</span>
        </div>
      </div>

      <button
        onClick={() => setFlowState(type === 'PICKUP' ? 'PICKUP_ARRIVED' : 'DELIVERY_ARRIVED')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4 text-slate-950" />
        Mark Arrival at Waypoint
      </button>
    </div>
  );

  const renderArrived = (type) => (
    <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-emerald-400">WAYPOINT ARRIVAL CONFIRMED</h2>
        <p className="text-xs text-slate-300 mt-1 font-semibold">Location verified via GPS Telemetry</p>
      </div>

      <button
        onClick={() => {
          if (type === 'PICKUP') {
            setFlowState('IN_PROGRESS_2');
          } else {
            checkReturnLoad();
          }
        }}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Confirm {type} Complete & Continue
      </button>
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
        <h3 className="text-xl font-black text-slate-100">Avoid Empty Return Journey!</h3>
        <p className="text-xs text-slate-400 mt-1">EcoLogix matched a verified return shipment along your backhaul route.</p>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Origin</span>
          <span className="font-bold text-slate-100">{returnMatchData?.return_route?.origin || tripData.destination}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Destination</span>
          <span className="font-bold text-slate-100">{returnMatchData?.return_route?.destination || tripData.origin}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Load Weight</span>
          <span className="font-bold text-emerald-400 font-mono">{returnCandidate?.shipment_weight_kg || '400'} kg</span>
        </div>
        <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800/60">
          <span className="text-slate-400 font-medium">Detour Distance</span>
          <span className="font-bold text-amber-300 font-mono">+{returnCandidate?.detour_distance_km || '6'} km</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Potential CO₂ Saved</span>
          <span className="font-bold text-emerald-400 font-mono">+{returnCandidate?.co2_saved_kg || '14.2'} kg</span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          onClick={handleAcceptReturn}
          disabled={isAccepting}
          className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
        </button>
        <button
          onClick={() => setFlowState('RETURN_LOAD_SKIPPED')}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
        >
          Skip Return Load
        </button>
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
        <p className="text-xs text-slate-300 mt-1 font-semibold">Backhaul capacity optimized! 14.2 kg CO₂ saved.</p>
      </div>

      <button
        onClick={() => setFlowState('RETURN_TRIP_DETAILS')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Navigation className="w-4 h-4 text-slate-950" />
        View Return Trip Execution
      </button>
    </div>
  );

  const renderReturnLoadSkipped = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
      <h2 className="text-xl font-black text-slate-300">Return Load Skipped</h2>
      <p className="text-xs text-slate-400">Vehicle will proceed empty on return journey.</p>

      <button
        onClick={() => setFlowState('TRIP_COMPLETE')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        Continue & Finalize Trip
      </button>
    </div>
  );

  const renderReturnTripDetails = () => (
    <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="text-center">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">RETURN BACKHAUL TRIP</h3>
        <h2 className="text-xl font-black text-slate-100 mt-1">
          {tripData.destination} <ChevronRight className="w-4 h-4 inline text-slate-500" /> {tripData.origin}
        </h2>
      </div>

      <div className="bg-[#0B0E14]/80 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400 font-medium">Return Shipment Weight</span>
          <span className="font-bold text-emerald-400 font-mono">{returnCandidate?.shipment_weight_kg || '400'} kg</span>
        </div>
      </div>

      <button
        onClick={() => setFlowState('TRIP_COMPLETE')}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
        Complete Return Backhaul
      </button>
    </div>
  );

  const renderComplete = () => {
    return (
      <div className="bg-[#121722]/90 border-2 border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-emerald-400">TRIP COMPLETED & SAVINGS AUDITED</h2>
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
            <Leaf className="w-4 h-4" /> EcoLogix Certified Carbon Impact
          </h4>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">CO₂ Avoided</span>
            <span className="font-black text-emerald-400 font-mono">14.2 kg</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Fuel Saved</span>
            <span className="font-black text-slate-100 font-mono">3.4 L</span>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          Finish & Return to Dashboard
        </button>
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
