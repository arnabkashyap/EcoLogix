/**
 * EcoLogix Mock Scenario Library — 50 realistic Guwahati/Assam route datasets.
 * Used by MockScenarioPicker to instantly populate AdminDashboard & Driver App
 * without waiting for the route optimizer to complete.
 *
 * Each scenario produces a full routeResult object matching the optimizer's
 * output schema, plus a tripData object for the Driver App.
 */

// ─── Key Guwahati/Assam node registry ───────────────────────────────────────
const NODES = {
  betkuchi:    { name: 'Betkuchi ISBT Freight Terminal',    lat: 26.1214, lng: 91.7319 },
  amingaon:    { name: 'ICD Amingaon Container Depot',      lat: 26.1852, lng: 91.6811 },
  lgbi:        { name: 'LGBI Airport Cargo Terminal',        lat: 26.1061, lng: 91.5859 },
  bamuni:      { name: 'Bamunimaidam Industrial Estate',     lat: 26.1884, lng: 91.7821 },
  paltan:      { name: 'Paltan Bazaar Wholesale Hub',        lat: 26.1834, lng: 91.7458 },
  adabari:     { name: 'Adabari Truck Terminal',             lat: 26.1667, lng: 91.7210 },
  azara:       { name: 'Azara Rail-Road Transfer Hub',       lat: 26.0889, lng: 91.7076 },
  sarusajai:   { name: 'Sarusajai Export Processing Zone',   lat: 26.1289, lng: 91.7501 },
  khanapara:   { name: 'Khanapara Junction Freightyard',     lat: 26.1156, lng: 91.8051 },
  jalukbari:   { name: 'Jalukbari Logistics Cluster',        lat: 26.1598, lng: 91.7023 },
  bonda:       { name: 'Bonda Timber Depot',                 lat: 26.2456, lng: 91.7543 },
  northGhy:    { name: 'North Guwahati Ferry Terminal',      lat: 26.2023, lng: 91.7234 },
  narengi:     { name: 'Narengi Cantonment Supply Depot',    lat: 26.1456, lng: 91.7789 },
  refinery:    { name: 'Guwahati Petroleum Refinery Depot',  lat: 26.1678, lng: 91.8123 },
  guwhatirly:  { name: 'Guwahati Railway Goods Yard',        lat: 26.1799, lng: 91.7517 },
  bongaigaon:  { name: 'Bongaigaon Industrial Zone',         lat: 26.4756, lng: 90.5567 },
  silchar:     { name: 'Silchar Regional Distribution Hub',  lat: 24.8333, lng: 92.7789 },
  dibrugarh:   { name: 'Dibrugarh Tea & Petroleum Hub',      lat: 27.4728, lng: 95.0137 },
  tinsukia:    { name: 'Tinsukia Oil Field Supply Depot',    lat: 27.4911, lng: 95.3581 },
  jorhat:      { name: 'Jorhat Agricultural Produce Terminal',lat: 26.7465, lng: 94.2027 },
  nagaon:      { name: 'Nagaon Sugar Cooperative Depot',     lat: 26.3478, lng: 92.6845 },
  rangiya:     { name: 'Rangiya Rail Junction Warehouse',    lat: 26.4603, lng: 91.6180 },
  nalbari:     { name: 'Nalbari Agri-Export Cold Store',     lat: 26.4467, lng: 91.4378 },
  sonapur:     { name: 'Sonapur Riverside Logistics Hub',    lat: 26.1045, lng: 91.9012 },
  changsari:   { name: 'Changsari Chemical Storage Terminal', lat: 26.2189, lng: 91.6134 },
};

// ─── Vehicle presets ─────────────────────────────────────────────────────────
const VEHICLES = {
  hw101: { id: 'veh-nw-101', name: 'NW Tata Signa 4825.T Heavy Diesel #101', vehicle_type: 'heavy_truck' },
  hw202: { id: 'veh-nw-202', name: 'NW Tata Signa 4825.T Heavy Diesel #202', vehicle_type: 'heavy_truck' },
  ev202: { id: 'veh-nw-ev202', name: 'NW Freightliner E-Cascadia EV #202', vehicle_type: 'ev_truck' },
  mv301: { id: 'veh-nw-301', name: 'NW Ashok Leyland Medium Truck #301', vehicle_type: 'medium_truck' },
  hw501: { id: 'veh-apex-501', name: 'Apex BharatBenz 2523R Heavy #501', vehicle_type: 'heavy_truck' },
  ev601: { id: 'veh-apex-ev601', name: 'Apex E-Force One EV Reefer #601', vehicle_type: 'ev_truck' },
  mv701: { id: 'veh-apex-701', name: 'Apex Eicher 20.16 Medium #701', vehicle_type: 'medium_truck' },
};

// ─── Helper: build a leg object ──────────────────────────────────────────────
function leg(order, from, to, distKm, timeMin, loadKg, maxKg, congIdx, flagged, riskNote, isEv = false) {
  const lf = Math.min(1, loadKg / maxKg);
  const baseL = isEv ? 0 : 0.34;
  const kLoad = isEv ? 0 : 0.40;
  const kCong = isEv ? 0 : 0.35;
  let co2, fuelL, energyKwh;
  if (isEv) {
    energyKwh = parseFloat((distKm * 0.85 * (1 + lf * 0.15) * (1 + congIdx * 0.10)).toFixed(2));
    co2 = parseFloat((energyKwh * 0.18).toFixed(2));
    fuelL = 0;
  } else {
    fuelL = parseFloat((baseL * distKm * (1 + lf * kLoad) * (1 + congIdx * kCong)).toFixed(2));
    co2 = parseFloat((fuelL * 2.68).toFixed(2));
    energyKwh = 0;
  }
  return {
    sequence_order: order,
    from_stop: from.name,
    to_stop: to.name,
    from_lat: from.lat, from_lng: from.lng,
    to_lat: to.lat, to_lng: to.lng,
    distance_km: parseFloat(distKm.toFixed(2)),
    time_min: parseFloat(timeMin.toFixed(1)),
    co2_kg: co2,
    fuel_L: fuelL,
    energy_kwh: energyKwh,
    load_factor: parseFloat(lf.toFixed(2)),
    onboard_weight_kg: parseFloat(loadKg.toFixed(1)),
    congestion_index: congIdx,
    climate_risk_flag: flagged,
    climate_risk_note: riskNote,
    formula_breakdown: {
      base_L_per_km: baseL,
      k_load: kLoad,
      k_congestion: kCong,
      diesel_emission_factor: isEv ? null : 2.68,
      grid_emission_factor: isEv ? 0.18 : null,
    },
  };
}

// ─── Helper: generate pareto points ─────────────────────────────────────────
function pareto(baselineCo2, optimalTime, optimalCo2, baselineTime, selectedAlpha = 0.5) {
  return [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((a) => {
    // a = 0.0 is greenest (lowest co2, slightly more time)
    // a = 1.0 is fastest (baseline co2, lowest time)
    const co2 = parseFloat((optimalCo2 + (baselineCo2 - optimalCo2) * a).toFixed(2));
    const time = parseFloat((optimalTime - (optimalTime - baselineTime) * a).toFixed(1));
    const saved = parseFloat((((baselineCo2 - co2) / baselineCo2) * 100).toFixed(1));
    return {
      alpha: a,
      label: a === 1.0 ? 'Fastest' : a === 0.0 ? 'Greenest' : `α = ${a}`,
      time_min: time,
      co2_kg: co2,
      co2_saved_pct: Math.max(0, saved),
      is_selected: Math.abs(a - selectedAlpha) < 0.05,
    };
  });
}

// ─── Helper: assemble a full routeResult ─────────────────────────────────────
function route(legs, baselineMult = 1.12) {
  const totalDist = parseFloat(legs.reduce((s, l) => s + l.distance_km, 0).toFixed(2));
  const totalTime = parseFloat(legs.reduce((s, l) => s + l.time_min, 0).toFixed(1));
  const totalCo2  = parseFloat(legs.reduce((s, l) => s + l.co2_kg, 0).toFixed(2));
  const baselineCo2 = parseFloat((totalCo2 * baselineMult).toFixed(2));
  const baselineTime = parseFloat((totalTime * 0.88).toFixed(1));
  const co2SavedPct = parseFloat((((baselineCo2 - totalCo2) / baselineCo2) * 100).toFixed(1));
  const stopsList = [
    legs[0] ? { lat: legs[0].from_lat, lng: legs[0].from_lng, title: legs[0].from_stop } : {},
    ...legs.map((l) => ({ lat: l.to_lat, lng: l.to_lng, title: l.to_stop })),
  ];

  return {
    alpha: 0.5,
    solution_method: 'exact_optimal',
    total_distance_km: totalDist,
    total_time_min: totalTime,
    total_co2_kg: totalCo2,
    baseline_co2_kg: baselineCo2,
    baseline_time_min: baselineTime,
    co2_saved_pct: co2SavedPct,
    ordered_stops: stopsList,
    baseline_stops: stopsList,
    baseline_legs: legs.map((l) => ({
      ...l,
      congestion_index: 0.05,
      climate_risk_flag: false,
      climate_risk_note: '',
      time_min: parseFloat((l.time_min * 0.88).toFixed(1)),
      co2_kg: parseFloat((l.co2_kg * baselineMult).toFixed(2)),
    })),
    legs,
    pareto_points: pareto(baselineCo2, totalTime, totalCo2, baselineTime, 0.5),
  };
}

// ─── Helper: tripData from routeResult ───────────────────────────────────────
function trip(routeResult, vehicle) {
  const first = routeResult.legs[0];
  const last = routeResult.legs[routeResult.legs.length - 1];
  return {
    origin: first.from_stop,
    destination: last.to_stop,
    distance: routeResult.total_distance_km,
    time: `${routeResult.total_time_min} min`,
    co2: routeResult.total_co2_kg,
    vehicle: vehicle.name,
    routeObj: routeResult,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// THE 50 SCENARIOS
// ════════════════════════════════════════════════════════════════════════════

const raw = [

  // ── URBAN GUWAHATI MULTI-DROP (1–10) ─────────────────────────────────────
  {
    id: 'S01', label: 'Urban Multi-Drop: Betkuchi → Amingaon → Paltan', group: 'Urban',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon,  18.5, 42, 12500, 18000, 0.05, false, ''),
      leg(2, NODES.amingaon,  NODES.paltan,    14.2, 32, 6000,  18000, 0.05, false, ''),
      leg(3, NODES.paltan,    NODES.betkuchi,  12.8, 30, 0,     18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S02', label: 'Urban Loop: Adabari → Jalukbari → Sarusajai', group: 'Urban',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.adabari,   NODES.jalukbari,  8.4, 22, 7200, 14000, 0.05, false, ''),
      leg(2, NODES.jalukbari, NODES.sarusajai, 10.1, 26, 3800, 14000, 0.05, false, ''),
      leg(3, NODES.sarusajai, NODES.adabari,    9.6, 24, 0,    14000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S03', label: 'City Goods: Betkuchi → Bamunimaidam → Narengi', group: 'Urban',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.bamuni,   11.2, 28, 15200, 18000, 0.05, false, ''),
      leg(2, NODES.bamuni,   NODES.narengi,   8.7, 22,  8400, 18000, 0.05, false, ''),
      leg(3, NODES.narengi,  NODES.betkuchi,  7.9, 20,  0,    18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S04', label: 'Railway Yard Run: Guwahati Goods Yard → Paltan → Bamunimaidam', group: 'Urban',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.guwhatirly, NODES.paltan,  6.4, 18, 11000, 18000, 0.05, false, ''),
      leg(2, NODES.paltan,     NODES.bamuni,   7.8, 20,  5500, 18000, 0.05, false, ''),
      leg(3, NODES.bamuni,     NODES.guwhatirly, 8.2, 21, 0,  18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S05', label: 'North Bank Express: North Guwahati Ferry → Bonda Depot', group: 'Urban',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.northGhy, NODES.bonda,    14.6, 36, 9200, 14000, 0.05, false, ''),
      leg(2, NODES.bonda,    NODES.northGhy, 14.6, 34,    0, 14000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S06', label: '4-Stop Urban: Betkuchi → Adabari → Jalukbari → LGBI → Azara', group: 'Urban',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.adabari,   7.2, 20, 16000, 18000, 0.05, false, ''),
      leg(2, NODES.adabari,  NODES.jalukbari,  8.4, 22, 10500, 18000, 0.05, false, ''),
      leg(3, NODES.jalukbari, NODES.lgbi,     12.8, 30,  5200, 18000, 0.05, false, ''),
      leg(4, NODES.lgbi,     NODES.azara,      9.3, 25,     0, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S07', label: 'Refinery Shuttle: Guwahati Refinery → Bamunimaidam → Narengi', group: 'Urban',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.refinery, NODES.bamuni,   9.6, 24, 14000, 18000, 0.08, false, ''),
      leg(2, NODES.bamuni,   NODES.narengi,  8.7, 22,  7000, 18000, 0.05, false, ''),
      leg(3, NODES.narengi,  NODES.refinery, 7.3, 19,     0, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S08', label: 'Sarusajai Export Pickup: Sarusajai → Khanapara → Refinery', group: 'Urban',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.sarusajai, NODES.khanapara, 11.4, 28, 13800, 18000, 0.05, false, ''),
      leg(2, NODES.khanapara, NODES.refinery,   8.9, 22,  6900, 18000, 0.05, false, ''),
      leg(3, NODES.refinery,  NODES.sarusajai,  9.7, 24,     0, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S09', label: 'Cantonment Supply Chain: Narengi → Bamunimaidam → Paltan', group: 'Urban',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.narengi, NODES.bamuni,  8.7, 22, 10200, 14000, 0.05, false, ''),
      leg(2, NODES.bamuni,  NODES.paltan,  9.1, 24,  5100, 14000, 0.05, false, ''),
      leg(3, NODES.paltan,  NODES.narengi, 8.3, 21,     0, 14000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S10', label: 'Changsari Chemical Pickup: Changsari → Adabari → Jalukbari', group: 'Urban',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.changsari, NODES.adabari,   16.2, 38, 15500, 18000, 0.05, false, ''),
      leg(2, NODES.adabari,   NODES.jalukbari,  8.4, 22,  7800, 18000, 0.05, false, ''),
      leg(3, NODES.jalukbari, NODES.betkuchi,   7.9, 20,     0, 18000, 0.05, false, ''),
    ]),
  },

  // ── HIGHWAY CORRIDOR RUNS (11–20) ─────────────────────────────────────────
  {
    id: 'S11', label: 'Highway: Guwahati → Bongaigaon Industrial Zone', group: 'Highway',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.rangiya,    64.2, 78, 17500, 18000, 0.05, false, ''),
      leg(2, NODES.rangiya,   NODES.bongaigaon, 82.4, 92, 17500, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S12', label: 'Highway: Guwahati → Nagaon Sugar Depot', group: 'Highway',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.sonapur, 28.4, 42, 16800, 18000, 0.05, false, ''),
      leg(2, NODES.sonapur,  NODES.nagaon,  96.5, 105, 16800, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S13', label: 'Tea Highway: Guwahati → Jorhat Agricultural Terminal', group: 'Highway',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.nagaon,  125.4, 138, 17200, 18000, 0.05, false, ''),
      leg(2, NODES.nagaon,    NODES.jorhat,   82.1,  90, 17200, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S14', label: 'Nalbari Agri-Export Run: Betkuchi → Rangiya → Nalbari', group: 'Highway',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.rangiya, 64.2, 76, 12400, 14000, 0.05, false, ''),
      leg(2, NODES.rangiya,  NODES.nalbari, 38.6, 50, 12400, 14000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S15', label: 'LGBI Airport Cargo Express: Betkuchi → LGBI Direct', group: 'Highway',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.lgbi, 24.8, 38, 9800, 18000, 0.05, false, ''),
      leg(2, NODES.lgbi, NODES.betkuchi, 24.8, 36,    0, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S16', label: 'Sonapur East Corridor: Betkuchi → Khanapara → Sonapur', group: 'Highway',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.khanapara, 16.8, 34, 14500, 18000, 0.05, false, ''),
      leg(2, NODES.khanapara, NODES.sonapur,   22.4, 42, 14500, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S17', label: 'Dibrugarh Long-Haul: Guwahati → Jorhat → Dibrugarh', group: 'Highway',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.jorhat,    207.5, 225, 16000, 18000, 0.05, false, ''),
      leg(2, NODES.jorhat,   NODES.dibrugarh, 136.2, 148, 16000, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S18', label: 'Tinsukia Oil Field Supply: Guwahati → Dibrugarh → Tinsukia', group: 'Highway',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.dibrugarh, 343.7, 372, 17800, 18000, 0.05, false, ''),
      leg(2, NODES.dibrugarh, NODES.tinsukia,   38.2,  48, 17800, 18000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S19', label: 'Changsari Bypass Loop: Betkuchi → Changsari → Nalbari → Rangiya', group: 'Highway',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.changsari, 18.4, 32, 11600, 14000, 0.05, false, ''),
      leg(2, NODES.changsari, NODES.nalbari,   42.3, 54, 11600, 14000, 0.05, false, ''),
      leg(3, NODES.nalbari,   NODES.rangiya,   38.6, 48,  5800, 14000, 0.05, false, ''),
    ]),
  },
  {
    id: 'S20', label: 'Silchar South Run: Guwahati → Azara → Silchar', group: 'Highway',
    vehicle: VEHICLES.hw501,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.azara,   22.4, 38, 16500, 18000, 0.05, false, ''),
      leg(2, NODES.azara,    NODES.silchar, 334.2, 365, 16500, 18000, 0.05, false, ''),
    ]),
  },

  // ── CLIMATE RISK ROUTES (21–30) ───────────────────────────────────────────
  {
    id: 'S21', label: '⚠ Saraighat Bridge Flood Advisory: Betkuchi → Amingaon via Saraighat', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon, 18.5, 52, 12500, 18000, 0.28,  true,
         'Saraighat Bridge river crossing bottleneck & monsoon waterlogging advisory | Live weather: high flood risk (14.2mm precip, 42 km/h wind)'),
      leg(2, NODES.amingaon, NODES.betkuchi, 18.5, 48,     0, 18000, 0.28,  true,
         'Saraighat Bridge return — elevated flood risk'),
    ], 1.24),
  },
  {
    id: 'S22', label: '⚠ Jorabat Pass Monsoon: Betkuchi → Khanapara (Jorabat Corridor)', group: 'Climate Risk',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.khanapara, 16.8, 44, 14500, 18000, 0.20, true,
         'Jorabat / Khanapara mountain runoff waterlogging corridor | Live weather: moderate flood risk (5.8mm precip, 24 km/h wind)'),
      leg(2, NODES.khanapara, NODES.sonapur,   22.4, 48, 14500, 18000, 0.15, true,
         'Jorabat Pass Monsoon Flood Corridor'),
    ], 1.18),
  },
  {
    id: 'S23', label: '⚠ Brahmaputra Flood Zone: Amingaon → North Guwahati → Bonda', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.amingaon, NODES.northGhy, 10.4, 38, 13200, 18000, 0.28, true,
         'North Bank low-lying seasonal flood hazard zone'),
      leg(2, NODES.northGhy, NODES.bonda,    14.6, 46,  6600, 18000, 0.28, true,
         'Brahmaputra Floodplain Inundation Zone | Live weather: high flood risk (18.6mm precip, 51 km/h wind)'),
    ], 1.28),
  },
  {
    id: 'S24', label: '⚠ Double Hazard: Saraighat + Jorabat — Full Climate Risk Route', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.amingaon,  18.5, 54, 16000, 18000, 0.38, true,
         'Saraighat Bridge bottleneck | Live weather: high flood risk (16.1mm precip, 48 km/h wind)'),
      leg(2, NODES.amingaon,  NODES.khanapara, 24.2, 58,  8000, 18000, 0.20, true,
         'Jorabat corridor — moderate waterlogging'),
      leg(3, NODES.khanapara, NODES.betkuchi,  16.8, 42,     0, 18000, 0.15, true,
         'Jorabat Pass Monsoon Flood Corridor'),
    ], 1.30),
  },
  {
    id: 'S25', label: '⚠ Monsoon Congestion: Refinery → Bamunimaidam (High Wind Advisory)', group: 'Climate Risk',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.refinery, NODES.bamuni,   9.6, 32, 14000, 18000, 0.15, true,
         'Live weather: moderate flood risk (4.2mm precip, 22.8 km/h wind) along destination corridor'),
      leg(2, NODES.bamuni,   NODES.narengi,  8.7, 28,  7000, 18000, 0.10, true,
         'Live weather: moderate flood risk (3.8mm precip, 21 km/h wind)'),
    ], 1.16),
  },
  {
    id: 'S26', label: '⚠ Airport Corridor Storm: Betkuchi → LGBI (Precipitation Alert)', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.azara,  22.4, 48, 9800, 18000, 0.10, true,
         'Live weather: moderate flood risk (4.5mm precip, 23 km/h wind)'),
      leg(2, NODES.azara,    NODES.lgbi,   12.2, 35, 9800, 18000, 0.10, true,
         'Live weather: moderate flood risk (5.1mm precip, 24 km/h wind)'),
    ], 1.14),
  },
  {
    id: 'S27', label: '⚠ Brahmaputra North Bank + Rain: Changsari → North Guwahati', group: 'Climate Risk',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.changsari, NODES.northGhy, 26.4, 58, 10200, 14000, 0.33, true,
         'North Bank low-lying seasonal flood hazard zone | Live weather: high flood risk (12.4mm precip, 38 km/h wind)'),
    ], 1.26),
  },
  {
    id: 'S28', label: '⚠ Khanapara Runoff: Refinery → Sonapur (Mountain Drainage Alert)', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.refinery,  NODES.khanapara, 8.9, 30, 12400, 18000, 0.20, true,
         'Jorabat / Khanapara mountain runoff waterlogging corridor'),
      leg(2, NODES.khanapara, NODES.sonapur,  22.4, 48, 12400, 18000, 0.15, true,
         'Jorabat Pass Monsoon Flood Corridor | Live weather: moderate flood risk (6.2mm precip)'),
    ], 1.18),
  },
  {
    id: 'S29', label: '⚠ Bridge Bottleneck: Amingaon → Bonda (Saraighat Diversion)', group: 'Climate Risk',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.amingaon, NODES.northGhy, 10.4, 40, 11500, 18000, 0.28, true,
         'Saraighat Bridge river crossing bottleneck & monsoon waterlogging advisory'),
      leg(2, NODES.northGhy, NODES.bonda,    14.6, 44,  5750, 18000, 0.28, true,
         'Brahmaputra Floodplain Inundation Zone'),
    ], 1.22),
  },
  {
    id: 'S30', label: '⚠ Full Monsoon Gauntlet: Betkuchi → Amingaon → Bonda (All 3 Corridors)', group: 'Climate Risk',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon, 18.5, 58, 15000, 18000, 0.38, true,
         'Saraighat Bridge bottleneck | Live weather: high flood risk (19.8mm precip, 52 km/h wind)'),
      leg(2, NODES.amingaon, NODES.northGhy, 10.4, 42,  7500, 18000, 0.28, true,
         'North Bank low-lying seasonal flood hazard zone'),
      leg(3, NODES.northGhy, NODES.bonda,    14.6, 48,  3750, 18000, 0.28, true,
         'Brahmaputra Floodplain Inundation Zone | Live weather: high flood risk'),
    ], 1.32),
  },

  // ── EV TRUCK ROUTES (31–36) ───────────────────────────────────────────────
  {
    id: 'S31', label: '⚡ EV: Betkuchi → Amingaon → Paltan (Zero-Emission Loop)', group: 'EV Truck',
    vehicle: VEHICLES.ev202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon, 18.5, 42, 12500, 14000, 0.05, false, '', true),
      leg(2, NODES.amingaon, NODES.paltan,   14.2, 32,  6000, 14000, 0.05, false, '', true),
      leg(3, NODES.paltan,   NODES.betkuchi, 12.8, 30,     0, 14000, 0.05, false, '', true),
    ], 2.8),
  },
  {
    id: 'S32', label: '⚡ EV: LGBI Cold Chain Vaccine Run (Apex E-Force One)', group: 'EV Truck',
    vehicle: VEHICLES.ev601,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.lgbi,  24.8, 38, 3600, 14000, 0.05, false, '', true),
      leg(2, NODES.lgbi, NODES.betkuchi,  24.8, 36,    0, 14000, 0.05, false, '', true),
    ], 3.1),
  },
  {
    id: 'S33', label: '⚡ EV: Refinery → Khanapara → Sonapur (Clean East Corridor)', group: 'EV Truck',
    vehicle: VEHICLES.ev202,
    routeResult: route([
      leg(1, NODES.refinery,  NODES.khanapara,  8.9, 22, 11000, 14000, 0.05, false, '', true),
      leg(2, NODES.khanapara, NODES.sonapur,    22.4, 38, 11000, 14000, 0.05, false, '', true),
    ], 2.6),
  },
  {
    id: 'S34', label: '⚡ EV: North Guwahati Ferry → Bonda → Changsari', group: 'EV Truck',
    vehicle: VEHICLES.ev601,
    routeResult: route([
      leg(1, NODES.northGhy,  NODES.bonda,     14.6, 36, 8000, 14000, 0.05, false, '', true),
      leg(2, NODES.bonda,     NODES.changsari,  34.2, 52, 4000, 14000, 0.05, false, '', true),
    ], 2.9),
  },
  {
    id: 'S35', label: '⚡ EV 4-Stop Urban: Betkuchi → Bamunimaidam → Narengi → Refinery → Khanapara', group: 'EV Truck',
    vehicle: VEHICLES.ev202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.bamuni,    11.2, 26, 13000, 14000, 0.05, false, '', true),
      leg(2, NODES.bamuni,   NODES.narengi,    8.7, 21,  9000, 14000, 0.05, false, '', true),
      leg(3, NODES.narengi,  NODES.refinery,   7.3, 19,  5000, 14000, 0.05, false, '', true),
      leg(4, NODES.refinery, NODES.khanapara,  8.9, 22,  2000, 14000, 0.05, false, '', true),
    ], 3.2),
  },
  {
    id: 'S36', label: '⚡ EV Highway: Guwahati → Nagaon (Long-Range EV Test)', group: 'EV Truck',
    vehicle: VEHICLES.ev202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.sonapur,  28.4, 42, 12000, 14000, 0.05, false, '', true),
      leg(2, NODES.sonapur,  NODES.nagaon,   96.5, 118, 12000, 14000, 0.05, false, '', true),
    ], 2.4),
  },

  // ── COLD CHAIN / TIME-SENSITIVE (37–41) ───────────────────────────────────
  {
    id: 'S37', label: '🧊 Cold Chain: Betkuchi → LGBI Vaccine Express (2h SLA)', group: 'Cold Chain',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.lgbi, 24.8, 35, 3600, 14000, 0.05, false, ''),
    ], 1.08),
  },
  {
    id: 'S38', label: '🧊 Pharma Multi-Drop: Betkuchi → LGBI → Azara → Jalukbari', group: 'Cold Chain',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.lgbi,      24.8, 35, 8400, 14000, 0.05, false, ''),
      leg(2, NODES.lgbi,     NODES.azara,       9.3, 22, 4200, 14000, 0.05, false, ''),
      leg(3, NODES.azara,    NODES.jalukbari,   8.1, 20, 2100, 14000, 0.05, false, ''),
    ], 1.10),
  },
  {
    id: 'S39', label: '🧊 Nalbari Cold Store → Betkuchi (Agri-Export Perishables)', group: 'Cold Chain',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.nalbari,  NODES.rangiya,   38.6, 52, 11200, 14000, 0.05, false, ''),
      leg(2, NODES.rangiya,  NODES.betkuchi,  64.2, 76, 11200, 14000, 0.05, false, ''),
    ], 1.08),
  },
  {
    id: 'S40', label: '🧊 Hospital Supply Priority: Betkuchi → Narengi Cantonment (Medical)', group: 'Cold Chain',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.narengi, 7.9, 18, 4800, 14000, 0.05, false, ''),
    ], 1.05),
  },
  {
    id: 'S41', label: '🧊 Jorhat Tea Cold-Chain: Betkuchi → Jorhat (Timed Departure)', group: 'Cold Chain',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.nagaon,  125.4, 142, 9600, 14000, 0.05, false, ''),
      leg(2, NODES.nagaon,   NODES.jorhat,   82.1,  95, 9600, 14000, 0.05, false, ''),
    ], 1.08),
  },

  // ── EXPRESS SINGLE-STOP (42–46) ───────────────────────────────────────────
  {
    id: 'S42', label: 'Express: Betkuchi → ICD Amingaon Direct', group: 'Express',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon, 18.5, 38, 17500, 18000, 0.05, false, ''),
    ], 1.12),
  },
  {
    id: 'S43', label: 'Express: Betkuchi → Guwahati Railway Goods Yard', group: 'Express',
    vehicle: VEHICLES.hw202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.guwhatirly, 8.4, 20, 14000, 18000, 0.05, false, ''),
    ], 1.10),
  },
  {
    id: 'S44', label: 'Express: Adabari → Khanapara Direct', group: 'Express',
    vehicle: VEHICLES.mv301,
    routeResult: route([
      leg(1, NODES.adabari, NODES.khanapara, 18.6, 35, 12800, 14000, 0.05, false, ''),
    ], 1.10),
  },
  {
    id: 'S45', label: 'Express: Betkuchi → Sonapur (NH37 Express Shuttle)', group: 'Express',
    vehicle: VEHICLES.hw501,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.sonapur, 28.4, 38, 16000, 18000, 0.05, false, ''),
    ], 1.10),
  },
  {
    id: 'S46', label: 'Express: Changsari → Betkuchi Direct (Return Loaded)', group: 'Express',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.changsari, NODES.betkuchi, 18.4, 34, 15800, 18000, 0.05, false, ''),
    ], 1.10),
  },

  // ── COMPLEX MULTI-STOP (47–50) ────────────────────────────────────────────
  {
    id: 'S47', label: 'Complex 5-Stop: Betkuchi → Amingaon → Paltan → Bamunimaidam → Narengi → Khanapara', group: 'Complex',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon, 18.5, 40, 17800, 18000, 0.05, false, ''),
      leg(2, NODES.amingaon, NODES.paltan,   14.2, 32, 14000, 18000, 0.05, false, ''),
      leg(3, NODES.paltan,   NODES.bamuni,    9.1, 24, 10500, 18000, 0.05, false, ''),
      leg(4, NODES.bamuni,   NODES.narengi,   8.7, 22,  7000, 18000, 0.05, false, ''),
      leg(5, NODES.narengi,  NODES.khanapara, 12.4, 28,  3500, 18000, 0.05, false, ''),
    ], 1.15),
  },
  {
    id: 'S48', label: '⚠ Complex + Climate: 5-Stop Monsoon Gauntlet (Saraighat + Brahmaputra)', group: 'Complex',
    vehicle: VEHICLES.hw101,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon,  18.5, 55, 16500, 18000, 0.38, true,
         'Saraighat Bridge bottleneck | Live weather: high flood risk (17.4mm precip)'),
      leg(2, NODES.amingaon, NODES.northGhy,  10.4, 42,  9900, 18000, 0.28, true,
         'North Bank low-lying seasonal flood hazard zone'),
      leg(3, NODES.northGhy, NODES.bonda,     14.6, 46,  4950, 18000, 0.28, true,
         'Brahmaputra Floodplain Inundation Zone'),
      leg(4, NODES.bonda,    NODES.changsari,  34.2, 52, 2475, 18000, 0.05, false, ''),
      leg(5, NODES.changsari, NODES.betkuchi,  18.4, 38,    0, 18000, 0.05, false, ''),
    ], 1.30),
  },
  {
    id: 'S49', label: 'Complex EV 5-Stop: Betkuchi → Amingaon → Paltan → Adabari → Jalukbari → LGBI', group: 'Complex',
    vehicle: VEHICLES.ev202,
    routeResult: route([
      leg(1, NODES.betkuchi, NODES.amingaon,  18.5, 40, 13000, 14000, 0.05, false, '', true),
      leg(2, NODES.amingaon, NODES.paltan,    14.2, 32,  9500, 14000, 0.05, false, '', true),
      leg(3, NODES.paltan,   NODES.adabari,    8.9, 22,  7000, 14000, 0.05, false, '', true),
      leg(4, NODES.adabari,  NODES.jalukbari,  8.4, 21,  4500, 14000, 0.05, false, '', true),
      leg(5, NODES.jalukbari, NODES.lgbi,     12.8, 28,  2000, 14000, 0.05, false, '', true),
    ], 3.1),
  },
  {
    id: 'S50', label: 'Mega Route: Guwahati Hub → Bongaigaon → Nalbari → Rangiya → Changsari → Betkuchi', group: 'Complex',
    vehicle: VEHICLES.hw501,
    routeResult: route([
      leg(1, NODES.betkuchi,  NODES.bongaigaon, 146.6, 162, 17800, 18000, 0.05, false, ''),
      leg(2, NODES.bongaigaon, NODES.nalbari,   102.4, 118, 14000, 18000, 0.05, false, ''),
      leg(3, NODES.nalbari,   NODES.rangiya,     38.6,  50,  9000, 18000, 0.05, false, ''),
      leg(4, NODES.rangiya,   NODES.changsari,   52.4,  62,  4500, 18000, 0.05, false, ''),
      leg(5, NODES.changsari, NODES.betkuchi,    18.4,  34,     0, 18000, 0.05, false, ''),
    ], 1.18),
  },
];

// ─── Build final export ───────────────────────────────────────────────────────
export const MOCK_SCENARIOS = raw.map((s) => ({
  ...s,
  tripData: trip(s.routeResult, s.vehicle),
}));

export const SCENARIO_GROUPS = ['All', ...new Set(MOCK_SCENARIOS.map((s) => s.group))];

export function getScenarioById(id) {
  return MOCK_SCENARIOS.find((s) => s.id === id) || MOCK_SCENARIOS[0];
}
