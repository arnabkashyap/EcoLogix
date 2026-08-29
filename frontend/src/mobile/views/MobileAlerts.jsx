import React from 'react';

export default function MobileAlerts() {
  return (
    <div>
      <h2 className="mobile-h2">Alerts</h2>

      <div className="mobile-card" style={{ borderLeft: '4px solid #fbbf24' }}>
        <h3 className="mobile-card-title">📦 Return load available</h3>
        <p className="mobile-p" style={{ margin: 0 }}>
          Your vehicle has a possible return shipment from Guwahati.
        </p>
      </div>

      <div className="mobile-card" style={{ borderLeft: '4px solid #10b981', opacity: 0.8 }}>
        <h3 className="mobile-card-title">✓ Trip completed</h3>
        <p className="mobile-p" style={{ margin: 0 }}>
          Your trip from Jorhat to Guwahati is complete.
        </p>
      </div>
    </div>
  );
}
