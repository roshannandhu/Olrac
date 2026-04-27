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
_BOOKING_FLOW = "booking"
_ADMIN_PASSWORD_RESET_FLOW = "admin_password_reset"

_pending_otps: dict[str, dict[str, dict]] = {
    _BOOKING_FLOW: {},
    _ADMIN_PASSWORD_RESET_FLOW: {},
}
_verified_sessions: dict[str, dict[str, dict]] = {
    _BOOKING_FLOW: {},
    _ADMIN_PASSWORD_RESET_FLOW: {},
}
_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _seconds_until(target: datetime) -> int:
    return max(0, int((target - _now()).total_seconds()))


def _get_flow_ttl_seconds(flow: str) -> int:
    if flow == _ADMIN_PASSWORD_RESET_FLOW:
        return max(settings.ADMIN_RESET_OTP_TTL_SECONDS, 0)
    return max(settings.BOOKING_OTP_TTL_SECONDS, 0)


def _get_flow_verified_ttl_seconds(flow: str) -> int:
    if flow == _ADMIN_PASSWORD_RESET_FLOW:
        return max(settings.ADMIN_RESET_OTP_VERIFIED_TTL_SECONDS, 0)
    return max(settings.BOOKING_OTP_VERIFIED_TTL_SECONDS, 0)


def _get_flow_max_attempts(flow: str) -> int:
    if flow == _ADMIN_PASSWORD_RESET_FLOW:
        return max(settings.ADMIN_RESET_OTP_MAX_ATTEMPTS, 1)
    return max(settings.BOOKING_OTP_MAX_ATTEMPTS, 1)


def _cleanup_flow_locked(flow: str, now: datetime):
    pending_store = _pending_otps[flow]
    expired_pending = [
        email
        for email, entry in pending_store.items()
        if entry["expires_at"] <= now and entry["resend_available_at"] <= now
    ]
    for email in expired_pending:
        pending_store.pop(email, None)

    verified_store = _verified_sessions[flow]
    expired_sessions = [
        token
        for token, session in verified_store.items()
        if session["expires_at"] <= now
    ]
    for token in expired_sessions:
        verified_store.pop(token, None)


def _create_otp(flow: str, email: str) -> dict:
    normalized_email = _normalize_email(email)
    now = _now()
    ttl_seconds = _get_flow_ttl_seconds(flow)
    pending_store = _pending_otps[flow]

    with _lock:
        _cleanup_flow_locked(flow, now)
        existing = pending_store.get(normalized_email)
        if existing and existing["resend_available_at"] > now:
            raise OtpRateLimitError(_seconds_until(existing["resend_available_at"]))

        code = f"{secrets.randbelow(10 ** _OTP_LENGTH):0{_OTP_LENGTH}d}"
        expires_at = now + timedelta(seconds=ttl_seconds)
        resend_available_at = now + timedelta(seconds=ttl_seconds)
        pending_store[normalized_email] = {
            "code": code,
            "expires_at": expires_at,
            "resend_available_at": resend_available_at,
            "attempts": 0,
        }

    return {
        "email": normalized_email,
        "code": code,
        "expires_in_seconds": ttl_seconds,
        "resend_in_seconds": ttl_seconds,
    }


def _discard_otp(flow: str, email: str):
    normalized_email = _normalize_email(email)
    with _lock:
        _pending_otps[flow].pop(normalized_email, None)


def _verify_otp(flow: str, email: str, otp: str) -> dict:
    normalized_email = _normalize_email(email)
    now = _now()
    pending_store = _pending_otps[flow]
    verified_store = _verified_sessions[flow]
    max_attempts = _get_flow_max_attempts(flow)
    verified_ttl_seconds = _get_flow_verified_ttl_seconds(flow)

    with _lock:
        _cleanup_flow_locked(flow, now)
        entry = pending_store.get(normalized_email)
        if not entry:
            raise OtpExpiredError("This OTP has expired. Request a fresh code to continue.")

        if entry["expires_at"] <= now:
            pending_store.pop(normalized_email, None)
            raise OtpExpiredError("This OTP has expired. Request a fresh code to continue.")

        if entry["code"] != otp:
            entry["attempts"] += 1
            if entry["attempts"] >= max_attempts:
                pending_store.pop(normalized_email, None)
                raise OtpInvalidError("Too many invalid OTP attempts. Request a fresh code to continue.")
            raise OtpInvalidError("Invalid OTP. Please try again.")

        pending_store.pop(normalized_email, None)

        verification_token = secrets.token_urlsafe(32)
        session_expires_at = now + timedelta(seconds=verified_ttl_seconds)
        verified_store[verification_token] = {
            "email": normalized_email,
            "expires_at": session_expires_at,
        }

    return {
        "email": normalized_email,
        "verification_token": verification_token,
        "verified_for_seconds": verified_ttl_seconds,
    }


def _validate_verification(flow: str, email: str, verification_token: str, *, consume: bool) -> bool:
    normalized_email = _normalize_email(email)
    now = _now()
    verified_store = _verified_sessions[flow]

    with _lock:
        _cleanup_flow_locked(flow, now)
        session = verified_store.get(verification_token)
        if not session:
            return False
        if session["expires_at"] <= now or session["email"] != normalized_email:
            verified_store.pop(verification_token, None)
            return False

        if consume:
            verified_store.pop(verification_token, None)

        return True


def create_booking_otp(email: str) -> dict:
    return _create_otp(_BOOKING_FLOW, email)


def discard_booking_otp(email: str):
    """Remove a pending OTP when delivery fails."""
    _discard_otp(_BOOKING_FLOW, email)


def verify_booking_otp(email: str, otp: str) -> dict:
    return _verify_otp(_BOOKING_FLOW, email, otp)


def validate_booking_verification(email: str, verification_token: str) -> bool:
    return _validate_verification(_BOOKING_FLOW, email, verification_token, consume=False)


def consume_booking_verification(email: str, verification_token: str) -> bool:
    return _validate_verification(_BOOKING_FLOW, email, verification_token, consume=True)


def create_admin_password_reset_otp(email: str) -> dict:
    return _create_otp(_ADMIN_PASSWORD_RESET_FLOW, email)


def discard_admin_password_reset_otp(email: str):
    _discard_otp(_ADMIN_PASSWORD_RESET_FLOW, email)


def verify_admin_password_reset_otp(email: str, otp: str) -> dict:
    return _verify_otp(_ADMIN_PASSWORD_RESET_FLOW, email, otp)


def validate_admin_password_reset_verification(email: str, verification_token: str) -> bool:
    return _validate_verification(_ADMIN_PASSWORD_RESET_FLOW, email, verification_token, consume=False)


def consume_admin_password_reset_verification(email: str, verification_token: str) -> bool:
    return _validate_verification(_ADMIN_PASSWORD_RESET_FLOW, email, verification_token, consume=True)
