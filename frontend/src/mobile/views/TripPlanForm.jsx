import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Truck, CloudRain, AlertTriangle, Wind, Gauge, ShieldAlert, Sparkles, MapPin, Navigation, Volume2, CheckCircle2 } from 'lucide-react';
import truckData from '../../data/truck_brands.json';

const GUWAHATI_LOCAL_DESTINATIONS = [
  { name: 'ICD Amingaon Container Depot', lat: 26.1852, lng: 91.6811, distanceKm: 18.5, timeMin: 42, co2Kg: 14.2 },
  { name: 'Bamunimaidam Industrial Estate', lat: 26.1884, lng: 91.7821, distanceKm: 14.2, timeMin: 34, co2Kg: 10.8 },
  { name: 'Paltan Bazaar Wholesale Hub', lat: 26.1834, lng: 91.7458, distanceKm: 11.8, timeMin: 28, co2Kg: 8.9 },
  { name: 'LGBI Airport Cargo Terminal', lat: 26.1061, lng: 91.5859, distanceKm: 22.4, timeMin: 48, co2Kg: 16.5 },
  { name: 'Adabari Truck Terminal', lat: 26.1667, lng: 91.7210, distanceKm: 9.6, timeMin: 22, co2Kg: 7.2 },
  { name: 'Sarusajai Export Processing Zone', lat: 26.1289, lng: 91.7501, distanceKm: 6.4, timeMin: 16, co2Kg: 4.8 },
  { name: 'Jalukbari Logistics Cluster', lat: 26.1598, lng: 91.7023, distanceKm: 8.9, timeMin: 20, co2Kg: 6.7 },
  { name: 'Khanapara Junction Freightyard', lat: 26.1156, lng: 91.8051, distanceKm: 12.5, timeMin: 26, co2Kg: 9.4 },
  { name: 'Guwahati Railway Goods Yard', lat: 26.1799, lng: 91.7517, distanceKm: 13.0, timeMin: 30, co2Kg: 9.8 },
  { name: 'Changsari Chemical Terminal', lat: 26.2189, lng: 91.6134, distanceKm: 24.8, timeMin: 52, co2Kg: 18.9 },
  { name: 'Bonda Timber Depot', lat: 26.2456, lng: 91.7543, distanceKm: 21.0, timeMin: 45, co2Kg: 15.8 },
  { name: 'Narengi Cantonment Supply Depot', lat: 26.1456, lng: 91.7789, distanceKm: 15.6, timeMin: 36, co2Kg: 11.9 },
];

const WEATHER_HAZARDS = {
  'Clear / Dry': { flood: 'None', wind: '10-15 km/h', impact: '0% penalty', riskColor: 'text-emerald-400' },
  'Moderate Rain': { flood: 'Low (Puddles)', wind: '25 km/h', impact: '+6% fuel consumption', riskColor: 'text-yellow-400' },
  'Monsoon / Heavy Rain': { flood: 'High Waterlogging Risk', wind: '45 km/h Gusts', impact: '+15% fuel consumption', riskColor: 'text-amber-400' },
  'Severe Storm / Cyclone': { flood: 'Critical Flood Zones', wind: '70+ km/h Gales', impact: '+28% fuel consumption', riskColor: 'text-rose-400' },
};

function detectTruckSpecs(inputBrand) {
  if (!inputBrand || !inputBrand.trim()) {
    return { capacity: 16000, mileage: '8.5 km/l' };
  }
  const clean = inputBrand.toLowerCase().trim();
  const found = truckData.trucks?.find(
    (t) => clean.includes(t.brand.toLowerCase()) || t.brand.toLowerCase().includes(clean)
  );
  return found
    ? { capacity: found.load_capacity_kg, mileage: `${found.mileage_kmpl} km/l` }
    : { capacity: 16000, mileage: '8.5 km/l' };
}

export default function TripPlanForm({ onStartTrip }) {
  const [cargoWeight, setCargoWeight] = useState('8500');
  const [selectedDestIndex, setSelectedDestIndex] = useState(0);
  const [vehicle, setVehicle] = useState('Tata Signa 4825.T Heavy Diesel #101');
  const [weather, setWeather] = useState('Clear / Dry');

  const selectedDestination = GUWAHATI_LOCAL_DESTINATIONS[selectedDestIndex] || GUWAHATI_LOCAL_DESTINATIONS[0];
  const activeVehicle = useMemo(() => detectTruckSpecs(vehicle), [vehicle]);
  const activeHazard = WEATHER_HAZARDS[weather] || {};
  const isOverweight = cargoWeight && Number(cargoWeight) > activeVehicle.capacity;

  const handleLaunchTrip = () => {
    const plannedTrip = {
      origin: 'Betkuchi ISBT Freight Terminal',
      destination: selectedDestination.name,
      distance: `${selectedDestination.distanceKm} km`,
      time: `${selectedDestination.timeMin} min`,
      co2: `${selectedDestination.co2Kg} kg`,
      vehicle: vehicle || 'Tata Signa 4825.T Heavy Diesel #101',
      cargo: `${Number(cargoWeight || 8500).toLocaleString()} kg`,
      autoStartNav: true,
      routeObj: {
        total_distance_km: selectedDestination.distanceKm,
        total_time_min: selectedDestination.timeMin,
        total_co2_kg: selectedDestination.co2Kg,
        ordered_stops: [
          { lat: 26.1214, lng: 91.7319, title: 'Betkuchi ISBT Freight Terminal' },
          { lat: selectedDestination.lat, lng: selectedDestination.lng, title: selectedDestination.name },
        ],
        legs: [
          {
            sequence_order: 1,
            from_stop: 'Betkuchi ISBT Freight Terminal',
            to_stop: selectedDestination.name,
            from_lat: 26.1214,
            from_lng: 91.7319,
            to_lat: selectedDestination.lat,
            to_lng: selectedDestination.lng,
            distance_km: selectedDestination.distanceKm,
            time_min: selectedDestination.timeMin,
            co2_kg: selectedDestination.co2Kg,
            onboard_weight_kg: Number(cargoWeight || 8500),
            congestion_index: 0.1,
            climate_risk_flag: weather.includes('Monsoon') || weather.includes('Severe'),
            climate_risk_note: weather.includes('Monsoon') ? 'Saraighat Corridor elevated flood advisory' : '',
          },
        ],
      },
    };

    if (onStartTrip) {
      onStartTrip(plannedTrip);
    }
  };

  return (
    <div className="bg-[#0c1524] border border-slate-800 rounded-2xl p-5 space-y-5 text-white mb-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>

      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Plan Guwahati Local Delivery Trip</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
          Guwahati Hub
        </span>
      </div>

      {/* Start Origin Fixed Hub */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
            STARTING DEPOT (ORIGIN)
          </span>
          <span className="font-bold text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Betkuchi ISBT Freight Terminal, Guwahati
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">NH-27 Hub</span>
      </div>

      {/* Select Guwahati Local Destination */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
          Select Guwahati Local Destination:
        </label>
        <select
          value={selectedDestIndex}
          onChange={(e) => setSelectedDestIndex(Number(e.target.value))}
          className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-3 text-xs font-bold text-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none cursor-pointer"
        >
          {GUWAHATI_LOCAL_DESTINATIONS.map((dest, idx) => (
            <option key={dest.name} value={idx}>
              📍 {dest.name} ({dest.distanceKm} km • {dest.timeMin} min)
            </option>
          ))}
        </select>
      </div>

      {/* Load & Vehicle Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 font-medium">Cargo Weight (kg)</label>
          <input
            type="number"
            value={cargoWeight}
            onChange={(e) => setCargoWeight(e.target.value)}
            placeholder="e.g. 8500"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs mt-1 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-medium">Truck Model</label>
          <input
            type="text"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="e.g. Tata Signa Heavy Diesel"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs mt-1 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Weather / Road Hazards */}
      <div>
        <label className="text-xs text-slate-400 font-medium">Weather / Road Advisory</label>
        <select
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs mt-1 focus:border-emerald-500 outline-none cursor-pointer"
        >
          {Object.keys(WEATHER_HAZARDS).map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {/* Route Preview Metrics */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">Route Distance</span>
          <span className="font-bold text-slate-100 font-mono">{selectedDestination.distanceKm} km</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">Drive Time</span>
          <span className="font-bold text-amber-300 font-mono">{selectedDestination.timeMin} min</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">CO₂ Output</span>
          <span className="font-bold text-emerald-400 font-mono">{selectedDestination.co2Kg} kg</span>
        </div>
      </div>

      {/* Action Button: Start Trip & Launch Voice Navigation */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleLaunchTrip}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
      >
        <Volume2 className="w-4 h-4 text-slate-950 fill-slate-950" />
        <span>Start Trip & Launch Voice Navigation</span>
      </motion.button>
    </div>
  );
}
