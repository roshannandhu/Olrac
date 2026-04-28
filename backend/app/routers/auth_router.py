"""Authentication routes: signup, login, profile."""

import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

# ── Login rate limiter ────────────────────────────────────────────────────────
_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_LOCKOUT_SECONDS = 15 * 60  # 15 minutes

_login_records: dict[str, dict] = {}
_login_lock = threading.Lock()


def _rate_limit_check(key: str) -> None:
    now = time.monotonic()
    with _login_lock:
        rec = _login_records.get(key)
        if not rec:
            return
        locked_until = rec.get("locked_until")
        if locked_until:
            if now < locked_until:
                remaining = int(locked_until - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed attempts. Try again in {remaining} seconds.",
                    headers={"Retry-After": str(remaining)},
                )
            # Lockout expired — reset
            _login_records.pop(key, None)


def _rate_limit_failure(key: str) -> None:
    now = time.monotonic()
    with _login_lock:
        rec = _login_records.setdefault(key, {"count": 0, "locked_until": None})
        rec["count"] += 1
        if rec["count"] >= _LOGIN_MAX_ATTEMPTS:
            rec["locked_until"] = now + _LOGIN_LOCKOUT_SECONDS


def _rate_limit_clear(key: str) -> None:
    with _login_lock:
        _login_records.pop(key, None)

from app.default_admin import ensure_default_admin
from app.database import get_db
from app.models import User, UserRole
from app.email_service import send_admin_password_reset_otp
from app.otp_service import (
    OtpExpiredError,
    OtpInvalidError,
    OtpRateLimitError,
    consume_admin_password_reset_verification,
    create_admin_password_reset_otp,
    discard_admin_password_reset_otp,
    verify_admin_password_reset_otp,
)
from app.schemas import (
    AdminForgotPasswordRequest,
    AdminForgotPasswordResetRequest,
    AdminForgotPasswordSendResponse,
    AdminForgotPasswordVerifyRequest,
    AdminForgotPasswordVerifyResponse,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.auth import hash_password, verify_password, create_access_token
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Register a new client user."""
    normalized_email = _normalize_email(str(req.email))
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        name=req.name,
        email=normalized_email,
        password_hash=hash_password(req.password),
        role=UserRole.client,
        company=req.company,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT."""
    ensure_default_admin(db)

    normalized_email = _normalize_email(str(req.email))
    client_ip = request.client.host if request.client else "unknown"
    email_key = f"email:{normalized_email}"
    ip_key = f"ip:{client_ip}"

    _rate_limit_check(email_key)
    _rate_limit_check(ip_key)

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(req.password, user.password_hash):
        _rate_limit_failure(email_key)
        _rate_limit_failure(ip_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _rate_limit_clear(email_key)
    _rate_limit_clear(ip_key)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.post("/admin/forgot-password/send-otp", response_model=AdminForgotPasswordSendResponse)
def send_admin_forgot_password_otp(
    req: AdminForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send an OTP to an admin email for password reset."""
    ensure_default_admin(db)

    normalized_email = _normalize_email(str(req.email))
    admin = (
        db.query(User)
        .filter(User.email == normalized_email, User.role == UserRole.admin)
        .first()
    )
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found")

    try:
        otp_payload = create_admin_password_reset_otp(normalized_email)
    except OtpRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    sent = send_admin_password_reset_otp(
        otp_payload["email"],
        otp_payload["code"],
        max(1, (otp_payload["expires_in_seconds"] + 59) // 60),
    )
    if not sent:
        discard_admin_password_reset_otp(otp_payload["email"])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP is not configured or the OTP email could not be sent.",
        )

    return AdminForgotPasswordSendResponse(
        email=otp_payload["email"],
        detail="Password reset code sent to your admin email.",
        expires_in_seconds=otp_payload["expires_in_seconds"],
        resend_in_seconds=otp_payload["resend_in_seconds"],
    )


@router.post("/admin/forgot-password/verify-otp", response_model=AdminForgotPasswordVerifyResponse)
def verify_admin_forgot_password_otp(req: AdminForgotPasswordVerifyRequest):
    """Verify an admin password reset OTP and return a one-time reset token."""
    try:
        result = verify_admin_password_reset_otp(_normalize_email(str(req.email)), req.otp)
    except (OtpExpiredError, OtpInvalidError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AdminForgotPasswordVerifyResponse(
        email=result["email"],
        detail="OTP verified successfully.",
        reset_token=result["verification_token"],
        verified_for_seconds=result["verified_for_seconds"],
    )


@router.post("/admin/forgot-password/reset")
def reset_admin_password(
    req: AdminForgotPasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Reset an admin password after OTP verification."""
    normalized_email = _normalize_email(str(req.email))
    admin = (
        db.query(User)
        .filter(User.email == normalized_email, User.role == UserRole.admin)
        .first()
    )
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found")

    if not consume_admin_password_reset_verification(normalized_email, req.reset_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset session expired. Verify the OTP again.",
        )

    admin.password_hash = hash_password(req.new_password)
    db.commit()

    return {"detail": "Admin password updated successfully."}
