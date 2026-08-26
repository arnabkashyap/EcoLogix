# Build Prompt for Antigravity IDE — EcoLogix

Paste everything below into Antigravity as the project brief. It's written so the agent plans before it codes, and locks scope so it doesn't quietly build the full production architecture instead of the hackathon cut.

---

## Project

Build **EcoLogix**, a B2B fleet route-optimization web app that treats CO₂ as a first-class routing objective alongside time, and finds cross-company "load-pooling" opportunities (one company's empty return leg carries another company's shipment for free).

This is a 2-day hackathon build. Optimize for a working, deployed, demoable product — not for production completeness. Before writing any code, produce a short implementation plan (file/module breakdown + order of work) and confirm it matches the phases below.

**One-line pitch to keep in mind for every UX decision:** *EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting.*

The two judging hooks the build must support:
1. It's multi-tenant from the ground up — two companies in the demo must be *provably* data-isolated, not just visually separated.
2. Every CO₂ number (route optimizer and load-pool matcher alike) traces back to **one shared emissions calculation function**, not separate guesses in two places.

---

## Definition of Done

The app must let someone, unprompted, in under 4 minutes:

1. Log in as two different mock companies and see each one's fleet/shipment data is completely separate.
2. Select a fleet + shipments for Company A and hit "Optimize."
3. See a route appear on a map within ~15 seconds, with a CO₂-saved number vs. a time-only baseline.
4. Move an α slider (fastest ↔ greenest) and see the route / Pareto chart respond.
5. Trigger a load-pool match between Company A and Company B — see a matched empty leg + shipment with CO₂/cost saved — and confirm Company B's other data is *not* visible to Company A.
6. Do all of this on a real deployed URL, not localhost.

Treat any of these six that can't be demoed live as the top priority, above polish.

---

## Scope Lock — build exactly this, nothing more

**Ships (Must + Should priority):**
- Mock dataset ingestion — vehicles, shipments, delivery windows, a congestion index — fully offline, no live API dependency
- Single-provider multi-stop route optimization: OR-Tools VRP, α-weighted time/CO₂ objective
- Emissions Model as **one pure, shared function** (used by both the optimizer and the matcher) — unit-test it, it's the credibility anchor
- Baseline (time-only, α=1) vs. optimized route comparison with a quantified `co2_saved_pct` (target ≥15–20%)
- Map view rendering both routes, visually distinguishable
- Pareto frontier: sweep α across {0, 0.25, 0.5, 0.75, 1.0}, plot (time, emissions) pairs, interactive slider that re-queues a recompute (target <2s, doesn't need to be instant)
- Cross-tenant load-pool matching — **simplified**: bounding-box proximity filter + time-window + capacity fit, top-N ranked list. **No PostGIS, no bipartite/Hungarian solver.**
- Multi-tenant data model: `tenant_id` on every domain table, enforced in every query
- Mock login (`/dev-login`) issuing a signed JWT — this is what proves tenant isolation live. **No real password auth / IdP.**
- A "how we calculated this" tooltip/panel on every CO₂ number (Explainability requirement)
- Deployed on a real HTTPS URL

**Explicitly does not ship — do not build these, and don't scaffold placeholders for them either:**
- Real authentication, IdP, or multi-tenant billing
- PostGIS / GIST spatial indexing for matching
- Bipartite optimal assignment (Hungarian algorithm) for load-pooling — top-N ranking is the demo-equivalent
- Row-Level Security at the DB layer — app-layer `tenant_id` filtering is sufficient
- Multi-region, autoscaling, read replicas, live traffic API, EV/diesel toggle, multimodal mode-shift flag, marketplace view

If asked "does this scale?", the answer is: async job queue already in place → worker replicas are a deploy change; `tenant_id` already on every query → RLS is a migration, not a rewrite; bounding-box matching → swapping in PostGIS/Hungarian is an algorithm change inside one endpoint. None of this needs to be built now — just keep the architecture honest so that story is true.

**Non-negotiable security rule:** `tenant_id` must come from the verified JWT on every request — never from the request body or a query param. This is the exact thing that must not be fakeable, since it's the tenant-isolation proof.

---

## System Design

```
React Dashboard ──HTTPS/JWT──► FastAPI (single container)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │               │
              Emissions Model   Postgres          Redis
              (in-process, sync)  (managed)        (job queue + cache)
                                                        │
                                                  1 worker process (RQ)
                                                  → Route Optimizer (OR-Tools, time-boxed)
                                                  → calls Emissions Model
```

Four deployables total: API container, worker container, managed Postgres, managed Redis.

**Tech stack:**
- Backend: Python + FastAPI
- Optimization: Google OR-Tools (VRP)
- Job queue: Redis + RQ, one worker process, hard time limit (10–15s) per optimize job
- DB: PostgreSQL (managed — Supabase or Neon). Skip PostGIS; do proximity via a simple bounding-box calc on lat/lng.
- Frontend: React + a map library (Leaflet or Mapbox GL) + Recharts for the Pareto chart
- Distance/time matrix: OSRM if self-hostable easily, otherwise a synthetic/haversine-based estimate — must work fully offline for demo reliability
- Deployment: Render, Fly.io, or Railway for API+worker; managed Postgres + Upstash Redis

---

## Data Model

`organizations` (tenants), `users`, `fleets`, `vehicles`, `shipments`, `routes`, `route_legs`, `emission_factors`, `load_pool_matches` — `tenant_id` on every domain table except shared reference data like `emission_factors`.

Key fields per PRD:
- `Vehicle`: id, fleet_id, type (van/MHCV/HCV/EV), fuel_profile, capacity_kg, current_location
- `Shipment`: id, origin, destination, weight_kg, volume, delivery_window_start/end, requesting_provider_id
- `Route`: id, vehicle_id, ordered_stops[], total_distance_km, total_time_min, total_co2_kg
- `RouteLeg`: route_id, from_stop, to_stop, distance_km, time_min, load_kg, co2_kg, mode
- `LoadPoolMatch`: empty_leg_id, matched_shipment_id, co2_saved_kg, cost_saved

---

## Core Algorithms

**Emissions Model (one shared function, diesel + EV branches):**
```
fuel_L = base_L_per_km(vehicle_type)
         × distance_km
         × (1 + load_factor × k_load)
         × (1 + congestion_index × k_congestion)

co2_kg = fuel_L × 2.68   // kg CO2 per liter diesel

// EV substitute:
co2_kg = distance_km × kwh_per_km × grid_emission_factor_kg_per_kwh
```
`base_L_per_km`, `k_load`, `k_congestion` are per-vehicle-profile constants — seed with plausible published or synthetic values and note them as assumptions in the "how we calculated this" UI.

**Pareto-optimal routing:**
1. Build a distance/time matrix between stops (OSRM or synthetic).
2. Weighted objective: `cost = α × normalized_time + (1 − α) × normalized_co2`.
3. Solve with OR-Tools for α ∈ {0, 0.25, 0.5, 0.75, 1.0}.
4. Plot resulting (time, emissions) pairs as the Pareto frontier.

**Load-pooling matching (simplified for hackathon):**
1. For each vehicle's planned return leg: capacity window = origin, destination, spare weight/volume, time window.
2. For each open shipment from another tenant: filter by bounding-box proximity, time-window overlap, capacity fit.
3. Score by CO₂ avoided (marginal CO₂ of adding to existing leg vs. a new dedicated trip) and cost saved.
4. Return top-N ranked matches — no bipartite/double-booking solver needed for the demo.

---

## API Design (representative)

```
POST /api/v1/dev-login                body: { company: "A" | "B" } → { token }
POST /api/v1/routes/optimize          body: { vehicle_ids, shipment_ids, alpha } → { job_id }
GET  /api/v1/jobs/{id}                → { status, result: { route, baseline_route, co2_saved_pct } }
GET  /api/v1/routes/pareto            query: vehicle_id, shipment_ids → [{ alpha, time_min, co2_kg }]
POST /api/v1/emissions/estimate       body: { vehicle_type, distance_km, load_kg, congestion_index } → { fuel_L, co2_kg }
POST /api/v1/loadpool/match           body: {} (tenant inferred from JWT) → [{ empty_leg_id, matched_shipment_id, co2_saved_kg, cost_saved }]
```

Every route above (except dev-login) must resolve `tenant_id` from the JWT server-side.

---

## Build Phases (plan the work in this order; adapt hour estimates to how the agent actually works, but keep the sequence)

**Phase 1 — Backend core, no UI:**
1. Repo scaffold + docker-compose (Postgres, Redis, API skeleton)
2. Schema + migrations with `tenant_id` on every domain table
3. `/dev-login` + JWT middleware — reject invalid/missing tokens, resolve `tenant_id` server-side only
4. Emissions Model as a pure function + unit tests (3–4 cases minimum)
5. Route Optimizer: OR-Tools VRP wired to the Emissions Model, wrapped as an RQ job with a hard time limit
6. Job-status polling endpoint + seed script with 2 demo companies and realistic fleets/shipments
7. **Exit check:** curl/Postman can optimize a route for either tenant end-to-end and results are isolated by tenant

**Phase 2 — Frontend, load-pooling, deploy:**
1. React scaffold, login screen against `/dev-login`, auth-aware API client
2. Map view (baseline + optimized route) + Pareto chart with α slider triggering re-optimize
3. Job-status polling UI (no dead spinners)
4. Load-pool endpoint (bounding-box + top-N) + a matches panel in the UI, tested for cross-tenant visibility leaks
5. Deploy: managed Postgres + Redis + API/worker containers to a real HTTPS URL
6. Seed realistic-looking demo data (real coordinates/addresses, not "Stop A/B/C")
7. **Exit check:** run through the full Definition of Done checklist twice in a row on the deployed URL

---

## Demo Script (build the UI so this flow is smooth)

1. Log in as Company A ("Northwind Logistics") — dashboard is fresh/isolated for this tenant.
2. Log in as Company B in a second session — different fleet/shipments visible. This is the tenant-isolation proof; don't let it be flaky.
3. Company A: select fleet + shipments, hit Optimize — real ~10s solve, not a canned result.
4. Route appears on map next to time-only baseline, with CO₂-saved number.
5. Move the α slider — Pareto chart and route respond.
6. Load Pool tab: trigger a match — Company A sees a matched empty leg from Company B with savings, but nothing else of Company B's data.

---

## Non-Functional Requirements

- Route optimization for ≤20 stops completes in <5s (10–15s hard cap on the job as a safety margin)
- App must run fully on cached/mock data — zero required live external API calls
- Every CO₂ figure must be traceable via a visible "how we calculated this" affordance
- Pareto slider recompute target: <2s perceived latency

---

**Instruction to the agent:** Start by restating this as a short plan (phases, files, and the order you'll build them in), confirm the scope lock items you will *not* build, then proceed phase by phase, checking off the Definition of Done items as they become demonstrable.
