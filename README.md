# EcoLogix — Multimodal Carbon-Aware Logistics & Route Intelligence Platform

> **"EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting."**

EcoLogix is an enterprise-grade logistics intelligence platform that unifies **GLEC-compliant carbon accounting**, real-time **bi-objective ($\alpha$-weighted) combinatorial route optimization**, **cross-provider load pooling**, and **weather hazard telemetry** into an interactive web dashboard and mobile in-cab driver portal.

---

## 🚀 Key Platform Highlights

- **Dual-Interface System**:
  - **Consumer Hub (`/`)**: High-fidelity logistics strategy console with interactive Leaflet GIS map, Recharts Pareto frontier visualizer, side-by-side route comparison, EV fleet scenario simulation, and a **Liquid Glass** floating dock navigation bar.
  - **Driver Portal (`/driver`)**: Mobile-first in-cab driver interface featuring live GPS telemetry simulation, step-by-step waypoint execution, weather hazard advisories (flood risk & wind penalties), and 1-click backhaul load acceptance.
- **GLEC-Compliant Emissions Engine**: Accurate Well-to-Wheel (WTW) carbon modeling accounting for vehicle fuel profiles, empty/laden weight ratios, and real-time congestion multipliers.
- **Bi-Objective $\alpha$-Optimizer**: Continuous Pareto frontier solver evaluating the trade-off between transit time ($\alpha = 0$) and carbon emissions ($\alpha = 1$).
- **Cross-Company Load Pooling**: Bipartite matching engine capturing underutilized backhaul capacity to eliminate empty deadhead truck miles.
- **Cross-Platform Native Shells**: Windows desktop executable (Tauri v2) and Android mobile app (Capacitor 8).

---

## 📚 Documentation Index

| Document | Purpose |
|---|---|
| **[context.md](context.md)** | Technical architecture, mathematical formulations, GLEC specifications, and codebase map |
| **[USER_FLOWS.md](USER_FLOWS.md)** | End-to-end interactive workflows for Consumer Hub and Driver Portal |
| **[features.md](features.md)** | Complete feature matrix, MoSCoW prioritization, and implementation verification |
| **[data-flow-dynamic.md](data-flow-dynamic.md)** | Regional telemetry data pipelines and API payload contracts |
| **[EcoLogix_PRD.md](EcoLogix_PRD.md)** | Comprehensive Product Requirements Document |
| **[RELEASE.md](RELEASE.md)** | Windows (Tauri v2) & Android (Capacitor 8) packaging, signing, and CI/CD guide |

---

## 🛠 Tech Stack

- **Frontend & UI**:
  - React 18, Vite 5, React Router v7
  - Tailwind CSS + Custom Liquid Glass & Glassmorphism Design System
  - Leaflet & React-Leaflet (Interactive GIS Mapping)
  - Recharts (Pareto Frontier Analytics)
  - Lucide React (Icons)
- **Backend Core**:
  - Python 3.11+ / 3.14, FastAPI, Uvicorn
  - SQLAlchemy ORM & SQLite (Zero-config, cloud & offline portable)
  - Pydantic v2 (Data Validation & Schemas)
- **Desktop & Mobile Shells**:
  - **Desktop**: Tauri v2 (Rust + MSVC)
  - **Mobile**: Capacitor 8 (Android SDK / Gradle)
- **Deployment**:
  - **Web & API**: Vercel Monorepo (Vite SPA + Serverless Python API)
  - **CI/CD**: GitHub Actions automated release pipeline

---

## 💻 Local Development Setup

### 1. Backend Service (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend Swagger API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Application (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:3000` (or `http://localhost:5173`) and automatically proxies `/api` requests to the local FastAPI backend.

---

## 📦 Native Desktop & Mobile Builds

### Windows Desktop (Tauri v2)
```bash
cd frontend
npm install
npm run tauri:build
```
Outputs `.msi` and `.exe` installers in `frontend/src-tauri/target/release/bundle/`.

### Android Mobile (Capacitor 8)
```bash
cd frontend
npm install
npm run build:native
npx cap sync android
npm run android:build   # Outputs release .aab and .apk
```

For full keystore generation, release signing, and CI/CD automation instructions, refer to **[RELEASE.md](RELEASE.md)**.

---

## 🌐 Cloud Deployment (Vercel)

The repository is pre-configured for automated deployment on **Vercel**:
- `vercel.json` coordinates building the frontend React application and rewriting `/api/(.*)` requests to `api/index.py` (FastAPI Serverless Handler).
- Automatic CI builds compile on push to `main`.