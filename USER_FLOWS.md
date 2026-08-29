# EcoLogix — End-to-End User Flows & Application Context

> **Multimodal Carbon-Aware Logistics & Intelligent Route Optimization Platform**  
> *"EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting."*

---

## 1. Overview & Dual Interface Paradigm

EcoLogix features two distinct, synchronized application interfaces designed for complementary personas:
1. **Consumer Hub (formerly Admin Console / Logistics Planner)** (`/`)
2. **Driver Portal (MobileApp / Driver Mode)** (`/driver`)

Both interfaces share a common backend engine (FastAPI + SQLAlchemy) with real-time GLEC-compliant carbon accounting, combinatorial route optimization, and cross-provider deadhead capacity matching.

```
+-------------------------------------------------------------------+
|                        EcoLogix Platform                          |
+---------------------------------+---------------------------------+
|   Consumer Hub (Planner View)   |   Driver Portal (In-Cab View)   |
|   Route Planning & Strategy     |   Route Execution & Telemetry   |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                FastAPI Engine & GLEC Solver Core                  |
+-------------------------------------------------------------------+
```

---

## 2. User Flow 1: Consumer Hub (Logistics Planner & Fleet Operations)

### Purpose & User Persona
Used by logistics managers, fleet operators, and dispatchers to plan routes, balance speed vs. carbon emissions, evaluate EV conversion impact, and match deadhead return capacity across providers.

### Step-by-Step Interactive Workflow

```
[Select Tenant / Company Domain]
              │
              ▼
[Choose Fleet Vehicle & Shipments]
              │
              ▼
[Set Trade-Off: Faster ↔ Greener (α-Slider)]
              │
              ▼
[Solve Pareto Optimal Route & View Map]
              │
              ├─────────────────────────────┐
              ▼                             ▼
[Analyze Leg Breakdown & EV Scenario]   [Trigger Load Pooler]
```

1. **Multi-Tenant Context & Domain Selection**:
   - Select active logistics company domain (e.g. `NW Freight Logistics`, `Guwahati Multi-Modal Hub`, `FastTrack Express`).
   - Auto-loads corresponding depot hub coordinates, vehicle specs, and pending shipments.

2. **Fleet & Shipment Selection**:
   - Choose vehicle model (Internal Combustion Engine Heavy Truck, EV Truck, Light Commercial Vehicle).
   - Select cargo items / shipment stop locations.

3. **Multi-Objective Trade-Off Configuration ($\alpha$-Slider & Mode Toggles)**:
   - Toggle directly between:
     - **Faster Route (Time-Optimized)**: $\alpha = 0$, prioritizes minimum drive duration.
     - **Greener Route (Carbon-Aware)**: $\alpha = 1$, prioritizes minimum GLEC CO₂ output.
   - Adjust continuous **Faster ↔ Greener ($\alpha$) Slider** ($0 \le \alpha \le 1$) to fine-tune trade-off balance.

4. **Route Optimization & Interactive GIS Map**:
   - Executes combinatorial solver or greedy heuristic.
   - Renders interactive Leaflet map with depot marker, stop sequence order, route polylines, and live location search/recenter.
   - Displays **Pareto Frontier Curve** (Recharts) visualizing optimal trade-off boundary points between time (minutes) and carbon ($\text{kg CO}_2$).
   - Displays **Route Leg Breakdown Table** with sequence order, distances, times, segment CO₂, and climate risk warnings.

5. **EV Fleet Scenario & Environmental Impact**:
   - Compare current diesel route against electric vehicle alternative (`EVComparisonCard`).
   - View **Emissions Explainer Drawer** detailing GLEC Well-to-Wheel (WTW) formulas, payload utilization factors, and congestion multipliers.
   - Review **Impact Summary Panel** ($\text{CO}_2$ avoided, fuel saved, equivalent trees planted).

6. **Cross-Company Load Pooling**:
   - Trigger bipartite matching engine (`LoadPoolPanel`) to identify underutilized/deadhead return legs across partner companies.
   - Accept matches to fill empty backhaul capacity and log instant CO₂ reductions.

---

## 3. User Flow 2: Driver Portal (Driver Execution & Telemetry)

### Purpose & User Persona
Used by heavy freight truck drivers on mobile devices or in-cab displays to execute assigned routes, monitor environmental hazards, log waypoint arrivals, and accept automated return load-pooling matches.

### Step-by-Step Interactive Workflow

```
[Dispatch Queue & Overview (MobileHome)]
                    │
                    ▼
[Smart Driver Trip Configurator (TripPlanForm)]
  - Auto-detects vehicle capacity & mileage specs
  - Pulls weather hazard telemetry (flood, wind, fuel penalty)
                    │
                    ▼
[Interactive Route Execution (DriverTripFlow)]
  1. DETAILS        -> Review manifest & waypoints
  2. IN_PROGRESS    -> GPS connected live telemetry
  3. NEXT_STOP      -> Waypoint ETA & distance
  4. ARRIVED        -> Confirm arrival via GPS
  5. RETURN_LOAD    -> Automated return load match alert (1-click accept)
  6. TRIP_COMPLETE  -> Finalized audit & carbon savings certificate
```

1. **Dispatch Queue & Overview (`MobileHome`)**:
   - View daily assigned vehicle (e.g., `NW Heavy Freightliner #101`), origin/destination route summary, distance, estimated time, and CO₂ impact.
   - Launch active route execution.

2. **Smart Driver Trip Configurator (`TripPlanForm` / `MobileTrips`)**:
   - Input cargo quantity (kg), destination, and vehicle model (e.g. `Tata Ultra`, `Eicher Pro`, `Mahindra Furio`, `EV Truck`).
   - Auto-detects vehicle capacity and mileage specs from brand registry (`truck_brands.json`).
   - Select expected weather conditions (`Clear/Dry`, `Moderate Rain`, `Monsoon/Heavy Rain`, `Severe Storm/Cyclone`).
   - Displays AI hazard telemetry: flood risk level, wind velocity (km/h), and efficiency fuel penalty (+6% to +28%).
   - Displays overweight payload warning if cargo exceeds max capacity.

3. **Interactive Step-by-Step Route Execution (`DriverTripFlow`)**:
   - **Step 1: Details & Manifest**: Review origin pickup, waypoints, cargo weight, and estimated duration.
   - **Step 2: Execution in Progress**: Live GPS telemetry connection and milestone tracking.
   - **Step 3: Next Stop Details**: Distance remaining and estimated arrival time for next stop.
   - **Step 4: Waypoint Arrival**: Mark arrival confirmed via GPS telemetry.
   - **Step 5: Automated Backhaul Load-Pooling Trigger (`RETURN_LOAD_ALERT`)**:
     - When reaching final delivery, the system checks if the vehicle will return empty.
     - Triggers automated bipartite matcher for candidate return loads.
     - Driver can click **Accept Return Load** to immediately assign return shipment, adding backhaul payload, minimizing deadhead miles, and logging avoided $\text{CO}_2$.
   - **Step 6: Final Trip Audit & Completion (`TRIP_COMPLETE`)**:
     - View final route metrics: total distance, fuel burned, total $\text{CO}_2$ output, and EcoLogix Certified Carbon Impact ($\text{CO}_2$ avoided, fuel saved, empty distance eliminated).

4. **Driver Telemetry & Hazard Alerts (`MobileAlerts`)**:
   - Monitor real-time notifications: return load opportunities, weather risk warnings, and audited trip completions.

5. **Driver Profile & Credentials (`MobileProfile`)**:
   - Inspect driver ID credentials (`DRV-001`), license tier, assigned vehicle specs, cumulative lifetime trips, and total $\text{CO}_2$ saved.
   - Switch seamlessly back to Consumer Hub.

---

## 4. Shared Technical Infrastructure & Navigation Matrix

| Feature / Action | Consumer Hub (`/`) | Driver Portal (`/driver`) |
|---|---|---|
| **Main Objective** | Plan, optimize, & audit fleet routes | Execute routes & report live telemetry |
| **Primary Input** | Multi-stop shipments, $\alpha$-slider | In-cab trip setup & waypoint check-ins |
| **Key Visualizer** | Pareto chart, Leaflet map, GLEC explainer | Mobile timeline, hazard cards, return match alert |
| **Return Load Pool** | Provider matching panel | Automated 1-click in-cab acceptance |
| **Navigation Toggle** | Header pill button (`Header.jsx`) | Header pill button & Profile switch button |
| **Theme / Design** | Dark Slate Glassmorphism (`#0B0E14`) | Dark Slate Glassmorphism (`#0B0E14`) |

---

## 5. File Map & Code References

- **Routing & Entrypoint**: [frontend/src/App.jsx](file:///d:/Projects/EcoLogix/frontend/src/App.jsx)
- **Top Bar Header**: [frontend/src/components/Header.jsx](file:///d:/Projects/EcoLogix/frontend/src/components/Header.jsx)
- **Consumer Hub Main Component**: [frontend/src/AdminDashboard.jsx](file:///d:/Projects/EcoLogix/frontend/src/AdminDashboard.jsx)
- **Interactive Route Map**: [frontend/src/components/MapView.jsx](file:///d:/Projects/EcoLogix/frontend/src/components/MapView.jsx)
- **Driver Portal Shell**: [frontend/src/mobile/MobileApp.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/MobileApp.jsx)
- **Driver Dispatch Overview**: [frontend/src/mobile/views/MobileHome.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/views/MobileHome.jsx)
- **Smart Driver Trip Configurator**: [frontend/src/mobile/views/TripPlanForm.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/views/TripPlanForm.jsx)
- **Driver Step-by-Step Workflow**: [frontend/src/mobile/components/DriverTripFlow.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/components/DriverTripFlow.jsx)
- **Driver Telemetry & Alerts**: [frontend/src/mobile/views/MobileAlerts.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/views/MobileAlerts.jsx)
- **Driver Credentials & Profile**: [frontend/src/mobile/views/MobileProfile.jsx](file:///d:/Projects/EcoLogix/frontend/src/mobile/views/MobileProfile.jsx)
- **Vercel SPA Deployment Config**: [vercel.json](file:///d:/Projects/EcoLogix/vercel.json)
