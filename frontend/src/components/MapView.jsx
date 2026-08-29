import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation, Crosshair } from 'lucide-react';

// Custom Leaflet Icons
const depotIcon = L.divIcon({
  className: 'custom-depot-icon',
  html: `<div style="background: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(59, 130, 246, 0.8); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 11px;">★</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const userLocationIcon = L.divIcon({
  className: 'custom-user-location-icon',
  html: `<div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(37, 99, 235, 0.9); z-index: 10;"></div>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const createStopIcon = (number, isOptimized = true) =>
  L.divIcon({
    className: 'custom-stop-icon',
    html: `<div style="background: ${isOptimized ? '#10b981' : '#f43f5e'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px ${isOptimized ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 11px;">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const riskWarningIcon = L.divIcon({
  className: 'custom-risk-icon',
  html: `<div style="background: #f59e0b; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 12px rgba(245, 158, 11, 0.9); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000000; font-size: 13px;">⚠️</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function MapBoundsFitter({ points, shouldFit }) {
  const map = useMap();
  useEffect(() => {
    if (!shouldFit) return;
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
  }, [points, shouldFit, map]);
  return null;
}

function MapRecenter({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords.length === 2) {
      map.flyTo(targetCoords, 13, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          source: 'clicked',
        });
      }
    },
  });
  return null;
}

export function MapView({ routeResult, depot }) {
  const [userLocation, setUserLocation] = useState(null);
  const [recenterCoords, setRecenterCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [hasUserRequestedRoute, setHasUserRequestedRoute] = useState(false);
  const routeCountRef = useRef(0);

  useEffect(() => {
    if (routeResult) {
      routeCountRef.current += 1;
      if (routeCountRef.current > 1) {
        setHasUserRequestedRoute(true);
      }
    }
  }, [routeResult]);

  const fetchUserLocation = (shouldRecenter = true) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            source: 'gps',
          };
          setUserLocation(loc);
          if (shouldRecenter) {
            setRecenterCoords([loc.lat, loc.lng]);
          }
        },
        (err) => console.warn('Geolocation unavailable or denied:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      fetchUserLocation(true);

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation((prev) => {
            if (prev && (prev.source === 'search' || prev.source === 'clicked' || prev.source === 'dragged')) {
              return prev;
            }
            return {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              source: 'gps',
            };
          });
        },
        (err) => console.warn('Geolocation watch error:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        const loc = {
          lat,
          lng,
          name: first.display_name,
          source: 'search',
        };
        setUserLocation(loc);
        setRecenterCoords([lat, lng]);
      } else {
        setSearchError('Location not found. Try a city or street address.');
      }
    } catch (err) {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSelect = (loc) => {
    setUserLocation(loc);
    setRecenterCoords([loc.lat, loc.lng]);
  };

  const markerEventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setUserLocation({
            lat: latLng.lat,
            lng: latLng.lng,
            source: 'dragged',
          });
          setRecenterCoords([latLng.lat, latLng.lng]);
        }
      },
    }),
    []
  );

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : depot
      ? [depot.lat, depot.lng]
      : [28.6139, 77.2090];

  const optimizedStops = routeResult?.ordered_stops || [];
  const baselineStops = routeResult?.baseline_stops || [];

  const optPolyline = optimizedStops.map((s) => [s.lat, s.lng]);
  const basePolyline = baselineStops.map((s) => [s.lat, s.lng]);

  const hasRiskFlag = routeResult?.legs?.some((l) => l.climate_risk_flag);

  // Combine route stops with user location for bounds calculation when fitting
  const boundsPoints = useMemo(() => {
    if (!routeResult || optimizedStops.length === 0) return [];
    const pts = [...optimizedStops];
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      pts.push({ lat: userLocation.lat, lng: userLocation.lng });
    }
    return pts;
  }, [routeResult, optimizedStops, userLocation]);

  return (
    <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
      {/* Floating Map Legend & Search Controls Overlay */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 max-w-[90%] sm:max-w-md">
        {/* Location Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-800 bg-slate-950/90 text-xs">
          <input
            type="text"
            placeholder="Search city or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 text-xs text-slate-100 placeholder-slate-500 px-2 py-1 rounded border border-slate-800 focus:outline-none focus:border-emerald-500 flex-1"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Search className="w-3 h-3" />
            {isSearching ? '...' : 'Search'}
          </button>
        </form>

        {searchError && (
          <div className="text-[11px] text-rose-400 bg-slate-950/90 px-2.5 py-1 rounded border border-rose-500/30">
            {searchError}
          </div>
        )}

        {/* Legend & Recenter */}
        <div className="px-3 py-1.5 rounded-lg text-[11px] bg-slate-950/90 border border-slate-800 flex items-center gap-3 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>EcoLogix</span>
          </div>
          <button
            onClick={() => fetchUserLocation(true)}
            className="ml-auto text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Crosshair className="w-3 h-3" /> Recenter
          </button>
        </div>
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

        {/* Dynamic Recenter */}
        <MapRecenter targetCoords={recenterCoords} />

        {/* Manual Map Click Selector */}
        <MapClickHandler onLocationSelect={handleManualSelect} />

        {/* Fit Map Bounds to Route & User Location when user explicitly requests/optimizes route */}
        <MapBoundsFitter points={boundsPoints} shouldFit={hasUserRequestedRoute} />

        {/* User Location Marker (Draggable) */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userLocationIcon}
            draggable={true}
            eventHandlers={markerEventHandlers}
          >
            <Popup>
              <div className="p-1 text-slate-900 font-semibold text-xs">
                <div>📍 Your selected location</div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                  Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                </div>
                <div className="text-[9px] text-slate-500 mt-1 italic">
                  Drag pin or click map to move
                </div>
              </div>
            </Popup>
          </Marker>
        )}

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
                    Shipment Weight: <span className="font-semibold">{stop.load_kg} kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Climate Risk Markers on Flagged Legs */}
        {routeResult?.legs?.filter((leg) => leg.climate_risk_flag).map((leg, idx) => {
          const midLat = (leg.from_lat + leg.to_lat) / 2.0;
          const midLng = (leg.from_lng + leg.to_lng) / 2.0;
          return (
            <Marker
              key={`risk-leg-${idx}`}
              position={[midLat, midLng]}
              icon={riskWarningIcon}
            >
              <Popup>
                <div className="p-1.5 text-slate-900 text-xs max-w-xs">
                  <div className="font-bold text-amber-700 flex items-center gap-1 mb-1">
                    ⚠️ Climate-Risk Exposure Warning
                  </div>
                  <div className="font-semibold text-slate-800">
                    Leg #{leg.sequence_order}: {leg.from_stop} → {leg.to_stop}
                  </div>
                  <div className="text-slate-700 mt-1 p-1 bg-amber-50 rounded border border-amber-200">
                    {leg.climate_risk_note}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 font-mono italic">
                    Illustrative Risk Flag (Demo)
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

