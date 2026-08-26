# Follow-Up Build Prompt for Antigravity IDE — EcoLogix

Paste everything below into Antigravity as the task brief. This is **not** a from-scratch build — EcoLogix already exists and is functional (multi-tenant FastAPI backend, React frontend, real emissions model, real tenant isolation tests). This prompt covers a targeted set of fixes and additions on top of the existing codebase. Read the existing code in `backend/app/core/optimizer.py`, `backend/app/core/matcher.py`, `backend/app/core/emissions.py`, `backend/app/api/`, and `frontend/src/` before changing anything — match existing patterns (tenant_id from JWT only, pure functions in `core/`, thin routers in `api/`).

Before writing code, produce a short plan confirming you understand the current state of each of the 5 tasks below, then implement them in order.

---

## Non-negotiable constraints (do not break these)

- Every endpoint must keep resolving `tenant_id` from the verified JWT via `get_current_tenant` — never from a request body or query param. Do not touch `backend/app/core/auth.py`'s isolation logic.
- Do not break `backend/tests/test_api_integration.py` or `backend/tests/test_tenant_isolation.py`. Run them after every task and keep them green.
- Do not introduce new external paid APIs or services — everything must still work fully offline against the seeded SQLite demo data (`ecologix.db` / `backend/app/db/seed.py`).
- Keep the existing shared-emissions-model rule intact: any new CO₂ number, anywhere, must call `calculate_segment_emissions()` in `backend/app/core/emissions.py` — never a new inline calculation.

---

## Task 1 — Make the optimizer's solve method honest, not misleading

**Current state:** `backend/app/core/optimizer.py` docstrings/comments reference "OR-Tools" but no `ortools` dependency exists anywhere in the repo (`requirements.txt` confirms this). The real method is exact brute-force permutation for stop counts ≤9, and a greedy nearest-neighbor heuristic above that.

**Required change:**
- Remove all references to "OR-Tools" from code comments/docstrings in `optimizer.py` and `hackathon-spec.md` / `features.md` / `EcoLogix_PRD.md` — replace with an accurate description: "exact combinatorial solver (optimal for ≤9 stops), greedy nearest-neighbor heuristic fallback above that."
- Add a `"solution_method"` field to the dict returned by `optimize_route_vrp()`: `"exact_optimal"` when the permutation branch runs, `"heuristic_nearest_neighbor"` when the fallback runs.
- Surface this field in the frontend (`ParetoChart.jsx` or near the route summary) as a small badge, e.g. "Optimal solution" vs. "Heuristic solution" — this is a credibility feature, not something to hide.

**Acceptance criteria:** No occurrence of "OR-Tools" remains anywhere in `backend/` or `frontend/`. `solution_method` is present in every `/routes/optimize` job result and visible in the UI.

---

## Task 2 — Replace the fake load-pool matching logic with real geographic/time-window matching

**Current state:** `backend/app/core/matcher.py`'s dynamic matching branch identifies candidate shipments by checking if the string `"pool"`, `"Return"`, or `"Medical"` appears in the shipment's `id`/`title`, and applies a **hardcoded distance of 28.4 km** and a hardcoded `0.85` multiplier regardless of the shipment's actual coordinates. This does not match what `features.md` (S3) or the demo script claims.

**Required change:**
- Remove the keyword-matching branch entirely.
- Reuse `haversine_distance_km()` from `backend/app/core/optimizer.py` (import it, don't duplicate it) to compute the **real** distance between a candidate empty-leg corridor and every open shipment belonging to the *other* tenant.
- Implement real filtering:
  - **Proximity:** candidate shipment's origin or destination must be within a configurable radius (e.g. 15 km) of the empty leg's corridor (simple check against the leg's origin and destination points is fine — no need for full route-line geometry).
  - **Time-window overlap:** candidate shipment's `delivery_window_start`/`end` must overlap the empty leg's available time window.
  - **Capacity fit:** candidate shipment's `weight_kg` must be ≤ the empty leg's spare capacity.
- Score surviving candidates by real CO₂ avoided — compute this via `calculate_segment_emissions()` using the **actual** computed distance, not a hardcoded value — and cost saved via a real `$/km` constant.
- Return the top-N (e.g. top 3) scored matches per request instead of a fixed hardcoded match.
- Keep the existing pre-seeded `LoadPoolMatch` demo row as a guaranteed fallback (for demo reliability if live data yields zero matches), but clearly label it as `"source": "seeded_demo"` vs. `"source": "computed"` in the response so it's honest about which is which.

**Acceptance criteria:** `find_load_pool_matches()` contains no string/keyword matching on titles. A test in `backend/tests/` (add one if missing) asserts that two shipments with the same title keyword but a real distance far outside the radius are correctly excluded, and that `co2_saved_kg` scales with actual computed distance, not a constant.

---

## Task 3 — Add a cumulative Impact Summary (closes the ESG/reporting persona gap)

**Current state:** `EcoLogix_PRD.md` defines a Sustainability/ESG Lead persona whose user story is "I want to see estimated kg CO₂ per route and per shipment so I can report on emissions reductions" — but there is no aggregate/reporting view anywhere. The dashboard only ever shows one route's numbers at a time.

**Required change:**
- Add `GET /api/v1/impact/summary` in a new or existing router, tenant-scoped as usual. It should return:
  - `total_routes_optimized` — count of completed `OptimizationJob` rows for this tenant
  - `total_co2_saved_kg` — sum of `(baseline_co2_kg - total_co2_kg)` across completed jobs for this tenant, computed from `result_json`
  - `total_load_pool_matches` — count of matches surfaced to this tenant
  - `total_co2_saved_from_pooling_kg` — sum of `co2_saved_kg` from `LoadPoolMatch` rows visible to this tenant
  - `combined_total_co2_saved_kg` — sum of the two CO₂ figures above
  - A friendly equivalence figure, e.g. `"equivalent_trees_planted"` (kg CO₂ ÷ ~21 kg CO₂ absorbed per tree per year, or similar public figure) — cite the conversion factor used in a comment.
- Add an `ImpactSummaryPanel.jsx` component in `frontend/src/components/`, shown prominently on the dashboard (top of `App.jsx`, above the route/map view), displaying the combined CO₂ saved as a large headline number plus the two breakdowns and the equivalence figure.
- This must update live as new routes are optimized / matches are triggered during the demo — refetch on each successful `/routes/optimize` completion and `/loadpool/match` call.

**Acceptance criteria:** Logging in as either demo tenant and completing one route optimization plus one load-pool match causes the Impact Summary panel's headline number to visibly increase without a page reload.

---

## Task 4 — Surface the EV vs. diesel comparison in the UI (touches "renewable energy")

**Current state:** `backend/app/core/emissions.py` already fully models an `ev_truck` profile, but the frontend never lets a user compare it against the diesel vehicle they're using.

**Required change:**
- Add a toggle/button near the route result (e.g. in `EmissionsExplainer.jsx` or a new small component) labeled something like "What if this were an EV fleet?"
- On click, call `calculate_segment_emissions()` logic (via a lightweight new backend endpoint or by reusing the existing optimize response's distance/load/congestion figures client-side is not acceptable — route the calculation through the backend) with `vehicle_type="ev_truck"` for the same route's total distance/load/congestion, and show a side-by-side delta: "Diesel: X kg CO₂ → EV: Y kg CO₂ (Z% reduction)."
- This must still go through `calculate_segment_emissions()` — no duplicate formula in the frontend.

**Acceptance criteria:** Toggling the comparison after any completed route optimization shows a real, freshly computed EV-equivalent CO₂ figure, not a static/hardcoded percentage.

---

## Task 5 — Add a lightweight climate-risk flag on route legs (touches "climate-risk management")

**Current state:** Nothing in the product currently touches climate-risk exposure — only carbon accounting.

**Required change:**
- Define a small static list of 2–3 mock "risk corridors" (lat/lng bounding boxes representing e.g. a flood-prone lowland or a wildfire-smoke corridor near the seeded Pacific Northwest demo data — these can be fictional/illustrative, clearly commented as `# MOCK DATA for demo purposes, not a real risk feed`).
- In `optimizer.py`'s leg-building step, flag any leg whose path passes near one of these boxes with a `"climate_risk_flag": true/false` and a short `"climate_risk_note"` string (e.g. "Corridor has elevated flood risk in wet season").
- In `MapView.jsx`, render a small warning icon on flagged legs with the note as a tooltip.

**Acceptance criteria:** At least one seeded demo route produces a flagged leg visible on the map with a hover tooltip. Code and pitch materials must clearly state this is illustrative/mock data, not a live risk feed — do not claim this is production-grade in any script or copy.

---

## Definition of Done for this follow-up work

- [ ] No "OR-Tools" references remain; `solution_method` is returned and shown in UI
- [ ] Load-pool matcher uses real haversine distance, real time-window overlap, real capacity checks — zero keyword-matching on titles
- [ ] `GET /api/v1/impact/summary` exists, is tenant-scoped, and the frontend panel updates live during a demo run
- [ ] EV-vs-diesel comparison is a real backend-computed delta, triggerable from the UI
- [ ] At least one demo route shows a climate-risk-flagged leg with a tooltip, clearly marked as illustrative
- [ ] `pytest backend/tests/` still passes in full, including tenant isolation tests
- [ ] Demo script / pitch notes updated to reflect the accurate optimizer description (Task 1) — no verbal claims should outrun what Tasks 1–5 actually implement

Do the tasks in order 1 → 5. If short on time, 1–3 are the highest-value; 4–5 are valuable but secondary.
