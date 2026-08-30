import React from 'react';
import TripPlanForm from './TripPlanForm';

export default function MobileTrips({ onStartTrip }) {
  return (
    <div>
      <TripPlanForm onStartTrip={onStartTrip} />
    </div>
  );
}
