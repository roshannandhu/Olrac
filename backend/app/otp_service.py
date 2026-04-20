"""In-memory OTP service for booking email verification."""

from __future__ import annotations

import secrets
import threading
from datetime import datetime, timedelta, timezone

from app.config import settings


class OtpError(Exception):
    """Base OTP service error."""


class OtpRateLimitError(OtpError):
    """Raised when a resend is requested too soon."""

    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Please wait {retry_after_seconds} seconds before requesting a new OTP.")


class OtpExpiredError(OtpError):
    """Raised when an OTP has expired."""


class OtpInvalidError(OtpError):
    """Raised when an OTP or verification token is invalid."""


_OTP_LENGTH = 6
_pending_otps: dict[str, dict] = {}
_verified_sessions: dict[str, dict] = {}
_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _seconds_until(target: datetime) -> int:
    return max(0, int((target - _now()).total_seconds()))


def _cleanup_locked(now: datetime):
    expired_pending = [
        email
        for email, entry in _pending_otps.items()
        if entry["expires_at"] <= now and entry["resend_available_at"] <= now
    ]
    for email in expired_pending:
        _pending_otps.pop(email, None)

    expired_sessions = [
        token
        for token, session in _verified_sessions.items()
        if session["expires_at"] <= now
    ]
    for token in expired_sessions:
        _verified_sessions.pop(token, None)


def create_booking_otp(email: str) -> dict:
    normalized_email = _normalize_email(email)
    now = _now()

    with _lock:
        _cleanup_locked(now)
        existing = _pending_otps.get(normalized_email)
        if existing and existing["resend_available_at"] > now:
            raise OtpRateLimitError(_seconds_until(existing["resend_available_at"]))

        code = f"{secrets.randbelow(10 ** _OTP_LENGTH):0{_OTP_LENGTH}d}"
        expires_at = now + timedelta(seconds=settings.BOOKING_OTP_TTL_SECONDS)
        resend_available_at = now + timedelta(seconds=settings.BOOKING_OTP_TTL_SECONDS)
        _pending_otps[normalized_email] = {
            "code": code,
            "expires_at": expires_at,
            "resend_available_at": resend_available_at,
            "attempts": 0,
        }

    return {
        "email": normalized_email,
        "code": code,
        "expires_in_seconds": max(settings.BOOKING_OTP_TTL_SECONDS, 0),
        "resend_in_seconds": max(settings.BOOKING_OTP_TTL_SECONDS, 0),
    }


def discard_booking_otp(email: str):
    """Remove a pending OTP when delivery fails."""
    normalized_email = _normalize_email(email)
    with _lock:
        _pending_otps.pop(normalized_email, None)


def verify_booking_otp(email: str, otp: str) -> dict:
    normalized_email = _normalize_email(email)
    now = _now()

    with _lock:
        _cleanup_locked(now)
        entry = _pending_otps.get(normalized_email)
        if not entry:
            raise OtpExpiredError("This OTP has expired. Request a fresh code to continue.")

        if entry["expires_at"] <= now:
            _pending_otps.pop(normalized_email, None)
            raise OtpExpiredError("This OTP has expired. Request a fresh code to continue.")

        if entry["code"] != otp:
            entry["attempts"] += 1
            if entry["attempts"] >= max(settings.BOOKING_OTP_MAX_ATTEMPTS, 1):
                _pending_otps.pop(normalized_email, None)
                raise OtpInvalidError("Too many invalid OTP attempts. Request a fresh code to continue.")
            raise OtpInvalidError("Invalid OTP. Please try again.")

        _pending_otps.pop(normalized_email, None)

        verification_token = secrets.token_urlsafe(32)
        session_expires_at = now + timedelta(seconds=settings.BOOKING_OTP_VERIFIED_TTL_SECONDS)
        _verified_sessions[verification_token] = {
            "email": normalized_email,
            "expires_at": session_expires_at,
        }

    return {
        "email": normalized_email,
        "verification_token": verification_token,
        "verified_for_seconds": max(settings.BOOKING_OTP_VERIFIED_TTL_SECONDS, 0),
    }


def validate_booking_verification(email: str, verification_token: str) -> bool:
    normalized_email = _normalize_email(email)
    now = _now()

    with _lock:
        _cleanup_locked(now)
        session = _verified_sessions.get(verification_token)
        if not session:
            return False
        if session["expires_at"] <= now or session["email"] != normalized_email:
            _verified_sessions.pop(verification_token, None)
            return False

        return True


def consume_booking_verification(email: str, verification_token: str) -> bool:
    normalized_email = _normalize_email(email)
    now = _now()

    with _lock:
        _cleanup_locked(now)
        session = _verified_sessions.get(verification_token)
        if not session:
            return False
        if session["expires_at"] <= now or session["email"] != normalized_email:
            _verified_sessions.pop(verification_token, None)
            return False

        _verified_sessions.pop(verification_token, None)
        return True
