import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Icons
const depotIcon = L.divIcon({
  className: 'custom-depot-icon',
  html: `<div style="background: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(59, 130, 246, 0.8); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 11px;">★</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const createStopIcon = (number, isOptimized = true) =>
  L.divIcon({
    className: 'custom-stop-icon',
    html: `<div style="background: ${isOptimized ? '#10b981' : '#f43f5e'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px ${isOptimized ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 11px;">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function MapBoundsFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    const validPoints = (points || []).filter(
      (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number'
    );
    if (validPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        console.warn('Map bounds fit warning:', err);
      }
    }
  }, [points, map]);
  return null;
}

export function MapView({ routeResult, depot }) {
  const center = depot ? [depot.lat, depot.lng] : [47.5952, -122.3316];

  const optimizedStops = routeResult?.ordered_stops || [];
  const baselineStops = routeResult?.baseline_stops || [];

  const optPolyline = optimizedStops.map((s) => [s.lat, s.lng]);
  const basePolyline = baselineStops.map((s) => [s.lat, s.lng]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden glass-panel border border-slate-800 shadow-2xl">
      {/* Floating Map Legend & CO2 Saved Badge */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className="glass-panel px-3.5 py-2 rounded-xl text-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            <span className="font-semibold text-slate-200">EcoLogix Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-rose-500/80 rounded-full border-b border-dashed border-rose-300"></span>
            <span className="text-slate-400">Baseline (Time-only)</span>
          </div>
        </div>

        {routeResult && (
          <div className="glass-panel-glow px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="text-emerald-400 font-extrabold text-lg leading-none">
              -{routeResult.co2_saved_pct}%
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold">
                CO₂ Emissions Saved
              </div>
              <div className="text-xs text-slate-300">
                {routeResult.total_co2_kg} kg vs {routeResult.baseline_co2_kg} kg baseline
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={true}
        className="w-full h-full dark-tiles"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit Map Bounds */}
        <MapBoundsFitter points={optimizedStops.length > 0 ? optimizedStops : (depot ? [depot] : [])} />

        {/* Baseline Path (Dashed Rose Red) */}
        {basePolyline.length > 1 && (
          <Polyline
            positions={basePolyline}
            pathOptions={{
              color: '#f43f5e',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.7,
            }}
          />
        )}

        {/* Optimized Path (Solid Emerald Green) */}
        {optPolyline.length > 1 && (
          <Polyline
            positions={optPolyline}
            pathOptions={{
              color: '#10b981',
              weight: 5,
              opacity: 0.95,
            }}
          />
        )}

        {/* Depot Marker */}
        {depot && (
          <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
            <Popup>
              <div className="p-1 text-slate-900 font-semibold text-xs">
                <div>🏢 {depot.city}</div>
                <div className="text-[10px] text-slate-600">Home Fleet Depot</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stop Markers */}
        {optimizedStops.map((stop, idx) => {
          if (stop.stop_type === 'depot') return null;
          return (
            <Marker
              key={stop.id || idx}
              position={[stop.lat, stop.lng]}
              icon={createStopIcon(idx)}
            >
              <Popup>
                <div className="p-1 text-slate-900 text-xs">
                  <div className="font-bold text-emerald-800">
                    Stop #{idx}: {stop.title || stop.dest_name}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Freight Weight: <span className="font-semibold">{stop.load_kg} kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
