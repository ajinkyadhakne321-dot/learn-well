"""
Engineering AI Tutor - FastAPI Application Entry Point.
Initializes routers, static asset mounting, HTML templates, and lifecycle events.
"""
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.health import router as health_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.voice import router as voice_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Local, voice-enabled AI tutor for engineering students. Runs 100% locally with open-weights models."
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure runtime directories exist
settings.ensure_directories()

# Mount Static Files & Audio
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Include API Routers
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(voice_router)


@app.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    """Serve the main Engineering AI Tutor web interface."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "app_name": settings.APP_NAME,
            "version": settings.VERSION,
        },
    )
