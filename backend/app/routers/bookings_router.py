"""Booking routes for public clients and authenticated client history."""

import logging
import threading
from typing import List

logger = logging.getLogger(__name__)

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_service import classify_intent, summarize_booking
from app.database import get_db
import hashlib
from app.config import settings
from app.deps import get_current_user
from datetime import datetime, timezone, timedelta
from app.email_service import send_booking_confirmation, send_booking_verification_otp, _send_html_email, build_quotation_html
from app.invoice_service import generate_pdf_from_html, build_quotation_context
from app.models import Booking, BookingStatus, Screen, User
from app.otp_service import (
    OtpExpiredError,
    OtpInvalidError,
    OtpRateLimitError,
    consume_booking_verification,
    create_booking_otp,
    discard_booking_otp,
    validate_booking_verification,
    verify_booking_otp,
)
from app.quotation_service import (
    build_quotation_items,
    calculate_quotation_totals,
    is_truthy,
    synchronize_booking_pricing,
)
from app.schemas import (
    BookingCreate,
    BookingOtpSendRequest,
    BookingOtpSendResponse,
    BookingOtpVerifyRequest,
    BookingOtpVerifyResponse,
    BookingOut,
    SelectedScreenOut,
)
from app.settings_service import get_merged_settings
from app.slot_sync_service import get_booking_screen_ids, get_booking_slots_map, sync_booked_slots_for_screens

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


def _unique_ids_in_order(values: List[int]) -> List[int]:
    unique_values: List[int] = []
    seen = set()

    for raw_value in values:
        value = int(raw_value)
        if value in seen:
            continue
        seen.add(value)
        unique_values.append(value)

    return unique_values


def _build_selected_screens_snapshot(screens: List[Screen], screen_slots: dict) -> List[dict]:
    return [
        {
            "id": screen.id,
            "name": screen.name,
            "area": screen.area,
            "slots": screen_slots.get(screen.id, 1),
            "base_price": float(screen.base_price or 0),
            "price_unit": screen.price_unit or "day",
        }
        for screen in screens
    ]


def _get_selected_screens_snapshot(booking: Booking) -> List[dict]:
    snapshots = booking.selected_screens or []
    if snapshots:
        return snapshots
    if booking.screen:
        return [
            {
                "id": booking.screen.id,
                "name": booking.screen.name,
                "area": booking.screen.area,
            }
        ]
    return []


def _get_selected_screen_ids(booking: Booking) -> List[int]:
    return get_booking_screen_ids(booking)


def _selected_location_label(snapshots: List[dict]) -> str | None:
    if not snapshots:
        return None

    names = [snapshot.get("name") or f'Screen #{snapshot.get("id", "N/A")}' for snapshot in snapshots]
    if len(names) == 1:
        return names[0]
    return f"{names[0]} + {len(names) - 1} more"


def _selected_area_label(snapshots: List[dict]) -> str | None:
    areas: List[str] = []
    for snapshot in snapshots:
        area = snapshot.get("area")
        if area and area not in areas:
            areas.append(area)

    if not areas:
        return None
    if len(areas) == 1:
        return areas[0]
    return f"{areas[0]} + {len(areas) - 1} more"


def _resolve_selected_screens(db: Session, screen_ids: List[int]) -> List[Screen]:
    screens = db.query(Screen).filter(Screen.id.in_(screen_ids)).all()
    screens_by_id = {screen.id: screen for screen in screens}

    selected_screens: List[Screen] = []
    for screen_id in screen_ids:
        screen = screens_by_id.get(screen_id)
        if not screen:
            raise HTTPException(status_code=404, detail=f"Screen #{screen_id} not found")
        if not screen.is_active:
            raise HTTPException(status_code=400, detail=f"{screen.name} is not active")
        selected_screens.append(screen)

    return selected_screens


def _get_screen_unit_price(screen: Screen, duration_days: int, duration_hours: int) -> float:
    rate = float(screen.base_price or 0)

    if screen.price_unit == "hour":
        return rate * max(1, int(duration_hours or 0))

    if screen.price_unit == "month":
        months = max(1, round((int(duration_days or 0)) / 30))
        return rate * months

    return rate * max(1, int(duration_days or 0))


def _get_booking_screens(db: Session, booking: Booking) -> List[Screen]:
    selected_ids = _get_selected_screen_ids(booking)
    if not selected_ids:
        return []

    screens = db.query(Screen).filter(Screen.id.in_(selected_ids)).all()
    screens_by_id = {screen.id: screen for screen in screens}
    return [screens_by_id[screen_id] for screen_id in selected_ids if screen_id in screens_by_id]


def _reserve_booking_screens(db: Session, booking: Booking):
    """
    Validate that requested slots do not exceed total_slots.
    (We no longer block/increment booked_slots for enquiries).
    """
    screens = _get_booking_screens(db, booking)
    slots_map = get_booking_slots_map(booking)

    for screen in screens:
        slots = slots_map.get(screen.id, booking.slot_quantity)
        if screen.total_slots < slots:
            raise HTTPException(
                status_code=400,
                detail=f"Only {screen.total_slots} max slots allowed for {screen.name}",
            )


def _release_booking_screens(db: Session, booking: Booking):
    """No longer decrement booked_slots as slots are no longer saturated."""
    pass


def _booking_to_out(booking: Booking) -> BookingOut:
    selected_screens = _get_selected_screens_snapshot(booking)
    selected_screen_ids = _get_selected_screen_ids(booking)

    return BookingOut(
        id=booking.id,
        user_id=booking.user_id,
        screen_id=booking.screen_id,
        screen_ids=selected_screen_ids,
        selected_screens=[SelectedScreenOut(**screen) for screen in selected_screens],
        location_count=max(len(selected_screen_ids), 1),
        client_name=booking.client_name,
        company=booking.company,
        email=booking.email,
        phone=booking.phone,
        budget=float(booking.budget) if booking.budget else None,
        ad_description=booking.ad_description,
        polished_description=booking.polished_description,
        duration_label=booking.duration_label or "Custom",
        duration_days=booking.duration_days or 0,
        duration_hours=booking.duration_hours or 0,
        billing_cycle=None,
        slot_quantity=booking.slot_quantity,
        total_price=float(booking.total_price or 0),
        status=booking.status.value if booking.status else "pending",
        ai_category=booking.ai_category,
        ai_summary=booking.ai_summary,
        created_at=booking.created_at,
        screen_name=_selected_location_label(selected_screens),
        screen_area=_selected_area_label(selected_screens),
        user_name=booking.user.name if booking.user else None,
        quotation_token=hashlib.sha256(f"{booking.id}-{booking.email}-{settings.JWT_SECRET_KEY}".encode()).hexdigest(),
    )


@router.post("/otp/send", response_model=BookingOtpSendResponse)
def send_booking_otp(req: BookingOtpSendRequest, background_tasks: BackgroundTasks):
    """Send an email OTP for booking verification."""
    try:
        otp_payload = create_booking_otp(str(req.email))
    except OtpRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail={"message": str(exc), "retry_after_seconds": exc.retry_after_seconds}
        ) from exc

    logger.warning(
        "\n========== OTP CODE (DEV) ==========\n"
        "  Email : %s\n"
        "  Code  : %s\n"
        "  TTL   : %s seconds\n"
        "=====================================",
        otp_payload["email"], otp_payload["code"], otp_payload["expires_in_seconds"],
    )

    def _send_otp_bg():
        sent = send_booking_verification_otp(
            otp_payload["email"],
            otp_payload["code"],
            max(1, (otp_payload["expires_in_seconds"] + 59) // 60),
        )
        if not sent:
            logger.warning("SMTP failed — use the OTP printed above in the terminal.")

    background_tasks.add_task(_send_otp_bg)

    return BookingOtpSendResponse(
        email=otp_payload["email"],
        detail="Verification code sent to your email.",
        expires_in_seconds=otp_payload["expires_in_seconds"],
        resend_in_seconds=otp_payload["resend_in_seconds"],
    )


@router.post("/otp/verify", response_model=BookingOtpVerifyResponse)
def verify_booking_email_otp(req: BookingOtpVerifyRequest):
    """Verify the submitted booking OTP and return a one-time verification token."""
    try:
        result = verify_booking_otp(str(req.email), req.otp)
    except (OtpExpiredError, OtpInvalidError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BookingOtpVerifyResponse(
        email=result["email"],
        detail="Email verified successfully.",
        verification_token=result["verification_token"],
        verified_for_seconds=result["verified_for_seconds"],
    )


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    req: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Create a new public quotation request from the client website."""
    selected_screen_ids = _unique_ids_in_order(
        req.screen_ids or ([req.screen_id] if req.screen_id is not None else [])
    )
    if not selected_screen_ids:
        raise HTTPException(status_code=400, detail="Select at least one location")

    selected_screens = _resolve_selected_screens(db, selected_screen_ids)

    merged_settings = get_merged_settings()
    config = merged_settings["config"]
    min_budget = float(config.get("booking_min_budget") or 0)
    if req.budget is not None and min_budget and req.budget < min_budget:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum booking budget is {min_budget:g}",
        )

    email = str(req.email).strip().lower() if req.email else ""
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email verification is required before requesting a quote.",
        )
    otp_required = config.get("security_otp_booking_enable", True)
    if otp_required:
        if not req.email_verification_token:
            raise HTTPException(
                status_code=400,
                detail="Verify your email before requesting a quote.",
            )
        if not validate_booking_verification(email, req.email_verification_token):
            raise HTTPException(
                status_code=400,
                detail="Your email verification expired. Please verify again to continue.",
            )

    screen_slots_dict = req.screen_slots or {}
    selected_screens_snapshot = _build_selected_screens_snapshot(selected_screens, screen_slots_dict)
    base_seconds = int(config.get("booking_base_slot_duration_seconds", 20))
    quotation_items = build_quotation_items(
        selected_screens_snapshot,
        duration_days=req.duration_days,
        duration_hours=req.duration_hours,
        base_slot_duration=base_seconds,
        default_slot_quantity=req.slot_quantity,
    )

    default_status = config.get("booking_default_status", "pending")
    if default_status == "approved":
        default_status = "confirmed"
    if default_status not in {"pending", "confirmed", "cancelled"}:
        default_status = "pending"

    primary_screen = selected_screens[0]
    affected_screen_ids = [screen.id for screen in selected_screens]

    tax_enabled = is_truthy(config.get("quotation_tax_enabled", True), True)
    tax_rate = float(config.get("quotation_tax_rate", 18)) if tax_enabled else 0.0
    quotation_totals = calculate_quotation_totals(
        quotation_items,
        discount=0,
        tax_rate=tax_rate,
        tax_enabled=tax_enabled,
    )
    total = quotation_totals["grand_total"]

    now = datetime.now(timezone.utc)
    delta_days = req.duration_days or 30
    duration_start_str = now.strftime("%d %b %Y")
    duration_end_str = (now + timedelta(days=delta_days)).strftime("%d %b %Y")
    total_days_text = req.duration_label or f"{delta_days} Days"

    location_names = ", ".join(screen.name for screen in selected_screens)
    area_names = ", ".join(dict.fromkeys(screen.area for screen in selected_screens if screen.area))

    ai_category = None
    ai_summary = None
    try:
        ai_category = await classify_intent(req.ad_description or "General advertisement")
        ai_summary = await summarize_booking({
            "client_name": req.client_name,
            "company": req.company,
            "screen_name": location_names,
            "screen_area": area_names,
            "duration": req.duration_label,
            "slot_quantity": req.slot_quantity,
            "total_price": total,
            "ad_description": req.ad_description,
        })
    except Exception:
        logger.warning("AI enrichment unavailable; proceeding without AI fields", exc_info=True)

    if isinstance(ai_category, str) and len(ai_category) > 100:
        ai_category = None
    if isinstance(ai_summary, str) and len(ai_summary) > 500:
        ai_summary = None

    booking = Booking(
        user_id=None,
        screen_id=primary_screen.id,
        selected_screen_ids=selected_screen_ids,
        selected_screens=selected_screens_snapshot,
        client_name=req.client_name,
        company=req.company,
        email=email,
        phone=req.phone,
        budget=req.budget,
        ad_description=req.ad_description,
        polished_description=req.polished_description,
        duration_label=req.duration_label,
        duration_days=req.duration_days,
        duration_hours=req.duration_hours,
        billing_cycle=None,
        slot_quantity=req.slot_quantity,
        total_price=quotation_totals["grand_total"],
        status=BookingStatus(default_status),
        ai_category=ai_category,
        ai_summary=ai_summary,
        quotation_data={
            "pricing_mode": "booking",
            "items": quotation_items,
            "subtotal": quotation_totals["subtotal"],
            "discount": quotation_totals["discount"],
            "tax_enabled": tax_enabled,
            "tax_rate": tax_rate,
            "grand_total": quotation_totals["grand_total"],
            "duration_start": duration_start_str,
            "duration_end": duration_end_str,
            "total_days_text": total_days_text,
        }
    )

    if booking.status == BookingStatus.confirmed:
        _reserve_booking_screens(db, booking)

    db.add(booking)
    sync_booked_slots_for_screens(db, affected_screen_ids)
    db.commit()
    db.refresh(booking)
    if otp_required and req.email_verification_token:
        consume_booking_verification(email, req.email_verification_token)

    email_data = {
        "booking_id": booking.id,
        "client_name": req.client_name,
        "company": req.company,
        "screen_name": _selected_location_label(selected_screens_snapshot) or location_names,
        "screen_area": _selected_area_label(selected_screens_snapshot) or area_names,
        "duration": req.duration_label,
        "slot_quantity": req.slot_quantity,
        "total_price": total,
    }
    if email:
        async def _auto_email_quotation(booking_id: int):
            from app.database import SessionLocal
            with SessionLocal() as session:
                b = session.query(Booking).filter(Booking.id == booking_id).first()
                if not b: return
                context = build_quotation_context(b)
                b_snapshots = list(b.selected_screens or [])
                if not b_snapshots and b.screen:
                    b_snapshots = [{"id": b.screen.id, "name": b.screen.name, "area": b.screen.area}]
                company = {
                    "name": context.get("company_name") or "",
                    "phone": context.get("contact_phone") or "",
                    "email": context.get("contact_email") or "",
                    "address": context.get("address") or "",
                    "logo_url": context.get("logo_url") or "",
                    "seal_url": context.get("seal_url") or "",
                    "location_label": _selected_area_label(b_snapshots) or _selected_location_label(b_snapshots) or "",
                    "bank_name": context.get("bank_name") or "",
                    "account_name": context.get("account_name") or "",
                    "account_number": context.get("account_number") or "",
                    "ifsc": context.get("ifsc") or "",
                    "upi": context.get("upi") or "",
                    "tax_rate": context.get("tax_rate") or "18",
                    "tax_enabled": config.get("quotation_tax_enabled", True),
                    "booking_base_slot_duration_seconds": config.get("booking_base_slot_duration_seconds", 20),
                }
                html = build_quotation_html(b, b.quotation_data or {}, company)
                pdf = await generate_pdf_from_html(html)
                
                subject = f"Your Quotation from {company['name'] or 'Us'} (Quote #{b.id})"
                body = f"<p>Hello {b.client_name},</p><p>Please find attached your requested quotation for the {location_names} screens.</p>"
                
                emails_to_send = [b.email]
                admin_email = config.get("admin_email")
                if admin_email:
                    emails_to_send.append(admin_email)
                    
                for to_email in emails_to_send:
                    _send_html_email(
                        to_email,
                        subject=subject,
                        html_body=body,
                        pdf_bytes=pdf,
                        pdf_filename=f"Quotation_OLRAC{b.id}.pdf"
                    )

        background_tasks.add_task(_auto_email_quotation, booking.id)

    return _booking_to_out(booking)


@router.get("/my", response_model=List[BookingOut])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all bookings for the current authenticated client."""
    merged_config = get_merged_settings()["config"]
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    pricing_changed = False
    for booking in bookings:
        pricing_changed = synchronize_booking_pricing(booking, merged_config) or pricing_changed
    if pricing_changed:
        db.commit()
    return [_booking_to_out(booking) for booking in bookings]


from fastapi.responses import StreamingResponse
from io import BytesIO

@router.get("/{booking_id}/quotation/pdf")
async def get_public_quotation_pdf(
    booking_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Download the generated Quotation PDF via a secure token."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    expected_token = hashlib.sha256(f"{booking.id}-{booking.email}-{settings.JWT_SECRET_KEY}".encode()).hexdigest()
    if token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid or expired secure token")

    merged_settings = get_merged_settings()
    config = merged_settings["config"]
    if synchronize_booking_pricing(booking, config):
        db.commit()
        db.refresh(booking)
    
    # We need location names for company context
    snapshots = list(booking.selected_screens or [])
    if not snapshots and booking.screen:
        snapshots = [{"id": booking.screen.id, "name": booking.screen.name, "area": booking.screen.area}]

    context = build_quotation_context(booking)
    company = {
        "name": context.get("company_name") or "",
        "phone": context.get("contact_phone") or "",
        "email": context.get("contact_email") or "",
        "address": context.get("address") or "",
        "logo_url": context.get("logo_url") or "",
        "seal_url": context.get("seal_url") or "",
        "location_label": _selected_area_label(snapshots) or _selected_location_label(snapshots) or "",
        "bank_name": context.get("bank_name") or "",
        "account_name": context.get("account_name") or "",
        "account_number": context.get("account_number") or "",
        "ifsc": context.get("ifsc") or "",
        "upi": context.get("upi") or "",
        "tax_rate": context.get("tax_rate") or "18",
        "tax_enabled": config.get("quotation_tax_enabled", True),
        "booking_base_slot_duration_seconds": config.get("booking_base_slot_duration_seconds", 20),
    }

    quotation_data = booking.quotation_data or {}
    html = build_quotation_html(booking, quotation_data, company)
    pdf_bytes = await generate_pdf_from_html(html)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Quotation_OLRAC{booking.id}.pdf"'},
    )


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_my_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a client to cancel their own pending or confirmed booking."""
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    if booking.status == BookingStatus.confirmed:
        _release_booking_screens(db, booking)

    booking.status = BookingStatus.cancelled
    sync_booked_slots_for_screens(db, _get_selected_screen_ids(booking))
    db.commit()
    db.refresh(booking)
    return _booking_to_out(booking)
