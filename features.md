# EcoLogix — Features

**Companion to:** EcoLogix PRD v0.1 (Hackathon Prototype)
**Source:** PRD Sections 5 (User Stories), 12 (MoSCoW), 13 (Functional Requirements)

---

## 1. Feature List by Priority (MoSCoW)

### Must-Have — demo does not work without these

| # | Feature | What it does | Linked FR |
|---|---|---|---|
| M1 | Mock dataset ingestion | Load a self-contained set of vehicles, shipments, and delivery windows with zero live-API dependency | FR-1 |
| M2 | Single-provider multi-stop route optimization | Given a vehicle list + shipment/stop list, compute an optimized route using a time-vs-CO₂ weighted objective (exact combinatorial solver / heuristic fallback) | FR-1, FR-4 |
| M3 | Emissions calculator | Compute estimated fuel (L) and CO₂ (kg) per route segment, based on vehicle profile, load, and congestion | FR-2 |
| M4 | Baseline vs. optimized comparison | Show a naive time-only route next to the emissions-optimized route with a quantified CO₂/time delta | FR-3 |
| M5 | Map visualization | Render both routes on a map with visually distinguishable paths (e.g., color-coded baseline vs. optimized) | FR-6 |

### Should-Have — strongly wanted for a competitive demo

| # | Feature | What it does | Linked FR |
|---|---|---|---|
| S1 | Interactive Pareto frontier | Plot the (time, emissions) trade-off curve across α = 0 → 1 and let the user pick a point | FR-4 |
| S2 | Fastest ↔ greenest slider | A single α slider that re-runs optimization live and updates the map/route/CO₂ number | FR-4 |
| S3 | Cross-provider load-pooling match | Detect at least one empty return leg that can be matched to another provider's open shipment, shown end-to-end (empty leg → match → CO₂/cost saved) | FR-5 |

### Could-Have — stretch goals if time allows

| # | Feature | What it does | Linked FR |
|---|---|---|---|
| C1 | Live traffic API integration | Replace static/simulated congestion index with a real traffic feed | — |
| C2 | EV vs. diesel comparison toggle | Swap a vehicle's fuel profile between electric and diesel and see the emissions delta | — |
| C3 | Multimodal mode-shift flag | Flag long-haul legs where switching road → rail would meaningfully cut emissions without breaking the delivery window | FR-7 |
| C4 | Multi-provider marketplace view | Simple listing of open shipments and available capacity across all mock providers | — |

### Won't-Have — explicitly out of scope for this hackathon

- Real carrier onboarding / authentication / multi-tenant billing
- Live ELD/TMS telemetry integration
- Full multimodal booking/settlement engine
- Mobile driver app
- Legally certified / audit-grade carbon accounting

---

## 2. Feature Detail — User-Facing Behavior

### M1 — Mock Dataset Ingestion
- Loads vehicles (type, fuel/energy profile, capacity, home depot), shipments (origin, destination, weight, delivery window), and a traffic/congestion layer (live or simulated).
- Works fully offline — this is what makes the demo resilient to venue Wi-Fi problems.

### M2 — Route Optimization
- Input: a set of vehicle IDs + shipment/stop IDs + an α weighting (0 = pure time, 1 = pure emissions).
- Output: an ordered stop sequence per vehicle, with total distance, time, and CO₂.
- Solved via an exact combinatorial solver (optimal for ≤9 stops), or a greedy nearest-neighbor heuristic fallback above that.

### M3 — Emissions Calculator
- Per-segment fuel/CO₂ estimate driven by vehicle type, distance, load factor, and congestion index (diesel formula), or distance × kWh/km × grid factor (EV formula).
- Every emissions number shown in the UI must be traceable to this formula (a "how we calculated this" tooltip), per the PRD's Explainability requirement.

### M4 — Baseline vs. Optimized Comparison
- Runs the same stop set at α = 1 (time-only) to produce the "naive" baseline.
- Displays both routes' totals side by side with a computed `co2_saved_pct` — target ≥15–20% for the demo.

### M5 — Map Visualization
- Two route paths on one map, clearly distinguishable (color/style), so a judge can tell baseline from optimized at a glance.

### S1/S2 — Pareto Frontier + Slider
- Backend sweeps α across a fixed set of values (0, 0.25, 0.5, 0.75, 1.0) and returns each (time, emissions) pair.
- Frontend plots this as a curve; dragging the slider both selects a frontier point and triggers a live recompute (target: <2s response).

### S3 — Load-Pooling Match
- Identifies a vehicle's empty/underused return leg (a "capacity window": origin, destination, spare weight/volume, time window).
- Checks every open shipment request from other mock providers for geographic proximity, time-window overlap, and capacity fit.
- Scores compatible pairs by CO₂ avoided (new dedicated trip vs. added-to-existing-leg) and cost saved, then solves as a bipartite assignment so no leg is double-booked.
- Demo shows the full story: this empty leg → this shipment → this much CO₂ and cost saved.

### C1–C4 — Stretch Features
- **C1 Live traffic:** swap the static congestion index for a real-time traffic API feed, same downstream formula.
- **C2 EV/diesel toggle:** re-runs the emissions calculator with a different vehicle profile against the same route.
- **C3 Mode-shift flag:** for long-haul legs above a distance threshold, compares road vs. rail per-ton-km emission factors and flags a recommendation (informational only — not bookable).
- **C4 Marketplace view:** read-only list of all providers' open shipments and spare capacity, mostly useful as a visual backdrop for explaining the pooling mechanism.

---

## 3. User Stories → Feature Mapping

| User Story (PRD §5) | Persona | Feature(s) that satisfy it |
|---|---|---|
| Input today's stops/vehicles → get a route that meets time windows while minimizing carbon | Fleet Ops Manager | M1, M2, M3 |
| See estimated kg CO₂ per route/shipment for reporting | Sustainability/ESG Lead | M3, M4 |
| Slide between "fastest" and "greenest" | Fleet Ops Manager | S1, S2 |
| Get flagged when a return leg passes near another provider's pending shipment | Freight Broker/3PL Coordinator | S3 |
| Get a rail/intermodal suggestion for a long-haul segment when it meaningfully cuts emissions | Dispatcher | C3 |

---

## 4. Functional Requirements Traceability (PRD §13)

| ID | Requirement | Priority | Feature(s) |
|---|---|---|---|
| FR-1 | Accept vehicles + shipments, produce optimized route per vehicle | Must | M1, M2 |
| FR-2 | Compute estimated fuel consumption and CO₂ per route segment | Must | M3 |
| FR-3 | Display baseline (time-only) route alongside emissions-optimized route with quantified comparison | Must | M4 |
| FR-4 | Let user adjust time-vs-emissions weighting and see route update | Should | S1, S2 |
| FR-5 | Identify and display at least one cross-provider load-pooling opportunity | Should | S3 |
| FR-6 | Visualize routes on a map with distinguishable baseline/optimized paths | Must | M5 |
| FR-7 | Flag long-haul legs where a road→rail mode shift would meaningfully cut emissions | Could | C3 |

---

## 5. Demo-Readiness Checklist

Use this to sanity-check build progress against what the judging flow (PRD §16) actually needs:

- [ ] M1–M5 fully working end-to-end on the offline mock dataset (this alone supports a full demo)
- [ ] S1/S2 slider is smooth and recomputes in <2s
- [ ] S3 produces at least one visually clear pooling match
- [ ] Every CO₂ number has a visible "how we calculated this" affordance
- [ ] Backup demo video recorded in case of live-demo failure (PRD §17, hours 34–36)
