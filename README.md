# EcoLogix — Multimodal Carbon-Aware Logistics Platform

> **"EcoLogix cuts fleet CO₂ without cutting delivery speed — and finds free capacity other companies are already wasting."**

EcoLogix is a logistics intelligence engine that combines GLEC-compliant carbon accounting, real-time bi-objective ($\alpha$-weighted) route optimization, and cross-provider load pooling into an interactive web, desktop, and mobile dashboard.

---

## 🚀 Quick Links
- **[context.md](context.md)**: Architectural specifications, GLEC formulas, and codebase map.
- **[RELEASE.md](RELEASE.md)**: Windows (Tauri) and Android (Capacitor) release and CI/CD guide.
- **[features.md](features.md)**: Feature breakdown & MoSCoW prioritization.
- **[EcoLogix_PRD.md](EcoLogix_PRD.md)**: Comprehensive Product Requirements Document.

---

## 🛠 Tech Stack
- **Web & UI**: React 18, Vite 5, Tailwind CSS, Leaflet / React-Leaflet, Recharts, Lucide Icons
- **Backend API**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2
- **Desktop Shell**: Tauri v2 (Rust + MSVC)
- **Mobile Shell**: Capacitor 8 (Android)
- **Deployment**: Vercel (Web SPA + Serverless Python API rewrite), GitHub Actions (Native Releases)

---

## 💻 Local Development

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Unix)
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev   # Runs on http://localhost:3000 (proxies /api to localhost:8000)
```

---

## 📦 Native Builds

- **Windows Desktop**: `cd frontend && npm run tauri:build`
- **Android APK / AAB**: `cd frontend && npm run android:build`

See **[RELEASE.md](RELEASE.md)** for full packaging, signing, and CI release workflow instructions.