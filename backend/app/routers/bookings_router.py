"""Booking routes for public clients and authenticated client history."""

import threading
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_service import classify_intent, summarize_booking
from app.database import get_db
from app.deps import get_current_user
from app.email_service import send_booking_confirmation, send_booking_verification_otp
from app.models import BillingCycle, Booking, BookingStatus, Screen, User
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
    selected_ids = booking.selected_screen_ids or []
    if selected_ids:
        return [int(screen_id) for screen_id in selected_ids]
    if booking.screen_id is not None:
        return [int(booking.screen_id)]
    return []


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


def _get_booking_screens(db: Session, booking: Booking) -> List[Screen]:
    selected_ids = _get_selected_screen_ids(booking)
    if not selected_ids:
        return []

    screens = db.query(Screen).filter(Screen.id.in_(selected_ids)).all()
    screens_by_id = {screen.id: screen for screen in screens}
    return [screens_by_id[screen_id] for screen_id in selected_ids if screen_id in screens_by_id]


def _reserve_booking_screens(db: Session, booking: Booking):
    screens = _get_booking_screens(db, booking)
    snapshots = booking.selected_screens or []
    slots_map = {s["id"]: s.get("slots", booking.slot_quantity) for s in snapshots}

    for screen in screens:
        slots = slots_map.get(screen.id, booking.slot_quantity)
        if screen.available_slots < slots:
            raise HTTPException(
                status_code=400,
                detail=f"Only {screen.available_slots} slots available for {screen.name}",
            )

    for screen in screens:
        slots = slots_map.get(screen.id, booking.slot_quantity)
        screen.booked_slots += slots


def _release_booking_screens(db: Session, booking: Booking):
    snapshots = booking.selected_screens or []
    slots_map = {s["id"]: s.get("slots", booking.slot_quantity) for s in snapshots}
    for screen in _get_booking_screens(db, booking):
        slots = slots_map.get(screen.id, booking.slot_quantity)
        screen.booked_slots = max(0, screen.booked_slots - slots)


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
        billing_cycle=booking.billing_cycle.value if booking.billing_cycle else "monthly",
        slot_quantity=booking.slot_quantity,
        total_price=float(booking.total_price or 0),
        status=booking.status.value if booking.status else "pending",
        ai_category=booking.ai_category,
        ai_summary=booking.ai_summary,
        created_at=booking.created_at,
        screen_name=_selected_location_label(selected_screens),
        screen_area=_selected_area_label(selected_screens),
        user_name=booking.user.name if booking.user else None,
    )


@router.post("/otp/send", response_model=BookingOtpSendResponse)
def send_booking_otp(req: BookingOtpSendRequest, background_tasks: BackgroundTasks):
    """Send an email OTP for booking verification."""
    try:
        otp_payload = create_booking_otp(str(req.email))
    except OtpRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    def _send_otp_bg():
        sent = send_booking_verification_otp(
            otp_payload["email"],
            otp_payload["code"],
            max(1, (otp_payload["expires_in_seconds"] + 59) // 60),
        )
        if not sent:
            discard_booking_otp(otp_payload["email"])

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

    try:
        billing_cycle = BillingCycle(req.billing_cycle)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid billing cycle") from exc

    total = 0.0
    total_slots_booked = 0
    screen_slots_dict = req.screen_slots or {}

    for screen in selected_screens:
        if billing_cycle == BillingCycle.daily:
            unit_price = float(screen.price_daily or 0)
        elif billing_cycle == BillingCycle.weekly:
            unit_price = float(screen.price_weekly or 0)
        elif billing_cycle == BillingCycle.yearly:
            unit_price = float(screen.price_yearly or 0)
        else:
            unit_price = float(screen.price_monthly or 0)

        slots = screen_slots_dict.get(screen.id) or req.slot_quantity
        total += unit_price * slots
        total_slots_booked += slots

    default_status = config.get("booking_default_status", "pending")
    if default_status == "approved":
        default_status = "confirmed"
    if default_status not in {"pending", "confirmed", "cancelled"}:
        default_status = "pending"

    primary_screen = selected_screens[0]
    selected_screens_snapshot = _build_selected_screens_snapshot(selected_screens, screen_slots_dict)
    
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
        billing_cycle=billing_cycle,
        slot_quantity=req.slot_quantity, # Retain as root default/fallback indicator
        total_price=total,
        status=BookingStatus(default_status),
    )

    if booking.status == BookingStatus.confirmed:
        _reserve_booking_screens(db, booking)

    db.add(booking)
    db.commit()
    db.refresh(booking)
    consume_booking_verification(email, req.email_verification_token)

    location_names = ", ".join(screen.name for screen in selected_screens)
    area_names = ", ".join(dict.fromkeys(screen.area for screen in selected_screens if screen.area))

    try:
        booking.ai_category = await classify_intent(req.ad_description or "General advertisement")
        booking.ai_summary = await summarize_booking({
            "client_name": req.client_name,
            "company": req.company,
            "screen_name": location_names,
            "screen_area": area_names,
            "billing_cycle": billing_cycle.value,
            "slot_quantity": req.slot_quantity,
            "total_price": total,
            "ad_description": req.ad_description,
        })
        db.commit()
        db.refresh(booking)
    except Exception:
        pass

    email_data = {
        "booking_id": booking.id,
        "client_name": req.client_name,
        "company": req.company,
        "screen_name": _selected_location_label(selected_screens_snapshot) or location_names,
        "screen_area": _selected_area_label(selected_screens_snapshot) or area_names,
        "billing_cycle": billing_cycle.value,
        "slot_quantity": req.slot_quantity,
        "total_price": total,
    }
    if email:
        threading.Thread(
            target=send_booking_confirmation,
            args=(email, email_data),
            daemon=True,
        ).start()

    return _booking_to_out(booking)


@router.get("/my", response_model=List[BookingOut])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all bookings for the current authenticated client."""
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_booking_to_out(booking) for booking in bookings]


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
    db.commit()
    db.refresh(booking)
    return _booking_to_out(booking)
