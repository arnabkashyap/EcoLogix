import React, { useEffect, useState } from 'react';
import { fetchParetoRoutes } from '../../services/api';

export default function MobileHome({ onStartTrip }) {
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadTodayTrip() {
      try {
        // Fetch a mock "planned" trip for the driver using the backend
        // We use shipment IDs 1 and 2 and vehicle 2 (MHCV)
        const res = await fetchParetoRoutes({
          vehicle_id: 2,
          shipment_ids: [1, 2]
        });
        
        // Pick the recommended (BALANCED) route
        const activeRoute = res.routes.find((r) => r.route_type === 'BALANCED') || res.routes[0];
        
        setTripData({
          origin: res.baseline.origin || 'Shillong',
          destination: res.baseline.destination || 'Guwahati',
          distance: activeRoute.total_distance_km,
          time: `${activeRoute.total_time_min} min`,
          co2: activeRoute.total_co2_kg,
          vehicle: 'Truck 01',
          routeObj: activeRoute
        });
      } catch (err) {
        console.warn('Driver app fetch error', err);
        setErrorMsg('Connection lost.');
      } finally {
        setLoading(false);
      }
    }
    loadTodayTrip();
  }, []);

  return (
    <div>
      <h2 className="mobile-h2">Good morning 👋</h2>

      <p className="mobile-p" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600, color: '#94a3b8' }}>
        TODAY'S TRIP
      </p>

      {loading && (
        <div className="mobile-card text-center">
          <p>Loading today's trip...</p>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="mobile-card text-center">
          <p className="text-red">⚠️ {errorMsg}</p>
          <button className="mobile-btn mobile-btn-secondary" onClick={() => window.location.reload()}>
            [ TRY AGAIN ]
          </button>
        </div>
      )}

      {!loading && tripData && (
        <div className="mobile-card" style={{ border: '2px solid #34d399' }}>
          <div className="mobile-data-row" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🚚 {tripData.vehicle}</span>
            <span className="badge-pill badge-green">READY</span>
          </div>

          <h3 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1rem' }}>
            {tripData.origin} <span style={{ color: '#64748b' }}>➔</span> {tripData.destination}
          </h3>

          <div className="mobile-data-row">
            <span className="label">Distance</span>
            <span className="value">{tripData.distance} km</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">Est. Time</span>
            <span className="value">{tripData.time}</span>
          </div>
          <div className="mobile-data-row">
            <span className="label">CO₂ Impact</span>
            <span className="value text-green">{tripData.co2} kg</span>
          </div>

          <button 
            className="mobile-btn mobile-btn-primary" 
            style={{ marginTop: '1.5rem' }}
            onClick={() => onStartTrip(tripData)}
          >
            [ VIEW TRIP ]
          </button>
        </div>
      )}

      {!loading && !tripData && !errorMsg && (
        <div className="mobile-card text-center">
          <h3 className="mobile-card-title">NO TRIP PLANNED</h3>
          <p>Your next trip will appear here.</p>
        </div>
      )}
    </div>
  );
}
