# EcoLogix — Technical & Architectural Context

> **Multimodal Carbon-Aware Logistics & Intelligent Route Optimization Platform**  
> *"EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting."*

---

## 1. Executive Summary

**EcoLogix** is a high-performance, carbon-aware logistics intelligence platform built to solve the fundamental tension in modern supply chains: **balancing delivery speed against greenhouse gas (GHG) emissions and deadhead waste**. 

Rather than treating sustainability as a post-hoc reporting metric, EcoLogix injects **GLEC-framework compliant emissions mathematics** directly into real-time combinatorial routing algorithms, empowers dispatchers with an interactive **Pareto frontier**, and activates cross-provider **load pooling** to eliminate empty return legs.

---

## 2. Core Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │          EcoLogix Web Client                 │
                     │  React 18 + Vite + Tailwind CSS + Lucide     │
                     │  Leaflet / React-Leaflet + Recharts          │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTP / REST
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          FastAPI Backend Engine              │
                     │  Uvicorn + Pydantic v2 + SQLAlchemy ORM      │
                     └──────┬───────────────┬────────────────┬──────┘
                            │               │                │
            ┌───────────────┴────┐   ┌──────┴─────────┐   ┌──┴─────────────────┐
            │   Core Solvers     │   │   Emissions    │   │ Cross-Provider     │
            │ • Exact Permuter   │   │ • GLEC Factor  │   │   Load Pooler      │
            │ • Greedy + 2-Opt   │   │ • Congestion   │   │ • Bipartite Match  │
            │ • Pareto Sweeper   │   │ • EV vs Diesel │   │ • Deadhead Capture │
            └────────────────────┘   └────────────────┘   └────────────────────┘
```

### Technology Stack
- **Frontend**:
  - React 18, Vite 5
  - React-Leaflet & Leaflet (interactive GIS routing, waypoint markers, geocoding)
  - Recharts (Pareto frontier curves, trade-off analysis)
  - Lucide React (modern UI iconography)
  - Tailwind CSS / Vanilla Glassmorphism CSS design system
- **Backend**:
  - Python 3.11+, FastAPI, Uvicorn
  - SQLAlchemy ORM with SQLite (zero-config, portable for offline demos & cloud serverless)
  - Pydantic v2 for data schemas and validation
- **Deployment & DevOps**:
  - Vercel (monorepo configuration: Vite SPA + Serverless Python API rewrite via `vercel.json`)
  - Docker & Docker Compose (`Dockerfile.backend`, `docker-compose.yml`)

---

## 3. Key Algorithmic Innovations

### 3.1 Bi-Objective Optimization ($\alpha$-Weighting)
EcoLogix computes routes by minimizing a normalized composite objective function:
$$\min_{\pi} \quad \mathcal{F}(\pi) = \alpha \cdot \frac{E(\pi)}{E_{\text{ref}}} + (1 - \alpha) \cdot \frac{T(\pi)}{T_{\text{ref}}}$$

- $\alpha = 0$: **Pure Time Optimization** (Fastest route)
- $\alpha = 1$: **Pure Carbon Optimization** (Greenest route)
- $0 < \alpha < 1$: **Balanced Trade-Off**

**Solvers**:
1. **Exact Combinatorial Solver**: Evaluates all permutations $\mathcal{O}(N!)$ for stop sizes $N \le 9$ to guarantee mathematical optimality.
2. **Greedy Nearest-Neighbor with 2-Opt**: Heuristic fallback for $N > 9$ executing fast iterative improvement.

### 3.2 GLEC-Compliant Emissions Calculation Engine
Emissions per route segment ($i \to j$) are computed using:
$$E_{ij} = d_{ij} \times \left( \text{BaseRate}_{\text{vehicle}} \times \left[ 1 + \gamma \cdot \frac{\text{Load}_{ij}}{\text{Capacity}} \right] \right) \times C_{ij} \times \text{EmissionFactor}_{\text{fuel}}$$

- $d_{ij}$: Distance in kilometers (Haversine or network distance)
- $\text{Load}_{ij} / \text{Capacity}$: Dynamic weight utilization factor
- $C_{ij}$: Real-time or simulated Congestion Multiplier ($1.0 \le C \le 1.8$)
- $\text{EmissionFactor}$: Well-to-Wheel (WTW) factors ($2.68\text{ kg CO}_2/\text{L}$ for Diesel, local grid intensity for EVs)

### 3.3 Bipartite Cross-Provider Load Pooling Matcher
Identifies deadhead (empty or underloaded return legs) across distinct logistics companies and matches them with pending shipments:
1. **Spatial & Temporal Filtering**: Validates origin/destination detour radius and delivery time windows.
2. **Capacity Validation**: Ensures remaining vehicle payload volume/weight is not exceeded.
3. **CO₂ & Cost Delta Scoring**: Calculates net avoided carbon by piggybacking on an existing trip vs. dispatching a dedicated vehicle.

---

## 4. Codebase Directory Structure

```
EcoLogix/
├── api/
│   └── index.py                    # Vercel serverless entrypoint routing to FastAPI
├── backend/
│   ├── app/
│   │   ├── api/                    # REST API route handlers
│   │   │   ├── auth.py             # Multi-tenant context & demo login
│   │   │   ├── data.py             # Seed data retrieval (vehicles, shipments, depots)
│   │   │   ├── driver.py           # In-cab driver dispatch & telemetry endpoints
│   │   │   ├── emissions.py        # Emissions calculation & explainer endpoints
│   │   │   ├── impact.py           # ESG metrics & savings summary
│   │   │   ├── jobs.py             # Async job triggers & status
│   │   │   ├── loadpool.py         # Cross-company load pooling & matching
│   │   │   ├── lookup.py           # Vehicle brand registry & weather hazard telemetry
│   │   │   └── routes.py           # Route optimization & Pareto sweep endpoints
│   │   ├── core/
│   │   │   ├── auth.py             # Auth & tenant logic
│   │   │   ├── emissions.py        # GLEC carbon emission calculations
│   │   │   ├── matcher.py          # Bipartite load matching algorithm
│   │   │   ├── optimizer.py        # Exact + heuristic route solvers & Pareto engine
│   │   │   ├── vehicle_lookup.py   # Truck specs & capacity resolver
│   │   │   └── weather_lookup.py   # Assam weather & flood hazard model
│   │   ├── db/
│   │   │   ├── database.py         # SQLAlchemy engine & session setup
│   │   │   ├── models.py           # Database entities (Vehicles, Shipments, Routes)
│   │   │   └── seed.py             # Realistic mock logistics dataset (Guwahati regional nodes)
│   │   ├── decision_engine/        # Multi-criteria decision engine service
│   │   ├── emissions/              # Dedicated emissions calculator & service
│   │   ├── load_pooling/           # Bipartite matching & scoring services
│   │   ├── optimization/           # Combinatorial & Pareto optimization modules
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   └── main.py                 # FastAPI application factory & middleware
│   ├── requirements.txt            # Python dependencies
│   └── tests/                      # Pytest unit & integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlphaSlider.jsx          # Interactive fastest-to-greenest slider
│   │   │   ├── DemoGuideModal.jsx       # Guided walk-through modal
│   │   │   ├── EVComparisonCard.jsx     # EV vs Diesel carbon/cost comparative card
│   │   │   ├── EmissionsExplainer.jsx   # Formula breakdown & explainability drawer
│   │   │   ├── Header.jsx               # Navigation header with max-w-7xl alignment
│   │   │   ├── ImpactSummaryPanel.jsx   # KPI carbon avoided, fuel saved, tree-years
│   │   │   ├── LoadPoolPanel.jsx        # Deadhead matching & capacity pooler
│   │   │   ├── MapView.jsx              # Leaflet route visualization & mode switcher
│   │   │   ├── NavBar.jsx               # Floating Liquid Glass bottom navigation dock
│   │   │   ├── ParetoChart.jsx          # Recharts Pareto frontier visualizer
│   │   │   ├── ShipmentInputForm.jsx    # Custom stop & waypoint input form
│   │   │   ├── VoiceNavigation.jsx      # Driver voice navigation overlay
│   │   │   └── WalkthroughTooltip.jsx   # Step-by-step interactive onboarding
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Multi-tenant state & user context
│   │   ├── data/
│   │   │   └── truck_brands.json        # Commercial vehicle specs registry (Tata, Eicher, Mahindra)
│   │   ├── mobile/                      # Driver Portal mobile-first subsystem
│   │   │   ├── components/
│   │   │   │   └── DriverTripFlow.jsx   # 6-step in-cab route execution & backhaul acceptance
│   │   │   ├── views/
│   │   │   │   ├── MobileAlerts.jsx     # Real-time telemetry & hazard notifications
│   │   │   │   ├── MobileHome.jsx       # Driver dispatch queue & trip launcher
│   │   │   │   ├── MobileProfile.jsx    # Driver credentials & lifetime CO2 savings
│   │   │   │   ├── MobileTrips.jsx      # Active trip container
│   │   │   │   └── TripPlanForm.jsx     # Smart trip configurator with weather telemetry
│   │   │   └── MobileApp.jsx            # Driver Portal shell entrypoint
│   │   ├── services/
│   │   │   └── api.js                   # Axios/Fetch API client with VITE_API_BASE_URL support
│   │   ├── AdminDashboard.jsx           # Consumer Hub logistics strategy console (/)
│   │   ├── App.jsx                      # Top-level React Router (routes / and /driver)
│   │   ├── index.css                    # Liquid Glass tokens & dark logistics theme
│   │   ├── mobile.css                   # Touch-friendly mobile driver styling
│   │   └── main.jsx                     # Vite React root
│   ├── src-tauri/                       # Tauri v2 Windows desktop wrapper
│   ├── android/                         # Capacitor 8 Android native wrapper
│   ├── package.json
│   └── vite.config.js
├── Dockerfile.backend               # Container configuration for backend
├── docker-compose.yml               # Local multi-container development configuration
├── vercel.json                      # Vercel monorepo deployment & rewrite configuration
├── features.md                      # MoSCoW feature breakdown and traceability
├── context.md                       # Technical context and GLEC specifications
├── data-flow-dynamic.md             # Telemetry data flow & Guwahati regional node specification
├── USER_FLOWS.md                    # End-to-end interactive workflows
├── RELEASE.md                       # Windows & Android native packaging guide
└── EcoLogix_PRD.md                  # Comprehensive Product Requirement Document
```

---

## 5. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check and system readiness status |
| `/api/v1/data/depots` | `GET` | Retrieve depot locations (Guwahati hub, etc.) |
| `/api/v1/data/vehicles` | `GET` | Retrieve active fleet vehicles |
| `/api/v1/data/shipments` | `GET` | Retrieve pending shipments/stops |
| `/api/v1/routes/optimize` | `POST` | Solve optimal route for given vehicle, stops, and $\alpha$ |
| `/api/v1/routes/pareto` | `POST` | Sweep $\alpha \in [0, 1]$ and return Pareto trade-off curve |
| `/api/v1/loadpool/match` | `POST` | Run cross-company deadhead capacity matching |
| `/api/v1/emissions/calculate` | `POST` | Compute GLEC segment emissions with full breakdown |
| `/api/v1/emissions/compare-ev` | `POST` | Compare current route against electric vehicle alternative |
| `/api/v1/impact/summary` | `GET` | Cumulative environmental & financial metrics |
| `/api/v1/driver/status` | `GET` / `POST` | In-cab driver telemetry, active step, and GPS waypoint status |
| `/api/v1/driver/accept-return` | `POST` | 1-click backhaul load acceptance for deadhead reduction |
| `/api/v1/lookup/vehicle-specs` | `GET` | Commercial truck specifications (capacity, payload, fuel rate) |
| `/api/v1/lookup/weather-hazards`| `GET` | Regional weather hazard telemetry (flood risk, wind penalty) |

---

## 6. Development & Deployment

### Local Development Setup

#### Backend:
```bash
# Navigate to backend and setup virtualenv
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt

# Run FastAPI dev server (port 8000)
python -m uvicorn backend.app.main:app --reload --port 8000
```

#### Frontend:
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start Vite dev server (port 5173)
npm run dev
```

### Production Build & Deployment
- **Vercel**: Configured via `vercel.json` to automatically build the frontend into `frontend/dist` and route all `/api/*` traffic to `api/index.py`.
- **Docker**: Run `docker-compose up --build` to deploy the unified container stack.
