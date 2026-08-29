import React, { useState } from 'react';
import { lookupApi } from '../services/lookupApi';
import { MapPin, Truck, CloudRain, Search, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function ShipmentInputForm({ onSubmit }) {
  const [destQuery, setDestQuery] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [weightKg, setWeightKg] = useState('4500');
  const [vehicleName, setVehicleName] = useState('NW Heavy Freightliner');
  const [vehicleSpec, setVehicleSpec] = useState(null);
  const [weatherRisk, setWeatherRisk] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLookingUpVeh, setIsLookingUpVeh] = useState(false);
  const [isLookingUpWeather, setIsLookingUpWeather] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Geocode destination using Nominatim
  const handleGeocodeDest = async () => {
    if (!destQuery.trim()) return;
    setIsGeocoding(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        setDestCoords({
          lat,
          lon,
          name: first.display_name.split(',')[0],
        });
        // Auto trigger weather risk lookup for geocoded destination
        handleWeatherLookup(lat, lon);
      } else {
        setErrorMsg('Location not found. Please specify city or landmark.');
      }
    } catch (err) {
      setErrorMsg('Geocoding service unavailable.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Vehicle spec lookup
  const handleVehicleLookup = async () => {
    if (!vehicleName.trim()) return;
    setIsLookingUpVeh(true);
    try {
      const res = await lookupApi.lookupVehicle(vehicleName);
      setVehicleSpec(res);
    } catch (err) {
      console.warn('Vehicle lookup notice:', err);
    } finally {
      setIsLookingUpVeh(false);
    }
  };

  // Weather risk lookup
  const handleWeatherLookup = async (lat, lon) => {
    setIsLookingUpWeather(true);
    try {
      const res = await lookupApi.lookupWeather(lat, lon);
      setWeatherRisk(res);
    } catch (err) {
      console.warn('Weather lookup notice:', err);
    } finally {
      setIsLookingUpWeather(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        destination: destCoords || { lat: 28.4595, lon: 77.0266, name: destQuery || 'Gurugram Industrial Hub' },
        weight_kg: parseFloat(weightKg) || 4500,
        vehicle_spec: vehicleSpec,
        weather_risk: weatherRisk,
      });
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" /> Smart Shipment & Risk Entry
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Auto-lookup vehicle payload specs and live destination weather corridor risk
          </p>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
          Live API Lookup
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Destination & Geocode */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Destination Address or Hub
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Gurugram Cyber City, Noida Sec 62, Faridabad..."
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 flex-1"
            />
            <button
              type="button"
              onClick={handleGeocodeDest}
              disabled={isGeocoding}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              {isGeocoding ? 'Locating...' : 'Verify Location'}
            </button>
          </div>
          {destCoords && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved: {destCoords.name} ({destCoords.lat.toFixed(4)}, {destCoords.lon.toFixed(4)})
            </div>
          )}
          {errorMsg && <div className="text-[11px] text-rose-400 pt-1">{errorMsg}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weight Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Cargo Weight (kg)</label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Vehicle Lookup */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Vehicle Specs Lookup</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="e.g. Heavy Freightliner, EV Truck..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 flex-1"
              />
              <button
                type="button"
                onClick={handleVehicleLookup}
                disabled={isLookingUpVeh}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                {isLookingUpVeh ? '...' : 'Fetch Specs'}
              </button>
            </div>
          </div>
        </div>

        {/* Resolved Vehicle Spec Chip */}
        {vehicleSpec && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex items-center justify-between text-slate-300">
            <div>
              Capacity: <span className="font-bold text-emerald-400">{(vehicleSpec.capacity_kg / 1000).toFixed(1)}t</span> |
              Fuel: <span className="font-bold text-slate-200">{vehicleSpec.fuel_type}</span> |
              Rating: <span className="font-bold text-amber-300">{vehicleSpec.mileage_kmpl} km/l</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">[{vehicleSpec.source}]</span>
          </div>
        )}

        {/* Live Weather Risk Chip */}
        {weatherRisk && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-teal-400" /> Live Weather Corridor Risk
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  weatherRisk.flood_risk === 'high'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : weatherRisk.flood_risk === 'moderate'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {weatherRisk.flood_risk} Risk
              </span>
            </div>
            <div className="text-slate-400">{weatherRisk.note}</div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Apply Smart Shipment Specs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
