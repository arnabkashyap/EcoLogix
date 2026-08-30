import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Crosshair, AlertTriangle } from 'lucide-react';

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
    if (!trigger || !points || points.length === 0) return;
    const validPoints = points.filter(
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
  }, [trigger, points, map]);
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
  legs = null,
  routeResult = null,
  depot = null,
  routeCategory = 'greener',
  setRouteCategory = null,
  customRouteLayer = null,
  children = null,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [recenterCoords, setRecenterCoords] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeFitTrigger, setRouteFitTrigger] = useState(0);

  // Read active legs from prop directly or fall back to routeResult.legs
  const activeLegs = useMemo(() => legs || routeResult?.legs || [], [legs, routeResult]);

  useEffect(() => {
    if (activeLegs.length > 0) {
      setRouteFitTrigger((prev) => prev + 1);
    }
  }, [activeLegs]);

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

  // Process unique deduplicated stop markers & cumulative metrics from activeLegs
  const { uniqueStops, boundsPoints } = useMemo(() => {
    if (!activeLegs || activeLegs.length === 0) {
      const fallbackStops = routeResult?.ordered_stops || [];
      const pts = fallbackStops.map((s) => ({ lat: s.lat, lng: s.lng }));
      if (depot && typeof depot.lat === 'number') {
        pts.push({ lat: depot.lat, lng: depot.lng });
      }
      if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        pts.push({ lat: userLocation.lat, lng: userLocation.lng });
      }
      return { uniqueStops: [], boundsPoints: pts };
    }

    const stopsMap = new Map();
    const pts = [];
    let cumDist = 0;
    let cumTime = 0;

    const sortedLegs = [...activeLegs].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

    sortedLegs.forEach((leg, idx) => {
      const fromKey = `${leg.from_lat.toFixed(4)},${leg.from_lng.toFixed(4)}`;
      const toKey = `${leg.to_lat.toFixed(4)},${leg.to_lng.toFixed(4)}`;

      pts.push({ lat: leg.from_lat, lng: leg.from_lng });
      pts.push({ lat: leg.to_lat, lng: leg.to_lng });

      // Origin of first leg
      if (idx === 0 && !stopsMap.has(fromKey)) {
        stopsMap.set(fromKey, {
          id: `stop-origin-${fromKey}`,
          name: leg.from_stop || 'Depot / Origin',
          lat: leg.from_lat,
          lng: leg.from_lng,
          isOrigin: true,
          sequenceIndex: 0,
          cumDistance: 0,
          cumTime: 0,
        });
      }

      cumDist += leg.distance_km || 0;
      cumTime += leg.time_min || 0;

      // Destination of leg
      if (!stopsMap.has(toKey)) {
        stopsMap.set(toKey, {
          id: `stop-${leg.sequence_order || idx + 1}-${toKey}`,
          name: leg.to_stop || `Stop #${idx + 1}`,
          lat: leg.to_lat,
          lng: leg.to_lng,
          isOrigin: false,
          sequenceIndex: idx + 1,
          cumDistance: Math.round(cumDist * 10) / 10,
          cumTime: Math.round(cumTime * 10) / 10,
        });
      } else {
        const existing = stopsMap.get(toKey);
        existing.cumDistance = Math.round(cumDist * 10) / 10;
        existing.cumTime = Math.round(cumTime * 10) / 10;
      }
    });

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      pts.push({ lat: userLocation.lat, lng: userLocation.lng });
    }

    return {
      uniqueStops: Array.from(stopsMap.values()),
      boundsPoints: pts,
    };
  }, [activeLegs, routeResult, depot, userLocation]);

  // Documented fallback center: activeLegs origin -> depot -> default Guwahati coordinates (26.1445, 91.7362)
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : activeLegs.length > 0
      ? [activeLegs[0].from_lat, activeLegs[0].from_lng]
      : depot
        ? [depot.lat, depot.lng]
        : [26.1445, 91.7362];

  return (
    <div className="flex flex-col gap-3">
      {/* Top Route Mode Switcher Bar */}
      {setRouteCategory && (
        <div className="grid grid-cols-2 gap-2 bg-[#121722] p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setRouteCategory('faster')}
            className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              routeCategory === 'faster'
                ? 'bg-slate-700 text-slate-100 shadow-md border border-slate-600'
                : 'bg-[#181E2B] text-slate-400 hover:text-slate-200 hover:bg-[#1E2638]'
            }`}
          >
            Faster Route (Time-Optimized)
          </button>
          <button
            onClick={() => setRouteCategory('greener')}
            className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              routeCategory === 'greener' || !routeCategory
                ? 'bg-[#10B981] text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-black'
                : 'bg-[#181E2B] text-slate-400 hover:text-slate-200 hover:bg-[#1E2638]'
            }`}
          >
            Greener Route (Carbon-Aware)
          </button>
        </div>
      )}

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
            <span>Recenter on location</span>
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

        {/* Placeholder banner when no active route calculated */}
        {activeLegs.length === 0 && (
          <div className="absolute top-4 right-4 z-[1000] bg-[#0B0E14]/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 backdrop-blur-md shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Select vehicle & shipments to optimize route</span>
          </div>
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={center}
          zoom={11}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full dark-tiles"
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter targetCoords={recenterCoords} />
          <MapFixer />
          <MapClickHandler onLocationSelect={handleManualSelect} />
          <MapBoundsFitter points={boundsPoints} trigger={routeFitTrigger} />

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
              draggable={true}
              eventHandlers={markerEventHandlers}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-semibold text-xs">
                  <div>📍 Selected Location</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Home Depot Marker */}
          {depot && (
            <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
              <Popup>
                <div className="p-1 text-slate-900 font-semibold text-xs">
                  <div>🏢 {depot.city || 'Freight Depot Hub'}</div>
                  <div className="text-[10px] text-slate-600">Home Fleet Depot</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Deduplicated Stop Markers with Cumulative Distance & Time */}
          {uniqueStops.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={
                stop.isOrigin
                  ? depotIcon
                  : L.divIcon({
                      className: 'custom-stop-marker',
                      html: `<div style="background: #10b981; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #022c22; font-size: 11px;">${stop.sequenceIndex}</div>`,
                      iconSize: [26, 26],
                      iconAnchor: [13, 13],
                    })
              }
            >
              <Popup>
                <div className="p-1.5 text-slate-900 text-xs">
                  <div className="font-bold text-emerald-800">
                    {stop.isOrigin ? `🏢 ${stop.name}` : `Stop #${stop.sequenceIndex}: ${stop.name}`}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 font-mono space-y-0.5">
                    <div>Cumulative Distance: <strong>{stop.cumDistance} km</strong></div>
                    <div>Cumulative Drive Time: <strong>{stop.cumTime} min</strong></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Custom Route Layer (if passed) or Live Leg Polylines */}
          {customRouteLayer ? (
            customRouteLayer
          ) : (
            activeLegs.map((leg) => {
              const isFlagged = Boolean(leg.climate_risk_flag);
              const positions = [
                [leg.from_lat, leg.from_lng],
                [leg.to_lat, leg.to_lng],
              ];
              return (
                <Polyline
                  key={`leg-${leg.sequence_order || leg.from_stop}-${leg.to_stop}`}
                  positions={positions}
                  pathOptions={{
                    color: isFlagged ? '#f59e0b' : '#10b981',
                    weight: isFlagged ? 5 : 4,
                    dashArray: isFlagged ? '8 6' : undefined,
                    opacity: isFlagged ? 0.95 : 0.85,
                  }}
                >
                  <Popup>
                    <div className="p-1.5 text-slate-900 text-xs">
                      <div className="font-bold flex items-center gap-1">
                        {isFlagged ? (
                          <span className="text-amber-700 font-extrabold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline" /> Climate-Flagged Risk Corridor
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">✓ Standard Route Segment</span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold mt-1">
                        Leg #{leg.sequence_order}: {leg.from_stop} → {leg.to_stop}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-1 space-y-0.5">
                        <div>Distance: {leg.distance_km} km</div>
                        <div>Duration: {leg.time_min} min</div>
                        <div>CO₂ Output: {leg.co2_kg} kg</div>
                      </div>
                      {isFlagged && (
                        <div className="mt-1.5 p-1.5 rounded bg-amber-50 text-amber-900 text-[10px] font-medium border border-amber-200">
                          {leg.climate_risk_note || 'Environmental hazard corridor advisory'}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              );
            })
          )}

          {children}
        </MapContainer>
      </div>
    </div>
  );
}
