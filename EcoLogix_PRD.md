# EcoLogix
## Multimodal Supply Chain Route & Carbon-Aware Logistics Engine
### Product Requirements Document (PRD) — Hackathon Prototype

| | |
|---|---|
| **Version** | 0.1 (Draft) |
| **Date** | August 26, 2026 |
| **Status** | Ready for build |
| **Owner** | EcoLogix Team |
| **Doc type** | Hackathon PRD — scoped for a working demo, not a production spec |

> **Assumptions made in this draft:** a team of 4–5 people, a ~36-hour build window (typical for most hackathons), and no paid/enterprise API access beyond free-tier mapping and traffic APIs. Adjust Section 13 (Timeline) and Section 8 (Tech Stack) if your actual constraints differ.

---

## 1. Executive Summary

EcoLogix is a B2B route-optimization engine that treats **carbon emissions as a first-class routing objective**, alongside transit time and cost. It ingests fleet telemetry, delivery windows, and traffic conditions to model fuel/energy consumption per route segment, computes a **Pareto-optimal frontier of routes** (fast vs. clean vs. cheap), and identifies **load-pooling opportunities** across logistics providers so that return legs don't have to run empty.

The hackathon deliverable is a working prototype that ingests a mock (or lightly real) dataset of vehicles, shipments, and delivery windows, computes optimized vs. baseline routes, visualizes the trade-off between speed and emissions, and demonstrates at least one cross-provider load-pooling match.

---

## 2. Problem Statement

Freight and logistics is a disproportionate contributor to transport-related carbon emissions, and a large share of that impact is avoidable:

- **Empty (deadhead) miles are pervasive.** Independent studies place empty miles at roughly **15–35% of all truck miles**, with recent large-scale carrier data (Uber Freight, 2023) measuring around **25%** on a digital brokerage network — and estimating that up to **64% of empty miles could be eliminated** through better network-level optimization.
- **Freight is a major and growing emissions source.** Transport accounts for roughly **a fifth to a quarter of global CO₂ emissions**, and freight movement alone is estimated at around **10% of global CO₂ emissions** — with global freight demand projected to roughly **double by 2050**.
- **Road freight is the dominant mode by emissions**, even though rail and intermodal alternatives emit a small fraction per ton-mile — meaning smarter mode selection, not just route selection, has real carbon upside.
- **Routing systems today optimize for time or distance, not carbon.** Most commercial route planners minimize transit time or mileage and treat vehicle load, fuel-efficiency profile, and empty-leg matching as afterthoughts (or ignore them entirely).
- **Providers plan in silos.** Carrier A's empty return leg and Carrier B's unfulfilled shipment request often exist in the same lane at the same time, but there's no shared layer that matches them.

**Net effect:** more fuel burned, more CO₂ emitted, and more cost than necessary — for outcomes that are largely fixable with better data and optimization, not new infrastructure.

---

## 3. Goals & Objectives

### Primary goal (hackathon-scoped)
Prove that a routing engine which explicitly optimizes for **carbon emissions alongside time** — and that surfaces **cross-provider load-pooling** — produces materially better outcomes than time-only routing, using a live, demoable prototype.

### Success criteria for the demo
- Optimized routes show a **measurable, displayed CO₂ reduction** (target: ≥15–20%) vs. a naive/baseline routing approach on the same dataset.
- A **Pareto frontier** (time vs. emissions) is visualized and interactively explorable.
- At least **one concrete load-pooling match** is generated and shown end-to-end (empty leg → matched shipment → emissions saved).
- The system runs on a self-contained demo dataset with no live-API dependency required to present.

### Non-goals (out of scope for the hackathon)
- Production-grade authentication, multi-tenant billing, or provider onboarding flows.
- Real-time integration with live carrier telemetry systems (ELD/TMS) — mocked/simulated telemetry is acceptable.
- Full multimodal booking/settlement (rail/ocean carrier contracts) — model mode choice, don't build a booking engine.
- Mobile driver app. Web dashboard only.
- Legally certified carbon accounting (e.g., GLEC Framework audit-grade reporting) — directionally correct estimates are sufficient.

---

## 4. Target Users & Personas

| Persona | Role | Core need |
|---|---|---|
| **Fleet Operations Manager** | Plans daily multi-stop routes for an owned fleet | Minimize cost/time without ignoring emissions targets set by leadership |
| **Sustainability / ESG Lead** | Reports on Scope 3 logistics emissions | Needs visibility into emissions per shipment/route and a lever to reduce them |
| **Freight Broker / 3PL Coordinator** | Matches shippers to available carrier capacity | Wants to fill empty legs profitably and reduce deadhead cost |
| **Shipper / Dispatcher** | Books shipments across one or more carriers | Wants delivery-window compliance at the lowest cost/emissions combination |

---

## 5. User Stories

1. *As a Fleet Operations Manager*, I want to input today's delivery stops and vehicle list so the system recommends a route that meets time windows while minimizing carbon output.
2. *As a Sustainability Lead*, I want to see estimated kg CO₂ per route and per shipment so I can report on emissions reductions.
3. *As a Fleet Operations Manager*, I want to adjust a slider between "fastest" and "greenest" so I can pick the trade-off that fits today's priorities.
4. *As a Freight Broker*, I want the system to flag when my truck's return leg passes near another provider's pending shipment, so I can propose a pooled load instead of running empty.
5. *As a Dispatcher*, I want the system to suggest a rail or intermodal leg for a long-haul segment when it meaningfully cuts emissions without breaking the delivery window.

---

## 6. Solution Overview

EcoLogix has four cooperating layers:

1. **Ingestion layer** — accepts fleet telemetry (vehicle type, fuel/energy profile, current location), shipment orders (origin, destination, weight, delivery window), and traffic/road data (live API or cached/simulated).
2. **Modeling layer** — computes fuel/energy consumption and CO₂ output per candidate route segment, accounting for vehicle profile, load, congestion, and (optionally) transport mode.
3. **Optimization layer** — solves a multi-stop, multi-objective routing problem (time vs. emissions vs. cost), producing a Pareto frontier of route options rather than a single "best" route.
4. **Pooling layer** — matches empty/underutilized legs across providers against open shipment requests within compatible time windows and capacity, ranked by emissions and cost saved.

A dashboard ties it together: map view of baseline vs. optimized routes, a trade-off slider/chart, and a load-pooling match panel.

---

## 7. System Architecture

```
                     ┌─────────────────────┐
                     │   Web Dashboard      │
                     │  (React + Map + Charts)│
                     └──────────┬──────────┘
                                │ REST/JSON
                     ┌──────────▼──────────┐
                     ┌──────────▼──────────┘
                     │     API Gateway       │
                     │     (FastAPI)         │
                     └──────────┬──────────┘
           ┌────────────────────┼────────────────────┐
           │                    │                     │
 ┌─────────▼────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
  │ Emissions Model   │ │ Route Optimizer    │ │ Load-Pooling Engine│
  │ (fuel/CO2 calc)   │ │ (Exact VRP +       │ │ (bipartite match   │
  │                   │ │  Pareto sweep)     │ │  on empty legs)    │
 └─────────┬────────┘ └─────────┬─────────┘ └─────────┬─────────┘
           │                    │                     │
           └────────────────────┼─────────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │  PostgreSQL + PostGIS   │
                     │ (fleets, shipments,     │
                     │  routes, telemetry)     │
                     └───────────┬───────────┘
                                 │
                     ┌───────────▼───────────┐
                     │ External APIs (or mocks)│
                     │ Maps/Distance/Traffic    │
                     └─────────────────────────┘
```

---

## 8. Core Algorithms

### 8.1 Fuel & carbon emissions model
For a road segment:

```
fuel_L = base_L_per_km(vehicle_type)
         × distance_km
         × (1 + load_factor × k_load)
         × (1 + congestion_index × k_congestion)

co2_kg = fuel_L × emission_factor_fuel   // e.g., ~2.68 kg CO2 per liter diesel (standard combustion factor)
```

For electric vehicles, substitute an energy term:
```
co2_kg = distance_km × kwh_per_km × grid_emission_factor_kg_per_kwh
```

`base_L_per_km`, `k_load`, and `k_congestion` are per-vehicle-profile constants (seed with published fuel-efficiency figures or synthetic values; note them as assumptions in the demo).

### 8.2 Pareto-optimal multi-stop routing
1. Build a distance/time matrix between all stops (OSRM or Maps Distance Matrix API; cache aggressively).
2. Frame each candidate route's cost as a weighted objective:
   `cost = α × normalized_time + (1 − α) × normalized_co2`
3. Solve the resulting VRP with an exact combinatorial solver (optimal for ≤9 stops) or nearest-neighbor heuristic for a range of `α` values (e.g., 0, 0.25, 0.5, 0.75, 1.0).
4. Plot the resulting (time, emissions) pairs — this is the Pareto frontier shown to the user, who picks a point instead of a single "optimal" answer.
5. *(Stretch)* Replace the weighted-sum sweep with a proper multi-objective solver (e.g., NSGA-II via DEAP) for a smoother, non-linear frontier.

### 8.3 Load-pooling / backhaul matching
1. For every vehicle's planned return leg, define a "capacity window": origin, destination, available weight/volume, time window.
2. For every open shipment request, check compatibility: geographic proximity to the leg's path (buffer radius), time-window overlap, capacity fit.
3. Score compatible matches by **emissions avoided** (i.e., the marginal CO₂ of adding this shipment to an already-scheduled leg vs. running it as a new dedicated trip) and by cost saved.
4. Solve as a weighted bipartite matching problem (Hungarian algorithm via `scipy.optimize.linear_sum_assignment`) to assign shipments to empty legs without double-booking capacity.

### 8.4 Multimodal mode selection (stretch goal)
For long-haul legs above a distance threshold, evaluate a rail/intermodal alternative using published (or synthetic) per-ton-km emission factors for road vs. rail, and recommend a mode switch when it cuts emissions materially without breaking the delivery window — even if it's not bookable in the MVP.

---

## 9. Data Model (key entities)

| Entity | Key fields |
|---|---|
| `Fleet` / `Provider` | id, name, home_depot_location |
| `Vehicle` | id, fleet_id, type (van/MHCV/HCV/EV), fuel_profile, capacity_kg, current_location |
| `Shipment` | id, origin, destination, weight_kg, volume, delivery_window_start/end, requesting_provider_id |
| `Route` | id, vehicle_id, ordered_stops[], total_distance_km, total_time_min, total_co2_kg |
| `RouteLeg` | route_id, from_stop, to_stop, distance_km, time_min, load_kg, co2_kg, mode |
| `TrafficSegment` | road_segment_id, congestion_index, timestamp |
| `EmissionFactor` | vehicle_type/fuel_type, kg_co2_per_unit |
| `LoadPoolMatch` | empty_leg_id, matched_shipment_id, co2_saved_kg, cost_saved |

---

## 10. API Design (representative endpoints)

```
POST /api/v1/routes/optimize
  body: { vehicle_ids: [...], shipment_ids: [...], alpha: 0.5 }
  returns: { route: {...}, baseline_route: {...}, co2_saved_pct, pareto_points: [...] }

GET  /api/v1/routes/pareto?vehicle_id=&shipment_ids=
  returns: [{ alpha, time_min, co2_kg }, ...]

POST /api/v1/emissions/estimate
  body: { vehicle_type, distance_km, load_kg, congestion_index }
  returns: { fuel_L, co2_kg }

POST /api/v1/loadpool/match
  body: { provider_ids: [...] }
  returns: [{ empty_leg_id, matched_shipment_id, co2_saved_kg }, ...]

GET  /api/v1/fleet/{id}/telemetry
  returns: [{ vehicle_id, location, timestamp, speed }, ...]
```

---

## 11. Tech Stack (hackathon-appropriate)

| Layer | Choice | Why |
|---|---|---|
| Backend API | Python + FastAPI | Fast to build, async-friendly, great for a data/optimization-heavy backend |
| Routing/distance | OSRM (self-hosted) or Maps Distance Matrix API | Free/open options exist; OSRM avoids API rate limits during demo |
| Optimization | Exact combinatorial VRP solver / heuristic fallback, `scipy` (Hungarian matching), optionally DEAP (NSGA-II) | Battle-tested, well-documented, Python-native |
| Database | PostgreSQL + PostGIS | Geospatial queries (proximity, buffers) needed for pooling matches |
| Frontend | React + Mapbox GL / Leaflet + Recharts | Map visualization + Pareto frontier chart |
| Mock data | Python generator scripts | Removes dependency on live carrier telemetry for the demo |
| Deployment | Docker Compose (local) | Simplicity over scalability for a hackathon |

---

## 12. MVP Feature Scope (MoSCoW)

**Must-have**
- Mock dataset ingestion (vehicles, shipments, delivery windows)
- Single-provider multi-stop route optimization (time vs. CO₂ weighted objective)
- Emissions calculator per route/segment
- Map view: baseline (naive) route vs. optimized route, with CO₂ and time comparison

**Should-have**
- Interactive Pareto frontier (α slider) with live route recompute
- Cross-provider load-pooling: at least one working empty-leg-to-shipment match, shown end-to-end

**Could-have (stretch, time-permitting)**
- Live traffic API integration instead of static/simulated congestion
- EV vs. diesel vehicle-profile comparison toggle
- Multimodal (road→rail) mode-shift recommendation on long-haul legs
- Simple multi-provider "marketplace" view of open shipments and available capacity

**Won't-have (this hackathon)**
- Real carrier onboarding/auth, billing, production deployment, mobile app

---

## 13. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | System shall accept a set of vehicles and shipments and produce an optimized route per vehicle | Must |
| FR-2 | System shall compute estimated fuel consumption and CO₂ output per route segment | Must |
| FR-3 | System shall display a baseline (time-only) route alongside the emissions-optimized route with a quantified comparison | Must |
| FR-4 | System shall let the user adjust a time-vs-emissions weighting and see the route update | Should |
| FR-5 | System shall identify and display at least one cross-provider load-pooling opportunity | Should |
| FR-6 | System shall visualize routes on a map with distinguishable baseline/optimized paths | Must |
| FR-7 | System shall flag long-haul legs where a mode shift (road→rail) would meaningfully cut emissions | Could |

---

## 14. Non-Functional Requirements

- **Performance:** route optimization for ≤20 stops should complete in under ~5 seconds for a smooth demo.
- **Reliability:** system must run fully on cached/mock data with zero live external API calls, as a fallback for demo-day connectivity issues.
- **Usability:** the CO₂-savings number and Pareto trade-off must be understandable to a non-technical judge within 10 seconds of looking at the dashboard.
- **Explainability:** every emissions figure shown should be traceable to the underlying formula/assumptions (tooltip or "how we calculated this" panel) — judges and sustainability personas will ask.

---

## 15. Success Metrics / KPIs (for the demo)

| Metric | Target for demo |
|---|---|
| CO₂ reduction vs. baseline routing | ≥15–20% on sample dataset |
| Empty-mile reduction via pooling | At least 1 concrete match shown, with % of that leg's distance converted from empty to loaded |
| Route computation time | < 5 seconds for demo-sized dataset |
| Pareto frontier responsiveness | Route recompute on slider change < 2 seconds |

---

## 16. Demo Flow (judging narrative)

1. **Hook (30s):** State the problem with the emissions/empty-miles stats from Section 2.
2. **Baseline (30s):** Show a naive, time-only optimized route for a sample set of stops — note its CO₂ total.
3. **EcoLogix optimization (60s):** Run the same stops through EcoLogix; show the Pareto frontier; move the slider from "fastest" to "greenest" and watch the map/route and CO₂ number update live.
4. **Load-pooling (45s):** Show two providers' schedules; highlight an empty return leg; show it matched to another provider's pending shipment; show the CO₂ and cost saved.
5. **(Stretch) Multimodal (15s):** Show one long-haul leg flagged for a rail-shift recommendation.
6. **Close (30s):** Recap the numbers (X% CO₂ saved, Y empty miles eliminated) and the roadmap (Section 18).

---

## 17. Build Timeline (assumed ~36-hour hackathon)

| Hours | Focus |
|---|---|
| 0–3 | Team setup, repo scaffolding, mock-data schema design, API contract agreement |
| 3–9 | Emissions model + distance/time matrix integration (OSRM or Maps API) |
| 9–16 | Route optimizer (exact combinatorial solver) + Pareto sweep across α values |
| 16–22 | Load-pooling matching engine (bipartite/Hungarian) |
| 22–28 | Frontend dashboard: map, baseline vs. optimized comparison, Pareto chart |
| 28–32 | Integration pass — connect frontend to live API responses, fix seams |
| 32–34 | Polish: tooltips, "how we calculated this," demo dataset curation |
| 34–36 | Demo rehearsal, backup video recording, pitch deck |

*(If your event is 24 or 48 hours, compress or extend proportionally — keep Must-haves inside the first ~70% of the window.)*

---

## 18. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Live traffic/maps API rate limits or outage during demo | Pre-cache all demo-route API responses; ship a fully offline fallback dataset |
| VRP solver too slow or doesn't converge in time budget | Cap stops per demo scenario (~15–20); use exact solver for ≤9 stops and heuristic fallback for larger counts |
| Emissions formula looks arbitrary to judges | Keep formula visible/explainable in-UI; cite standard emission factors rather than inventing numbers |
| Load-pooling has no real second provider's data | Simulate a second mock fleet/provider dataset — judges care about the mechanism, not live carrier partnerships |
| Scope creep (multimodal, live APIs, marketplace) eats core build time | Treat Section 12's Must-haves as the only committed scope until they're done and demo-stable |

---

## 19. Future Roadmap (post-hackathon)

- Real integrations with TMS/ELD providers (e.g., via project44, FourKites-style data feeds) for live telemetry.
- A genuine multi-provider marketplace with bidding/settlement for pooled loads, not just matching.
- ML-trained fuel/emissions model calibrated on real fleet telemetry instead of static coefficients.
- Full multimodal booking across road, rail, and short-sea legs with schedule integration.
- Auditable, standards-aligned carbon reporting (e.g., aligned to the GLEC Framework) for enterprise ESG use.

---

## 20. Sources referenced for problem-statement figures

- Uber Freight — "The journey to fuel efficiency" (empty-miles estimates, network optimization potential)
- Einride / ATRI-sourced data — "Driving sustainability: Reducing empty miles in road freight"
- International Council on Clean Transportation (ICCT) — "Beyond trucks: Toward a greener global freight transportation system"
- Our World in Data — "Cars, planes, trains: where do CO₂ emissions from transport come from?"

*(Figures are industry estimates with real variance across studies/years — treat them as directionally correct for a pitch, not audited statistics.)*
