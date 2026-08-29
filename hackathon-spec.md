# EcoLogix — Hackathon Build Spec

**Purpose of this doc:** the single spec the team builds from and checks progress against, for a 2-day hackathon submission. Supersedes all prior architecture docs as the *build reference* — those remain useful as the "why," this is the "what, in what order, done by when."

**Prior docs, for context (not required reading during the build):**
- `architecture.md` (v1) — original hackathon-scoped design
- `architecture-v3.md` — full scaled/multi-tenant target design
- `architecture-mvp.md` — the 2-day cut of v3 this spec implements

---

## 1. The Pitch (memorize this, it's what gets said on stage)

**EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting.**

Two things happen in the demo, in this order:
1. **Route optimization:** show a dispatcher trading off time vs. emissions on a live slider, watch both routes update on a map, see the exact CO₂ saved.
2. **Load pooling:** show that an "empty leg" one company is already driving can carry another company's shipment for free — CO₂ and cost saved with zero extra trucks on the road.

The judging hook: this isn't a toy optimizer — it's multi-tenant from the ground up (two "companies" in the demo are provably data-isolated, not just visually separated), and the CO₂ number behind every route and every match traces back to **one shared calculation**, not three different guesses. That traceability is the answer to "how do I know your emissions numbers are real."

---

## 2. Definition of Done (what "win-ready" means, checked against this exact list before demo)

A judge must be able to watch, unprompted, in under 4 minutes:

- [ ] Log in as two different companies (even via mock login) and see each one's data is separate — no shared fleet/shipment list
- [ ] Add or select a fleet + shipments for Company A, hit "Optimize"
- [ ] Watch a route appear on a map within ~15 seconds, with a CO₂-saved number vs. a time-only baseline
- [ ] Move the α slider and see the route/best route options chart respond (even if it re-queues a new job rather than being instant)
- [ ] Trigger a load-pool match between Company A and Company B, see a matched empty leg + shipment with CO₂/cost saved, and confirm Company B's other data is *not* visible to Company A
- [ ] The whole thing runs on a real deployed URL, not `localhost`

If any of these six can't be demoed live, that item is the top priority, above any polish.

---

## 3. Scope Lock — What Ships, What Doesn't

This list exists to stop scope creep mid-build. Do not add to the "ships" column without removing something.

**Ships:**
- Route optimization (VRP, α-weighted time/CO₂ objective, Pareto sweep) — async job
- Emissions Model as a single shared function, called by both optimizer and matcher
- Load-pool matching — simplified (bounding-box filter, top-N ranked list, no bipartite solver)
- Multi-tenant data model with `tenant_id` on every table, enforced in every query
- Mock login (`/dev-login`) issuing a signed JWT — good enough to prove tenant isolation live
- React dashboard: map, Pareto chart + slider, load-pool panel, job-status polling
- Deployed on a real URL (Render/Fly.io/Railway + managed Postgres + managed Redis)

**Does not ship (say so confidently if asked, don't apologize):**
- Real password-based auth / real IdP — architecturally ready to add (see `architecture-mvp.md` §3), not needed to prove the concept
- PostGIS proximity queries / GIST indexing for matching — bounding box is enough at demo data volume
- Bipartite optimal assignment for load-pooling — top-N ranking demos the same value
- Row-Level Security — app-layer tenant filtering is enforced and demoable; RLS is the next hardening step, not a demo requirement
- Multi-region, autoscaling, read replicas — none of these are visible in a 4-minute demo

If a judge asks "does this scale to 10,000 users?" — the honest answer is in §7. Say it plainly; a team that knows exactly what it cut and why reads as more credible than one that claims it's all done.

---

## 4. System Design (compact — full reasoning in `architecture-mvp.md`)

```
React Dashboard ──HTTPS/JWT──► FastAPI (single container)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │               │
              Emissions Model   Postgres+PostGIS   Redis
              (in-process, sync) (managed)          (job queue + cache)
                                                        │
                                                  1 worker process (RQ)
                                                  → Route Optimizer (exact combinatorial solver, time-boxed)
                                                  → calls Emissions Model
```

Four deployables: API container, worker container, managed Postgres, managed Redis. That's it.

**Non-negotiable rule for every endpoint:** `tenant_id` comes from the verified JWT, never from the request body or a query param. This is the one shortcut that would be expensive to fix later and cheap to get right now — it's also the exact thing a judge will probe if they're testing tenant isolation live.

---

## 5. Build Order (hour-by-hour, Day 1 & 2)

### Day 1 — Backend + core algorithm working end-to-end (no UI yet)

| Time | Task | Done when |
|---|---|---|
| 0:00–1:00 | Repo scaffold, docker-compose (Postgres+PostGIS, Redis, API skeleton) | `docker-compose up` runs an empty FastAPI app |
| 1:00–2:30 | Schema + migrations: `organizations`, `users`, `fleets`, `vehicles`, `shipments`, `routes`, `route_legs`, `emission_factors` — `tenant_id` on every domain table | Migrations run clean against local Postgres |
| 2:30–3:30 | Mock auth: `/dev-login`, JWT signing/verification middleware | A curl request with a valid token resolves the right `tenant_id`; an invalid/missing token is rejected |
| 3:30–5:00 | Emissions Model as a pure function (fuel/CO₂ per segment) — unit-test it now, it's the credibility anchor for the whole pitch | Given a vehicle profile + distance + load, returns a CO₂ figure; 3–4 unit tests pass |
| 5:00–7:00 | Route Optimizer: exact combinatorial solver (optimal for ≤9 stops) / greedy nearest-neighbor heuristic fallback, α-weighted objective, wired to Emissions Model, wrapped as an RQ job with a hard time limit (10–15s) | `POST /routes/optimize` returns a `job_id`; worker produces a route + `co2_kg` + `solution_quality` within the time limit |
| 7:00–8:00 | `GET /jobs/{id}` polling endpoint; seed script with 2 demo companies, sample fleets/shipments | Can optimize a route end-to-end via curl/Postman for two different tenants and see isolated results |

**Day 1 exit bar:** if only curl/Postman work by end of day, that's fine — the algorithm and tenant isolation must be provably correct before any pixel is drawn.

### Day 2 — Frontend, load-pooling, deploy, rehearse

| Time | Task | Done when |
|---|---|---|
| 0:00–1:00 | React scaffold, login screen hitting `/dev-login`, token stored, auth-aware API client | Can log in as either demo company from the browser |
| 1:00–2:30 | Map view rendering baseline + optimized route; Pareto chart + α slider triggering re-optimize | Slider move visibly re-queues and updates the map/chart |
| 2:30–3:00 | Job-status polling UI (loading state while worker runs) | No dead spinners — user sees "optimizing…" then a result |
| 3:00–4:30 | Load-pool endpoint: bounding-box filter + top-N scored matches (§4 of `architecture-mvp.md`) + a matches panel in the UI | Company A can see a match against Company B's empty leg, with CO₂/cost saved, and cannot see Company B's other data |
| 4:30–5:30 | Deploy: managed Postgres (Supabase/Neon), managed Redis (Upstash), API+worker to Render/Fly/Railway | Real HTTPS URL, both demo company logins work end-to-end on it |
| 5:30–6:30 | Seed realistic demo data (real-looking addresses/coordinates, not "Stop A/B/C") — this matters more for judge perception than it sounds | Demo map doesn't look like a placeholder |
| 6:30–7:30 | Full dry run against the Definition of Done checklist (§2), fix whatever breaks | All six checklist items pass live, twice in a row |
| 7:30–8:00 | Pitch rehearsal: run the exact 4-minute demo flow out loud, timed | Under 4 minutes, no dead air waiting on a spinner |

---

## 6. Demo Script (what actually gets clicked, in order)

1. **Open on Company A's login** → log in → dashboard is empty/fresh for this tenant. *Say: "this is Northwind Logistics."*
2. **Log in as Company B in a second tab** → different fleet/shipments visible. *Say: "and this is a totally separate company — different data, same platform."* (This one beat is doing the multi-tenancy proof — don't rush it.)
3. Back to Company A: select a fleet + shipments, hit **Optimize**. Narrate the ~10s wait honestly: *"this is a real vehicle-routing solve running right now, not a canned result."*
4. Route appears on the map next to the time-only baseline. Point at the CO₂-saved number.
5. Move the **α slider** — show the Pareto chart move, route changes on the map.
6. Switch to **Load Pool** tab → trigger a match → show Company A's dashboard surfacing a matched empty leg from Company B, with savings, but *not* Company B's full shipment list. *Say: "that's the boundary — we see the opportunity, not each other's business."*
7. Close on the pitch line from §1.

---

## 7. The "How Does This Scale" Answer (have this ready, don't dodge it)

If asked directly, the honest and confident answer:

> "This build is already structured so scaling is additive, not a rewrite. Route optimization is async on a job queue from day one — adding worker replicas is a deployment change, not a code change. Every table already has `tenant_id` and every query filters on it — turning that into database-level Row-Level Security is a migration, not an app rewrite. The one thing we deliberately simplified is load-pool matching — right now it's a bounding-box filter and a ranked list instead of PostGIS spatial indexing and an optimal bipartite assignment — because that's an algorithm swap inside one endpoint, not a different system shape. We know exactly what we'd add first if this became a real product, and none of it requires touching what we built this weekend."

This answer is the difference between "toy demo" and "team that understands production" in a judge's eyes — say it plainly, cite the concrete triggers (worker replicas when jobs queue up, RLS at the first security question, better matching when match quality complains) rather than hand-waving "yeah it would scale."

---

## 8. Judging Criteria Alignment (typical hackathon rubric — map talking points here)

| Likely criterion | What to point to |
|---|---|
| **Technical difficulty** | Real VRP solve (exact combinatorial solver / heuristic fallback) with a genuine multi-objective tradeoff, not a static demo; async job architecture; provable multi-tenant isolation |
| **Working product** | Deployed URL, both demo flows work live, no "imagine if this worked" hand-waving |
| **Problem/market fit** | CO₂ reduction *and* cost reduction in the same feature (load pooling) — appeals to both sustainability and ROI judges |
| **Design/UX** | Map + live Pareto chart + slider is inherently visual and easy for a non-technical judge to grasp in seconds |
| **Scalability/completeness** | §7 above — a clear, specific "here's exactly how this grows" beats vague confidence |

---

## 9. Fallback Plan (if something breaks 30 minutes before demo)

- **If the live worker/optimizer breaks:** fall back to a pre-computed route stored for the seeded demo data, but say so if asked directly — don't claim a cached result is live. Judges respect honesty about a last-minute bug far more than a caught lie.
- **If deploy breaks:** demo from `localhost` with a clear one-line explanation ("deploy hiccup, this is the same build, just not on the public URL yet").
- **If load-pooling breaks:** it's the secondary flow — cut it from the demo and lean harder on the route-optimization story plus the multi-tenancy proof; both still stand alone.

The one thing that must never break: the tenant-isolation proof (step 2 of §6). It's the cheapest thing to keep working and the single strongest credibility signal in the whole demo.
