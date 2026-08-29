import React, { useState, useEffect } from 'react';
import { findLoadPoolMatches, acceptLoadPoolMatch } from '../../services/api';

export default function DriverTripFlow({ tripId, onComplete }) {
  // State machine: DETAILS -> IN_PROGRESS -> NEXT_STOP_PICKUP -> PICKUP_ARRIVED 
  // -> IN_PROGRESS_2 -> NEXT_STOP_DELIVERY -> DELIVERY_ARRIVED 
  // -> RETURN_LOAD_ALERT -> (if match ACCEPTING) -> RETURN_TRIP -> TRIP_COMPLETE
  const [flowState, setFlowState] = useState('DETAILS');
  const [returnCandidate, setReturnCandidate] = useState(null);
  const [returnMatchData, setReturnMatchData] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [returnAccepted, setReturnAccepted] = useState(false);

  // Mock initial trip data passed down
  const tripData = tripId || {
    origin: 'Shillong',
    destination: 'Guwahati',
    distance: '102 km',
    time: '2h 45m',
    vehicle: 'Truck 01',
    cargo: '2,500 kg',
    co2: '82.4 kg'
  };

  const checkReturnLoad = async () => {
    try {
      setFlowState('RETURN_LOAD_ALERT_LOADING');
      // Vehicle 2 for MHCV
      const res = await findLoadPoolMatches(2);
      setReturnMatchData(res);
      const candidate = res?.matches?.find((m) => m.status === 'CANDIDATE' || m.status === 'PROPOSED') || res?.matches?.[0];
      
      if (candidate && candidate.is_eligible) {
        setReturnCandidate(candidate);
        setFlowState('RETURN_LOAD_ALERT');
      } else {
        // No match found, skip to complete
        setFlowState('TRIP_COMPLETE');
      }
    } catch (err) {
      console.warn('Return load check failed:', err);
      // Skip on error to avoid blocking the driver
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
      // Even if it fails, move on
      setFlowState('TRIP_COMPLETE');
    } finally {
      setIsAccepting(false);
    }
  };

  const renderDetails = () => (
    <div className="mobile-card">
      <h3 className="mobile-card-title text-center" style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
        TRIP DETAILS
      </h3>
      
      <div className="progress-list" style={{ marginLeft: '1rem', borderLeft: '2px solid #475569', paddingLeft: '1.5rem' }}>
        <div className="progress-item" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>📍</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>FROM</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{tripData.origin}</div>
          </div>
        </div>
        <div className="progress-item" style={{ position: 'relative', marginTop: '1.5rem' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>📦</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>STOP 1</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>Pickup</div>
          </div>
        </div>
        <div className="progress-item" style={{ position: 'relative', marginTop: '1.5rem' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>🏁</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>STOP 2</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>Delivery</div>
          </div>
        </div>
        <div className="progress-item" style={{ position: 'relative', marginTop: '1.5rem' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>📍</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>TO</div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>{tripData.destination}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #475569' }}>
        <div className="mobile-data-row">
          <span className="label">Distance</span>
          <span className="value">{tripData.distance}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Estimated time</span>
          <span className="value">{tripData.time}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Vehicle</span>
          <span className="value">{tripData.vehicle}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Cargo</span>
          <span className="value">{tripData.cargo}</span>
        </div>
      </div>

      <button className="mobile-btn mobile-btn-primary" onClick={() => setFlowState('IN_PROGRESS')}>
        [ START TRIP ]
      </button>
    </div>
  );

  const renderInProgress = (stage) => (
    <div className="mobile-card text-center" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <span className="badge-pill badge-green" style={{ display: 'inline-block', marginBottom: '1rem' }}>
        TRIP IN PROGRESS
      </span>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        {tripData.origin} <span style={{ color: '#64748b' }}>➔</span> {tripData.destination}
      </h3>

      <div style={{ textAlign: 'left', background: '#0f172a', padding: '1.5rem', borderRadius: '12px' }}>
        <p className="mobile-p" style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 'bold' }}>Progress:</p>
        
        <div className={`progress-item ${stage > 0 ? 'done' : 'active'}`}>
          <span className="progress-icon">{stage > 0 ? '✓' : '●'}</span>
          Pickup
        </div>
        <div className={`progress-item ${stage > 1 ? 'done' : (stage === 1 ? 'active' : '')}`}>
          <span className="progress-icon">{stage > 1 ? '✓' : (stage === 1 ? '●' : '○')}</span>
          Delivery
        </div>
        <div className={`progress-item ${stage > 2 ? 'done' : (stage === 2 ? 'active' : '')}`}>
          <span className="progress-icon">{stage > 2 ? '✓' : (stage === 2 ? '●' : '○')}</span>
          Complete
        </div>
      </div>

      <button 
        className="mobile-btn mobile-btn-primary" 
        style={{ marginTop: '2rem' }}
        onClick={() => setFlowState(stage === 0 ? 'NEXT_STOP_PICKUP' : 'NEXT_STOP_DELIVERY')}
      >
        [ VIEW NEXT STOP ]
      </button>
    </div>
  );

  const renderNextStop = (type) => (
    <div className="mobile-card text-center" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h3 className="mobile-card-title text-center" style={{ marginBottom: '1.5rem', fontSize: '1.3rem', color: '#94a3b8' }}>
        NEXT STOP
      </h3>
      
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
      <h2 style={{ fontSize: '1.8rem', color: '#f8fafc', marginBottom: '2rem' }}>
        {type === 'PICKUP' ? `${tripData.origin} Hub` : `${tripData.destination} Depot`}
      </h2>

      <div style={{ textAlign: 'left', background: '#0f172a', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div className="mobile-data-row">
          <span className="label">Distance</span>
          <span className="value">{type === 'PICKUP' ? '12 km' : '90 km'}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Estimated time</span>
          <span className="value">{type === 'PICKUP' ? '25 min' : '2h 20m'}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Cargo</span>
          <span className="value">{tripData.cargo}</span>
        </div>
      </div>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={() => setFlowState(type === 'PICKUP' ? 'PICKUP_ARRIVED' : 'DELIVERY_ARRIVED')}
      >
        [ MARK ARRIVED ]
      </button>
    </div>
  );

  const renderArrived = (type) => (
    <div className="mobile-card text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '2rem' }}>
        ARRIVED
      </h2>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={() => {
          if (type === 'PICKUP') {
            setFlowState('IN_PROGRESS_2');
          } else {
            // After delivery complete, check for return load
            checkReturnLoad();
          }
        }}
      >
        [ MARK {type} COMPLETE ]
      </button>
    </div>
  );

  const renderReturnLoadAlert = () => (
    <div className="mobile-card text-center" style={{ paddingTop: '2rem', paddingBottom: '2rem', border: '2px solid #fbbf24' }}>
      <h3 style={{ color: '#fbbf24', fontSize: '1.5rem', marginBottom: '1rem' }}>
        📦 RETURN LOAD AVAILABLE
      </h3>
      <p style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        "Your vehicle may return empty."
      </p>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        EcoLogix found a shipment that fits your return journey.
      </p>

      <div style={{ textAlign: 'left', background: '#0f172a', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div className="mobile-data-row">
          <span className="label">FROM</span>
          <span className="value">{returnMatchData?.return_route?.origin || tripData.destination}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">TO</span>
          <span className="value">{returnMatchData?.return_route?.destination || tripData.origin}</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">WEIGHT</span>
          <span className="value">{returnCandidate?.shipment_weight_kg || '400'} kg</span>
        </div>
        <div className="mobile-data-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <span className="label">EXTRA DISTANCE</span>
          <span className="value text-yellow">+{returnCandidate?.detour_distance_km || '6'} km</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">POTENTIAL CO₂ SAVED</span>
          <span className="value text-green">{returnCandidate?.co2_saved_kg || '8.4'} kg</span>
        </div>
      </div>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={handleAcceptReturn}
        disabled={isAccepting}
      >
        {isAccepting ? 'ADDING RETURN LOAD...' : '[ ACCEPT LOAD ]'}
      </button>
      <button 
        className="mobile-btn mobile-btn-secondary"
        onClick={() => setFlowState('RETURN_LOAD_SKIPPED')}
        style={{ marginTop: '1rem' }}
      >
        [ SKIP ]
      </button>
    </div>
  );

  const renderReturnLoadAccepted = () => (
    <div className="mobile-card text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem', border: '2px solid #10b981' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '1rem' }}>
        RETURN LOAD ADDED
      </h2>
      <p style={{ color: '#cbd5e1', fontSize: '1.1rem', marginBottom: '2rem' }}>
        "Your return journey now has a shipment."
      </p>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={() => setFlowState('RETURN_TRIP_DETAILS')}
      >
        [ VIEW RETURN TRIP ]
      </button>
    </div>
  );

  const renderReturnLoadSkipped = () => (
    <div className="mobile-card text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <h2 style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '1rem' }}>
        RETURN LOAD SKIPPED
      </h2>
      <p style={{ color: '#cbd5e1', fontSize: '1.1rem', marginBottom: '2rem' }}>
        Your vehicle will return empty.
      </p>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={() => setFlowState('TRIP_COMPLETE')}
      >
        [ CONTINUE TRIP ]
      </button>
    </div>
  );

  const renderReturnTripDetails = () => (
    <div className="mobile-card">
      <h3 className="mobile-card-title text-center" style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
        RETURN TRIP
      </h3>
      <h2 style={{ fontSize: '1.5rem', color: '#f8fafc', textAlign: 'center', marginBottom: '2rem' }}>
        {tripData.destination} <span style={{ color: '#64748b' }}>➔</span> {tripData.origin}
      </h2>

      <div style={{ textAlign: 'left', background: '#0f172a', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📦 Return shipment</div>
        <div className="mobile-data-row">
          <span className="label">Weight</span>
          <span className="value">{returnCandidate?.shipment_weight_kg || '400'} kg</span>
        </div>
      </div>
      
      <div className="progress-list" style={{ marginLeft: '1rem', borderLeft: '2px solid #475569', paddingLeft: '1.5rem' }}>
        <div className="progress-item" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>●</span>
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>Pickup</div>
          </div>
        </div>
        <div className="progress-item" style={{ position: 'relative', marginTop: '1.5rem' }}>
          <span style={{ position: 'absolute', left: '-2.15rem', top: '-2px', fontSize: '1.5rem' }}>○</span>
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 'bold' }}>Delivery</div>
          </div>
        </div>
      </div>

      <button 
        className="mobile-btn mobile-btn-primary"
        onClick={() => setFlowState('TRIP_COMPLETE')}
      >
        [ START RETURN TRIP ]
      </button>
    </div>
  );

  const renderComplete = () => {
    const finalCO2 = returnAccepted 
      ? (parseFloat(tripData.co2) + parseFloat(returnCandidate?.co2_saved_kg || 8.4)).toFixed(1)
      : tripData.co2;

    return (
      <div className="mobile-card text-center" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }}>
          TRIP COMPLETE
        </h2>
        <h3 style={{ fontSize: '1.2rem', color: '#cbd5e1', marginBottom: '2rem' }}>
          {tripData.origin} <span style={{ color: '#64748b' }}>➔</span> {tripData.destination}
        </h3>

        <div style={{ textAlign: 'left', background: '#0f172a', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <div className="mobile-data-row">
            <span className="label">Total Distance</span>
            <span className="value">{tripData.distance}</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">Estimated Fuel</span>
            <span className="value">31.2 L</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">Estimated CO₂</span>
            <span className="value">{tripData.co2}</span>
          </div>
        </div>

        <div style={{ textAlign: 'left', background: '#1e293b', border: '1px solid #10b981', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h4 style={{ color: '#10b981', marginBottom: '1rem', fontSize: '1.1rem' }}>🌱 ECOLOGIX IMPACT</h4>
          <div className="mobile-data-row">
            <span className="label">CO₂ saved</span>
            <span className="value text-green">14.2 kg</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">Fuel saved</span>
            <span className="value">3.4 L</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">Empty distance reduced</span>
            <span className="value">{returnAccepted ? (returnCandidate?.detour_distance_km || '102') : '0'} km</span>
          </div>
        </div>

        <button 
          className="mobile-btn mobile-btn-primary block-btn"
          onClick={onComplete}
        >
          [ DONE ]
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
        <div className="mobile-card text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          <p>Checking for return shipments...</p>
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
