import React, { useState, useMemo } from 'react';
import { Truck, CloudRain, AlertTriangle, Wind, Gauge, ShieldAlert, Sparkles } from 'lucide-react';

const WEATHER_HAZARDS = {
  'Clear / Dry': { flood: 'None', wind: '10-15 km/h', impact: '0% penalty', riskColor: 'text-emerald-400' },
  'Moderate Rain': { flood: 'Low (Puddles)', wind: '25 km/h', impact: '+6% fuel consumption', riskColor: 'text-yellow-400' },
  'Monsoon / Heavy Rain': { flood: 'High Waterlogging Risk', wind: '45 km/h Gusts', impact: '+15% fuel consumption', riskColor: 'text-amber-400' },
  'Severe Storm / Cyclone': { flood: 'Critical Flood Zones', wind: '70+ km/h Gales', impact: '+28% fuel consumption', riskColor: 'text-rose-400' },
};

import truckData from '../../data/truck_brands.json';

function detectTruckSpecs(inputBrand) {
  if (!inputBrand || !inputBrand.trim()) {
    return { capacity: 0, mileage: '--' };
  }
  const clean = inputBrand.toLowerCase().trim();
  const found = truckData.trucks.find(t =>
    clean.includes(t.brand.toLowerCase()) || t.brand.toLowerCase().includes(clean)
  );
  return found
    ? { capacity: found.load_capacity_kg, mileage: `${found.mileage_kmpl} km/l` }
    : { capacity: 7500, mileage: '8 km/l' }; // fallback default
}

export default function TripPlanForm() {
  const [cargoWeight, setCargoWeight] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [weather, setWeather] = useState('Clear / Dry');

  const activeVehicle = useMemo(() => detectTruckSpecs(vehicle), [vehicle]);

  const activeHazard = WEATHER_HAZARDS[weather] || {};
  const isOverweight = cargoWeight && Number(cargoWeight) > activeVehicle.capacity;

  return (
    <div className="bg-[#0c1524] border border-slate-800 rounded-2xl p-5 space-y-4 text-white mb-6 shadow-lg shadow-black/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-50"></div>
      
      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
        <Sparkles className="w-4 h-4"/>
        <span>Smart Driver Trip Configurator</span>
      </div>

      {/* Cargo & Destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">Cargo Quantity (kg)</label>
          <input
            type="number"
            value={cargoWeight}
            onChange={(e) => setCargoWeight(e.target.value)}
            placeholder="e.g. 5200"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Guwahati Hub 4"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Vehicle Selector & AI Auto-fill Panel */}
      <div>
        <label className="text-xs text-slate-400">Vehicle Model</label>
        <input
          type="text"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          placeholder="e.g. Tata Ultra, Eicher Pro, Mahindra Furio, EV Truck"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
        />

        {/* AI Pulled Vehicle Specs */}
        <div className="mt-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Truck className="w-4 h-4 text-emerald-400"/>
            <span>Capacity: <strong>{activeVehicle.capacity} kg</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Gauge className="w-4 h-4 text-amber-400"/>
            <span>Mileage: <strong>{activeVehicle.mileage}</strong></span>
          </div>
        </div>

        {isOverweight && (
          <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0"/>
            <span>Warning: Cargo exceeds vehicle max capacity by {cargoWeight - activeVehicle.capacity} kg!</span>
          </div>
        )}
      </div>

      {/* Weather Selector & AI Environmental Hazards */}
      <div>
        <label className="text-xs text-slate-400">Current / Expected Weather</label>
        <select
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 outline-none"
        >
          {Object.keys(WEATHER_HAZARDS).map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>

        {/* AI Pulled Weather Hazard Telemetry */}
        <div className="mt-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-cyan-400"/> Flood Risk:</span>
            <span className={`font-semibold ${activeHazard.riskColor}`}>{activeHazard.flood}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-slate-400"/> Wind Velocity:</span>
            <span className="font-semibold text-slate-200">{activeHazard.wind}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-amber-400"/> Efficiency Impact:</span>
            <span className="font-semibold text-amber-400">{activeHazard.impact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
