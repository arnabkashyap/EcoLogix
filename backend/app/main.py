"""
EcoLogix FastAPI Application Entrypoint.
Serves backend API endpoints and mounts production frontend static files if built.
"""

import sys
import os

# Guarantee project root is at head of sys.path for virtual linters & direct execution
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.db.database import Base, engine
from backend.app.db.seed import seed_database
from backend.app.api import auth, routes, jobs, loadpool, emissions, data, impact, lookup, driver

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

# Seed Initial Demo Data
try:
    seed_database()
except Exception as e:
    print(f"Database already seeded or seeding notice: {e}")

app = FastAPI(
    title="EcoLogix API",
    description="Multimodal Supply Chain Route & Carbon-Aware Logistics Engine API",
    version="1.0.0",
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(routes.router, prefix="/api/v1/routes", tags=["Routes"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(loadpool.router, prefix="/api/v1/loadpool", tags=["Load Pool"])
app.include_router(emissions.router, prefix="/api/v1/emissions", tags=["Emissions"])
app.include_router(impact.router, prefix="/api/v1/impact", tags=["Impact"])
app.include_router(lookup.router, prefix="/api/v1/lookup", tags=["Lookup"])
app.include_router(data.router, prefix="/api/v1", tags=["Data"])
app.include_router(driver.router, prefix="/api/v1/driver", tags=["Driver API"])
app.include_router(driver.router, prefix="/api/driver", tags=["Driver Mobile"])


@app.get("/api/health")
def health_check():
    return {
        "app": "EcoLogix",
        "status": "online",
        "pitch": "EcoLogix cuts fleet CO2 without cutting delivery speed — and finds free capacity other companies are already wasting.",
    }


# Serve Frontend Static Build if available
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to take precedence
        if full_path.startswith("api/"):
            return None
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
