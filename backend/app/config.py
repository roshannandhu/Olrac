"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/olrac_db",
    )

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "olrac-super-secret-change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Olrac")

    BOOKING_OTP_TTL_SECONDS: int = int(os.getenv("BOOKING_OTP_TTL_SECONDS", "120"))
    BOOKING_OTP_VERIFIED_TTL_SECONDS: int = int(os.getenv("BOOKING_OTP_VERIFIED_TTL_SECONDS", "1800"))
    BOOKING_OTP_MAX_ATTEMPTS: int = int(os.getenv("BOOKING_OTP_MAX_ATTEMPTS", "5"))

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-70b-8192")

    WHATSAPP_ADMIN_NUMBER: str = os.getenv("WHATSAPP_ADMIN_NUMBER", "919876543210")

    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,https://www.olrac.com,https://admin.olrac.com",
        ).split(",")
        if origin.strip()
    ]
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    )


settings = Settings()
