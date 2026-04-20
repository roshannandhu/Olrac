"""Olrac Adverse FastAPI application entry point."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import hash_password
from app.config import settings
from app.database import Base, SessionLocal, engine
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
        admin = db.query(User).filter(User.email == "admin@olrac.com").first()
        if not admin:
            from app.models import UserRole

            admin = User(
                name="Admin",
                email="admin@olrac.com",
                password_hash=hash_password("admin123"),
                role=UserRole.admin,
                company="Olrac Adverse",
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin created: admin@olrac.com / admin123")
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

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


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
