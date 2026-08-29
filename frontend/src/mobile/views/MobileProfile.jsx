import React from 'react';

export default function MobileProfile({ onExit }) {
  return (
    <div>
      <h2 className="mobile-h2">Driver Profile</h2>

      <div className="mobile-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
        <h3 className="mobile-card-title" style={{ fontSize: '1.5rem' }}>John Doe</h3>
        <p className="mobile-p" style={{ margin: 0 }}>Driver ID: DRV-001</p>
      </div>

      <div className="mobile-card">
        <h3 className="mobile-card-title" style={{ marginBottom: '1rem' }}>Assigned Vehicle</h3>
        
        <div className="mobile-data-row">
          <span className="label">Vehicle</span>
          <span className="value">Truck 01</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Type</span>
          <span className="value">Heavy Truck (MHCV)</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Capacity</span>
          <span className="value">10,000 kg</span>
        </div>
      </div>

      <div className="mobile-card">
        <h3 className="mobile-card-title" style={{ marginBottom: '1rem' }}>Your Impact</h3>
        
        <div className="mobile-data-row">
          <span className="label">Total Trips</span>
          <span className="value">124</span>
        </div>
        <div className="mobile-data-row">
          <span className="label">Total CO₂ Saved</span>
          <span className="value text-green">1,402 kg</span>
        </div>
      </div>

      <button onClick={onExit} className="mobile-btn mobile-btn-secondary" style={{ marginTop: '2rem' }}>
        [ SWITCH TO WEB PLANNER ]
      </button>
    </div>
  );
}
