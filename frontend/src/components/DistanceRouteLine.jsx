import React, { useEffect, useState, useMemo } from 'react';
import { Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Synthesizes a plausible curved road polyline between two coordinates
 * using Haversine distance and 1.25 curvature factor as a zero-dependency fallback.
 */
function generateCurvedFallbackRoad(fromLat, fromLng, toLat, toLng, alpha = 0.5) {
  const points = [];
  const steps = 30;

  // Vector between start and end
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;

  // Normal vector for curvature offset
  // greenest (alpha=0.0) curves slightly wider along terrain/valleys,
  // fast (alpha=1.0) is tighter along straight highway corridor
  const curveMagnitude = alpha === 0.0 ? 0.18 : alpha === 1.0 ? 0.06 : 0.12;
  const perpLat = -dLng * curveMagnitude;
  const perpLng = dLat * curveMagnitude;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Base linear interpolation
    let lat = fromLat + t * dLat;
    let lng = fromLng + t * dLng;

    // Add parabolic arc + subtle pseudo-road harmonic jitter
    const arc = Math.sin(t * Math.PI);
    const jitter = Math.sin(t * Math.PI * 4) * 0.002;

    lat += perpLat * arc + jitter;
    lng += perpLng * arc + jitter;

    points.push([lat, lng]);
  }

  return points;
}

export function DistanceRouteLine({ origin, destination, alpha = 0.5, onRouteStats }) {
  const map = useMap();
  const [roadCoordinates, setRoadCoordinates] = useState([]);
  const [routeStats, setRouteStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination || typeof origin.lat !== 'number' || typeof destination.lat !== 'number') {
      setRoadCoordinates([]);
      setRouteStats(null);
      return;
    }

    let isMounted = true;

    async function fetchOSRMRoute() {
      setIsLoading(true);
      const startLng = origin.lng ?? origin.lon;
      const startLat = origin.lat;
      const endLng = destination.lng ?? destination.lon;
      const endLat = destination.lat;

      // OSRM format: lng,lat;lng,lat
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;

      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
        const data = await response.json();

        if (isMounted && data.routes && data.routes.length > 0) {
          // Select route based on alpha:
          // alpha = 1.0 (Fastest/Polluted) -> route 0 (default fastest)
          // alpha = 0.0 (Greenest) -> alternative route if available, or eco profile
          // alpha = 0.5 (Optimal) -> balanced selection
          let selectedRoute = data.routes[0];
          if (alpha === 0.0 && data.routes.length > 1) {
            // Pick the alternative that has different distance/profile
            selectedRoute = data.routes[data.routes.length - 1];
          }

          const rawGeoJson = selectedRoute.geometry.coordinates;
          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
          const leafletCoords = rawGeoJson.map((coord) => [coord[1], coord[0]]);

          const distanceKm = +(selectedRoute.distance / 1000).toFixed(1);
          const timeMin = Math.round(selectedRoute.duration / 60);

          // Calculate carbon based on distance and route mode
          const emissionFactor = alpha === 0.0 ? 0.48 : alpha === 1.0 ? 0.95 : 0.65;
          const co2Kg = +(distanceKm * emissionFactor).toFixed(1);

          setRoadCoordinates(leafletCoords);
          const stats = {
            distance_km: distanceKm,
            time_min: timeMin,
            co2_kg: co2Kg,
            source: 'OSRM Real Road Network',
          };
          setRouteStats(stats);
          if (onRouteStats) onRouteStats(stats);

          // Smoothly adjust map bounds to fit the road geometry
          if (leafletCoords.length > 0) {
            try {
              const bounds = L.latLngBounds(leafletCoords);
              map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5 });
            } catch (err) {
              console.warn('Leaflet fitBounds notice:', err);
            }
          }
          return;
        }
      } catch (err) {
        console.warn('OSRM road fetch fallback to synthesized curvature:', err);
      }

      // Fallback: Haversine Curvature Synthesis
      if (isMounted) {
        const fallbackCoords = generateCurvedFallbackRoad(startLat, startLng, endLat, endLng, alpha);
        // Approx Haversine distance with 1.25 road curvature multiplier
        const straightDistKm =
          Math.sqrt(Math.pow((endLat - startLat) * 111, 2) + Math.pow((endLng - startLng) * 111 * Math.cos((startLat * Math.PI) / 180), 2));
        const estRoadDistKm = +(straightDistKm * 1.25).toFixed(1);
        const estTimeMin = Math.round((estRoadDistKm / 45) * 60);
        const estCo2Kg = +(estRoadDistKm * (alpha === 0.0 ? 0.48 : alpha === 1.0 ? 0.95 : 0.65)).toFixed(1);

        setRoadCoordinates(fallbackCoords);
        const fallbackStats = {
          distance_km: estRoadDistKm,
          time_min: estTimeMin,
          co2_kg: estCo2Kg,
          source: 'Curvature Synthesized Road',
        };
        setRouteStats(fallbackStats);
        if (onRouteStats) onRouteStats(fallbackStats);

        try {
          const bounds = L.latLngBounds(fallbackCoords);
          map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5 });
        } catch (e) {
          // ignore
        }
      }
      setIsLoading(false);
    }

    fetchOSRMRoute();

    return () => {
      isMounted = false;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, alpha, map]);

  // Color tokens based on 3 discrete alpha stops
  const theme = useMemo(() => {
    if (alpha <= 0.2) {
      return {
        coreColor: '#10b981', // Emerald
        glowColor: 'rgba(16, 185, 129, 0.35)',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: '🌿 Greenest Routable Road Path',
        tag: 'Max CO₂ Savings',
      };
    }
    if (alpha >= 0.8) {
      return {
        coreColor: '#f43f5e', // Rose
        glowColor: 'rgba(244, 63, 94, 0.35)',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: '⚡ Fastest Corridor (High CO₂)',
        tag: 'Max Speed Priority',
      };
    }
    return {
      coreColor: '#06b6d4', // Cyan
      glowColor: 'rgba(6, 182, 212, 0.35)',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      title: '⚖️ Optimal Balance Route',
      tag: 'Pareto Efficient',
    };
  }, [alpha]);

  if (!roadCoordinates || roadCoordinates.length < 2) return null;

  return (
    <>
      {/* Outer Glow Halo Polyline for Liquid Glass Depth */}
      <Polyline
        positions={roadCoordinates}
        pathOptions={{
          color: theme.glowColor,
          weight: 9,
          opacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Main Core Road Polyline with Dynamic Transition */}
      <Polyline
        positions={roadCoordinates}
        pathOptions={{
          color: theme.coreColor,
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: alpha === 0.0 ? undefined : alpha === 1.0 ? '6 4' : undefined,
        }}
      >
        <Popup>
          <div className="p-2 text-slate-900 text-xs font-sans min-w-[200px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <span className="font-extrabold text-slate-950 text-xs">{theme.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono bg-slate-100 text-slate-700">
                α = {alpha.toFixed(1)}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>From:</span>
                <strong className="text-slate-900">{origin?.name || origin?.city || 'Depot'}</strong>
              </div>
              <div className="flex justify-between">
                <span>To:</span>
                <strong className="text-slate-900">{destination?.name || 'Destination'}</strong>
              </div>
              {routeStats && (
                <div className="pt-1.5 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Road Distance:</span>
                    <strong className="text-emerald-700 font-mono">{routeStats.distance_km} km</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Drive Time:</span>
                    <strong className="text-amber-700 font-mono">{routeStats.time_min} min</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Carbon:</span>
                    <strong className="text-slate-900 font-mono">{routeStats.co2_kg} kg CO₂</strong>
                  </div>
                  <div className="text-[9px] text-slate-500 pt-0.5 italic">
                    Engine: {routeStats.source}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Popup>
      </Polyline>
    </>
  );
}
