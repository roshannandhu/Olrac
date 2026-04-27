"""Olrac Adverse FastAPI application entry point."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.default_admin import ensure_default_admin
from app.models import Booking, Screen, User  # noqa: F401
from app.routers.admin_router import router as admin_router
from app.routers.ai_router import router as ai_router
from app.routers.auth_router import router as auth_router
from app.routers.bookings_router import router as bookings_router
from app.routers.public_settings_router import router as public_settings_router
from app.routers.screens_router import router as screens_router
from app.schema_maintenance import ensure_schema_updates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates(engine)
    logger.info("Database tables created/verified.")

    db = SessionLocal()
    try:
        admin = ensure_default_admin(db, sync_password=settings.DEFAULT_ADMIN_SYNC_PASSWORD)
        if admin:
            logger.info("Default admin ready: %s", admin.email)
    finally:
        db.close()

    yield
    logger.info("Shutting down Olrac Adverse.")


app = FastAPI(
    title="Olrac Adverse API",
    description="Advertising platform for physical screen ad-slot booking",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(screens_router)
app.include_router(bookings_router)
app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(public_settings_router)

from pathlib import Path
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
def root():
    return {
        "name": "Olrac Adverse API",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
