"""Application configuration loaded from environment variables."""

import logging
import os
import secrets
from pathlib import Path

logger = logging.getLogger(__name__)

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

_WEAK_DEFAULT_SECRET = "olrac-super-secret-change-me"
_SECRET_FILE = BASE_DIR / ".jwt_secret"


def _get_jwt_secret() -> str:
    env_val = os.getenv("JWT_SECRET_KEY", "").strip()
    if env_val and env_val != _WEAK_DEFAULT_SECRET:
        return env_val
    if _SECRET_FILE.exists():
        saved = _SECRET_FILE.read_text().strip()
        if saved:
            return saved
    new_secret = secrets.token_hex(32)
    try:
        _SECRET_FILE.write_text(new_secret)
        try:
            os.chmod(_SECRET_FILE, 0o600)
        except OSError:
            pass
    except OSError:
        pass
    return new_secret


def _env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/olrac_db",
    )

    JWT_SECRET_KEY: str = _get_jwt_secret()
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

    ADMIN_RESET_OTP_TTL_SECONDS: int = int(os.getenv("ADMIN_RESET_OTP_TTL_SECONDS", "600"))
    ADMIN_RESET_OTP_VERIFIED_TTL_SECONDS: int = int(os.getenv("ADMIN_RESET_OTP_VERIFIED_TTL_SECONDS", "1800"))
    ADMIN_RESET_OTP_MAX_ATTEMPTS: int = int(os.getenv("ADMIN_RESET_OTP_MAX_ATTEMPTS", "5"))

    DEFAULT_ADMIN_NAME: str = os.getenv("DEFAULT_ADMIN_NAME", "Admin")
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@olrac.com")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    DEFAULT_ADMIN_COMPANY: str = os.getenv("DEFAULT_ADMIN_COMPANY", "Olrac Adverse")
    DEFAULT_ADMIN_SYNC_PASSWORD: bool = _env_flag("DEFAULT_ADMIN_SYNC_PASSWORD", "false")

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-70b-8192")

    WHATSAPP_ADMIN_NUMBER: str = os.getenv("WHATSAPP_ADMIN_NUMBER", "919876543210")

    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,https://olrac.com,https://www.olrac.com,https://admin.olrac.com",
        ).split(",")
        if origin.strip()
    ]
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    )


settings = Settings()

if settings.DEFAULT_ADMIN_SYNC_PASSWORD and settings.DEFAULT_ADMIN_PASSWORD in ("admin123", "password", ""):
    logger.warning(
        "DEFAULT_ADMIN_SYNC_PASSWORD is enabled with a weak default password. "
        "Set a strong DEFAULT_ADMIN_PASSWORD in your .env file."
    )
