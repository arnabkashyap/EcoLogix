# EcoLogix — Dynamic Data Flow & Smart Engine Architecture
## Guwahati & Assam Regional Logistics Intelligence Specification

> **Operational Domain**: Guwahati Metropolitan Region & Brahmaputra Freight Corridor (Assam, India)  
> **Primary Hub**: Guwahati Central Freight Terminal / ICD Amingaon (26.1445° N, 91.7362° E)  
> **Data Scale**: 200+ Local Logistics Nodes, Commercial Freight Routes & Weather Telemetry Feeds

---

## 1. Executive Data Flow Overview

This document specifies the exact end-to-end data pipeline of **EcoLogix** for the **Guwahati / Assam regional freight ecosystem**. It is designed to act as an authoritative system specification so an AI model (such as Claude) can function as an **Intelligent Route Optimization & Carbon Reduction Engine** over 200+ local commercial nodes across North-East India.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. RAW LOCAL DATA & TELEMETRY INPUTS                            │
│  • 200+ Guwahati Regional Nodes (Amingaon ICD, Dispur, Jalukbari, LGBI Airport, etc.)  │
│  • Vehicle Fleet Profiles (MHCV Diesel, LCV Electric, Tata Ultra, Eicher Pro)          │
│  • Dynamic Environmental Telemetry (Brahmaputra Flood Index, NH-27 Congestion Multiplier)│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        2. ECOLOGIX SMART CORE ENGINE (Python)                          │
│  ┌───────────────────────────────┐ ┌──────────────────────────────┐ ┌────────────────┐ │
│  │ Assam Distance/Speed Matrix   │ │ GLEC Emissions Calculator    │ │ Bipartite Load │ │
│  │ • Haversine + 1.25 Curvature  │ │ • Load Factor (0.0-1.0)      │ │   Pool Matcher │ │
│  │ • NH-27 / Saraighat Speeds    │ │ • WTW Factors (2.68 kg/L)   │ │ • Deadhead Net │ │
│  └───────────────────────────────┘ └──────────────────────────────┘ └────────────────┘ │
│                                  Bi-Objective α-Solver                                 │
│                   min F(π) = α · (Time / T_ref) + (1-α) · (CO₂ / C_ref)                │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        3. API PAYLOAD & RESPONSE CONTRACTS                             │
│  • /api/v1/routes/optimize  --> Pareto Optimal Leg Breakdown & Waypoint Polyline       │
│  • /api/v1/loadpool/match   --> Backhaul Deadhead Matches & CO₂ Savings                │
│  • /api/driver/status       --> In-Cab Driver Telemetry & Hazard Alerts                │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        4. REACT DASHBOARD & DRIVER INTERFACES                          │
│  • Consumer Hub (/): Interactive Leaflet GIS Map + Recharts Pareto Curve               │
│  • Driver Portal (/driver): Mobile Dispatch Timeline + 1-Click Backhaul Acceptance     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local Node Registry: Guwahati Regional Logistics Domain

The EcoLogix engine categorizes 200+ local points of interest (POIs) across Guwahati and surrounding Assam corridors into 5 primary functional node types:

### 2.1 Major Hub Categories & Benchmark Coordinates

| Node ID | Node Name | Category | Latitude | Longitude | Primary Cargo / Activity |
|---|---|---|---|---|---|
| `GW-HUB-001` | ICD Amingaon Freight Depot | Multimodal Hub | `26.1852° N` | `91.6811° E` | Containerized Export/Import Cargo |
| `GW-HUB-002` | Betkuchi ISBT Logistics Node | Distribution Center | `26.1214° N` | `91.7319° E` | FMCG & Intra-City Parcel Freight |
| `GW-HUB-003` | LGBI Airport Cargo Terminal | Air Freight Hub | `26.1061° N` | `91.5859° E` | High-Value Pharma & Perishables |
| `GW-HUB-004` | Bamunimaidam Industrial Estate | Industrial Node | `26.1884° N` | `91.7821° E` | Manufacturing & Heavy Goods |
| `GW-HUB-005` | Rani Industrial Corridor | Eco Industrial Park | `26.0612° N` | `91.6115° E` | Manufacturing & Paper Mills |
| `GW-HUB-006` | Jalukbari Junction Node | Transit Gateway | `26.1558° N` | `91.6625° E` | Gateway to NH-27 & Lower Assam |
| `GW-HUB-007` | Khanapara Commercial Gate | Transit Gateway | `26.1189° N` | `91.8214° E` | Gateway to Meghalaya / Shillong |
| `GW-HUB-008` | Dispur Secretariat Node | Retail Consignment | `26.1432° N` | `91.7898° E` | Commercial Supplies |
| `GW-HUB-009` | Fancy Bazar Commercial Core | Trade Center | `26.1864° N` | `91.7441° E` | Wholesale & Retail Distribution |
| `GW-HUB-010` | Azara Industrial Park | Logistics Node | `26.1154° N` | `91.6092° E` | Warehousing & Cold Chain |

---

## 3. Detailed Data Transformation Pipeline

### Step 1: Distance & Road Curvature Matrix Calculation
Roads in the Guwahati region (especially near Saraighat Bridge, Nilachal Hill, and Khanapara bypass) feature terrain curvature and river crossings.

For any two nodes $A (\text{lat}_1, \text{lng}_1)$ and $B (\text{lat}_2, \text{lng}_2)$:
$$\text{DirectDistance} = 2 \cdot R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
$$\text{AssamRoadDistance (km)} = \text{DirectDistance} \times 1.25 \quad \text{(Curvature Multiplier)}$$

**Transit Velocity Matrix**:
- **Inter-City Highway (NH-27 / NH-17)**: $65\text{ km/h}$
- **Intra-City Commercial Corridors (GS Road / Zoo Road)**: $35\text{ km/h}$
- **River Crossing Bottlenecks (Saraighat Bridge)**: $25\text{ km/h}$

---

### Step 2: GLEC-Compliant Emissions Calculation

Emissions per route leg ($i \to j$) are calculated strictly using the **Global Logistics Emissions Council (GLEC) Framework**:

$$\text{CO}_2\text{ (kg)} = \text{Distance (km)} \times \left( \text{BaseRate}_{\text{vehicle}} \times \left[ 1 + 0.35 \times \frac{\text{Payload}_{\text{current}}}{\text{Payload}_{\text{max}}} \right] \right) \times C_{ij} \times \text{EF}_{\text{fuel}}$$

**Vehicle Parameters**:
1. **MHCV Heavy Diesel Truck (18,000 kg capacity)**:
   - $\text{BaseRate} = 0.31\text{ L/km}$
   - $\text{EF}_{\text{fuel}} = 2.68\text{ kg CO}_2/\text{L}$ (Well-to-Wheel Diesel)
2. **EV Freight Truck (14,000 kg capacity)**:
   - $\text{BaseRate} = 1.15\text{ kWh/km}$
   - $\text{EF}_{\text{grid}} = 0.82\text{ kg CO}_2/\text{kWh}$ (Assam State Electricity Grid Index)

**Environmental Congestion Index ($C_{ij}$)**:
- **Baseline Clear Flow**: $C_{ij} = 1.0$
- **Monsoon Rain / Waterlogging (Jorabat Pass)**: $C_{ij} = 1.15$ (+15% fuel penalty)
- **Severe Flood Surge (Brahmaputra Floodplain)**: $C_{ij} = 1.28$ (+28% fuel penalty)

---

### Step 3: Bi-Objective Multi-Route Solver ($\alpha$-Optimization)

The solver evaluates routes across a continuous trade-off parameter $\alpha \in [0, 1]$:
$$\min_{\pi} \quad \mathcal{F}(\pi) = \alpha \cdot \left(\frac{\text{Time}(\pi)}{\text{Time}_{\text{baseline}}}\right) + (1 - \alpha) \cdot \left(\frac{\text{CO}_2(\pi)}{\text{CO}_2_{\text{baseline}}}\right)$$

- $\alpha = 1.0$: **Faster Route (Time-Optimized)** — Minimizes drive duration.
- $\alpha = 0.0$: **Greener Route (Carbon-Aware)** — Minimizes GLEC carbon output.
- $\alpha = 0.5$: **Balanced Route** — Optimal Pareto frontier trade-off.

---

### Step 4: Bipartite Cross-Provider Load Pooling (Deadhead Capture)

When a truck completes a delivery (e.g. at ICD Amingaon) and returns to Betkuchi ISBT:
1. **Backhaul Detection**: System checks if $\text{ReturnPayload} = 0\text{ kg}$ (Empty return trip).
2. **Bipartite Matcher**: Searches pending regional shipments originating near ICD Amingaon heading toward Betkuchi / Khanapara.
3. **Savings Calculation**:
$$\Delta \text{CO}_2\text{ Saved} = \text{CO}_2(\text{Dedicated Dispatched Truck}) - \text{CO}_2(\text{Backhaul Detour})$$

---

## 4. Specific API Payload & Response Contracts

### 4.1 Route Optimization Request (`POST /api/v1/routes/optimize`)

```json
{
  "company_key": "A",
  "depot": {
    "node_id": "GW-HUB-002",
    "name": "Betkuchi ISBT Freight Terminal",
    "lat": 26.1214,
    "lng": 91.7319
  },
  "vehicle_id": "veh-nw-101",
  "vehicle_type": "heavy_truck",
  "shipment_ids": ["GW-SHIP-101", "GW-SHIP-102", "GW-SHIP-103"],
  "alpha": 0.5
}
```

### 4.2 Route Optimization Response

```json
{
  "status": "success",
  "alpha": 0.5,
  "solution_method": "exact_optimal",
  "summary": {
    "total_distance_km": 84.5,
    "total_time_min": 118.0,
    "total_co2_kg": 72.4,
    "baseline_co2_kg": 88.6,
    "co2_saved_pct": 18.3,
    "trees_equivalent": 3.2
  },
  "pareto_points": [
    { "alpha": 0.0, "label": "Greenest", "time_min": 132.0, "co2_kg": 68.1, "co2_saved_pct": 23.1 },
    { "alpha": 0.5, "label": "Balanced (Selected)", "time_min": 118.0, "co2_kg": 72.4, "co2_saved_pct": 18.3 },
    { "alpha": 1.0, "label": "Fastest", "time_min": 102.0, "co2_kg": 88.6, "co2_saved_pct": 0.0 }
  ],
  "legs": [
    {
      "sequence_order": 1,
      "from_stop": "Betkuchi ISBT Freight Terminal",
      "to_stop": "ICD Amingaon Container Depot",
      "from_lat": 26.1214,
      "from_lng": 91.7319,
      "to_lat": 26.1852,
      "to_lng": 91.6811,
      "distance_km": 18.2,
      "time_min": 32.0,
      "co2_kg": 15.8,
      "climate_risk_flag": true,
      "climate_risk_note": "Saraighat Bridge monsoon congestion advisory corridor"
    },
    {
      "sequence_order": 2,
      "from_stop": "ICD Amingaon Container Depot",
      "to_stop": "Bamunimaidam Industrial Estate",
      "from_lat": 26.1852,
      "from_lng": 91.6811,
      "to_lat": 26.1884,
      "to_lng": 91.7821,
      "distance_km": 14.5,
      "time_min": 25.0,
      "co2_kg": 12.4,
      "climate_risk_flag": false,
      "climate_risk_note": ""
    }
  ]
}
```

---

## 5. System Prompt Guide: Operating Claude as the Guwahati Smart Engine

To instruct Claude to act as this **Smart Engine** over Guwahati local data, provide the following prompt:

```markdown
You are the EcoLogix Guwahati Smart Freight & Route Intelligence Engine.
Your domain is the Guwahati Metropolitan Region & Brahmaputra Freight Corridors (Assam, India).

YOUR RULES OF OPERATION:
1. DATASET GROUNDING: Always ground routes, nodes, and waypoints using realistic Guwahati geographic nodes (ICD Amingaon, Betkuchi ISBT, LGBI Airport, Bamunimaidam, Khanapara, Dispur, Fancy Bazar, Jalukbari).
2. DISTANCE CALCULATIONS: Use Haversine distance with a 1.25x Assam road curvature factor for road transit distances.
3. EMISSIONS MATH: Apply GLEC-compliant formulas:
   - Heavy Diesel Truck: Base rate 0.31 L/km * 2.68 kg CO2/L * Load Factor * Congestion Index
   - EV Freight Truck: Base rate 1.15 kWh/km * 0.82 kg CO2/kWh
4. MULTI-OBJECTIVE TRADE-OFF: Support the alpha parameter (alpha=0.0 Greenest, alpha=1.0 Fastest).
5. HAZARD TELEMETRY: Account for local Assam environmental conditions (Saraighat Bridge bottlenecks, Jorabat monsoon waterlogging, Brahmaputra floodplains).
6. BACKHAUL LOAD POOLING: Identify empty return legs and propose load-pooling matches to eliminate deadhead miles.

When answering queries or processing freight requests, output clean, structured analysis containing Distance (km), Duration (min), CO2 Output (kg), avoided CO2 (%), and local risk advisories.
```
