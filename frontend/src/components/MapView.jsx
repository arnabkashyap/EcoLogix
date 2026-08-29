import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents, ZoomControl, Circle } from 'react-leaflet';
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


function MapBoundsFitter({ points, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger) return;
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
  }, [trigger, map]); // Only trigger when 'trigger' changes
  return null;
}

function MapRecenter({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords.length >= 2) {
      map.setView([targetCoords[0], targetCoords[1]], 13, { animate: true });
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

function MapFixer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function MapView({
  routeResult,
  depot,
  routeCategory,
  setRouteCategory,
  customRouteLayer = null,
  children = null,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [recenterCoords, setRecenterCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [isNavigating, setIsNavigating] = useState(false);
  const [routeFitTrigger, setRouteFitTrigger] = useState(0);

  useEffect(() => {
    if (routeResult) {
      setRouteFitTrigger(prev => prev + 1);
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
            setRecenterCoords([loc.lat, loc.lng, Date.now()]);
          }
        },
        (err) => console.warn('Geolocation unavailable or denied:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const handleRecenter = () => {
    if (userLocation) {
      setRecenterCoords([userLocation.lat, userLocation.lng, Date.now()]);
    } else {
      fetchUserLocation(true);
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
      : [26.1445, 91.7362];

  const optimizedStops = routeResult?.ordered_stops || [];
  const [roadPolyline, setRoadPolyline] = useState([]);

  useEffect(() => {
    async function fetchRoadRoute() {
      const fullRoute = optimizedStops.map(s => [s.lat, s.lng]);
      if (fullRoute.length === 0) {
        setRoadPolyline([]);
        return;
      }
      
      const pts = [];
      if (userLocation && typeof userLocation.lat === 'number') {
        pts.push([userLocation.lat, userLocation.lng]);
      }
      
      // We'll just build a route from userLocation -> all stops -> depot
      pts.push(...fullRoute);
      
      if (pts.length === 0 || pts[pts.length - 1][0] !== depot.lat || pts[pts.length - 1][1] !== depot.lng) {
        pts.push([depot.lat, depot.lng]);
      }

      // OSRM expects longitude,latitude
      const coords = pts.map(p => `${p[1]},${p[0]}`).join(';');
      
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const coordsArr = data.routes[0].geometry.coordinates;
          // OSRM returns [lng, lat], Leaflet wants [lat, lng]
          const leafletCoords = coordsArr.map(c => [c[1], c[0]]);
          setRoadPolyline(leafletCoords);
        } else {
          setRoadPolyline(pts); // fallback to straight lines
        }
      } catch (err) {
        console.error("OSRM fetch error:", err);
        setRoadPolyline(pts); // fallback
      }
    }
    
    fetchRoadRoute();
  }, [optimizedStops, userLocation, depot]);

  // For the actual polyline we render, use the roadPolyline
  const optPolyline = useMemo(() => {
    return roadPolyline;
  }, [roadPolyline]);

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
    <div className="flex flex-col gap-3">
      {/* Top Route Mode Switcher Bar */}
      <div className="grid grid-cols-2 gap-2 bg-[#121722] p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setRouteCategory && setRouteCategory('faster')}
          className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            routeCategory === 'faster'
              ? 'bg-slate-700 text-slate-100 shadow-md border border-slate-600'
              : 'bg-[#181E2B] text-slate-400 hover:text-slate-200 hover:bg-[#1E2638]'
          }`}
        >
          Faster Route (Time-Optimized)
        </button>
        <button
          onClick={() => setRouteCategory && setRouteCategory('greener')}
          className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            routeCategory === 'greener' || !routeCategory
              ? 'bg-[#10B981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-black'
              : 'bg-[#181E2B] text-slate-400 hover:text-slate-200 hover:bg-[#1E2638]'
          }`}
        >
          Greener Route (Carbon-Aware)
        </button>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[500px] rounded-2xl overflow-hidden glass-panel border border-slate-800/80 shadow-2xl">
        {/* Floating Overlay Controls inside Map */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleRecenter}
            className="px-3.5 py-2 rounded-xl bg-[#0B0E14]/85 hover:bg-[#161B26] text-slate-200 border border-slate-700/80 text-xs font-bold flex items-center gap-2 shadow-xl transition-all cursor-pointer backdrop-blur-md"
            title="Recenter on my live location"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span>Recenter on my location</span>
          </button>
          <button
            onClick={() => setIsNavigating(!isNavigating)}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              isNavigating 
                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950' 
                : 'bg-[#10B981] hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>{isNavigating ? 'Stop Navigation' : 'Start Navigation'}</span>
          </button>
        </div>

      {/* Leaflet Map */}
      <MapContainer
        center={center}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full dark-tiles"
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic Recenter */}
        <MapRecenter targetCoords={recenterCoords} />

        {/* Fix Map Size */}
        <MapFixer />

        {/* Manual Map Click Selector */}
        <MapClickHandler onLocationSelect={handleManualSelect} />

        {/* Fit Map Bounds to Route & User Location when user explicitly requests/optimizes route */}
        <MapBoundsFitter points={boundsPoints} trigger={routeFitTrigger} />

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
          if (idx === 0 || (idx === optimizedStops.length - 1 && stop.id === 'depot')) return null;
          return (
            <Marker
              key={`${stop.id}-${idx}`}
              position={[stop.lat, stop.lng]}
              icon={L.divIcon({
                className: 'custom-stop-marker',
                html: `<div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #022c22; font-size: 11px;">${idx}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-semibold text-xs">
                  <div className="font-bold text-emerald-800">Stop #{idx}: {stop.dest_name || stop.title}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">Payload: {stop.load_kg ? `${Math.round(stop.load_kg)} kg` : 'N/A'}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Custom Layer (for ConsumerTrackingView routable road line) or Default Polylines (AdminDashboard) */}
        {customRouteLayer ? (
          customRouteLayer
        ) : routeResult?.legs && routeResult.legs.length > 0 ? (
          routeResult.legs.map((leg) => {
            const isFlagged = leg.climate_risk_flag;
            const positions = [
              [leg.from_lat, leg.from_lng],
              [leg.to_lat, leg.to_lng],
            ];
            return (
              <Polyline
                key={`leg-${leg.sequence_order}`}
                positions={positions}
                pathOptions={{
                  color: isFlagged ? '#f59e0b' : '#10b981',
                  weight: isFlagged ? 5 : 4,
                  dashArray: isFlagged ? '8 6' : undefined,
                  opacity: isFlagged ? 0.95 : 0.85,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 text-xs">
                    <div className="font-bold flex items-center gap-1">
                      {isFlagged ? '⚠️ Climate-Flagged Corridor' : '✓ Normal Transit Leg'}
                    </div>
                    <div className="text-[11px] font-semibold mt-1">
                      {leg.from_stop} → {leg.to_stop}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      Distance: {leg.distance_km} km | Time: {leg.time_min} min | CO₂: {leg.co2_kg} kg
                    </div>
                    {isFlagged && (
                      <div className="mt-1 p-1.5 rounded bg-amber-50 text-amber-900 text-[10px] font-medium border border-amber-200">
                        {leg.climate_risk_note}
                      </div>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })
        ) : (
          optPolyline.length > 1 && (
            <Polyline
              positions={optPolyline}
              pathOptions={{
                color: '#10b981',
                weight: 5,
                opacity: 0.95,
              }}
            />
          )
        )}

        {children}
      </MapContainer>
    </div>
  </div>
  );
}

