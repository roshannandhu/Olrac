"""Admin-only routes: manage bookings, screens, and platform insights."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from io import BytesIO
import asyncio
import json
import logging
import os
import shutil
import uuid
from typing import List

import httpx

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import get_db
from app.deps import require_admin
from app.email_service import build_quotation_html, send_quotation_email
from app.invoice_service import (
    build_invoice_context,
    build_invoice_filename,
    generate_invoice_docx_bytes,
    generate_invoice_pdf_bytes,
    generate_pdf_from_html,
    build_quotation_context,
)
from app.settings_service import get_merged_settings, invalidate_settings_cache
from app.models import Booking, BookingStatus, Screen, SystemSettings, User, UserRole
from app.quotation_service import (
    get_effective_quotation_total,
    normalize_quotation_data,
    synchronize_booking_pricing,
)
from app.schemas import (
    AdminProfileUpdate,
    AdminUserCreate,
    AdminUserUpdate,
    AnalyticsOut,
    BookingOut,
    BookingStatusPoint,
    BookingStatusUpdate,
    BookingTrendPoint,
    DashboardSummaryOut,
    QuotationSendRequest,
    QuotationUpdateRequest,
    RevenueAnalysisPoint,
    ScreenCreate,
    ScreenOut,
    ScreenUpdate,
    SettingsOut,
    SettingsUpdate,
    TimeSlotUsagePoint,
    TopCustomerPoint,
    TopLocationPoint,
    UserOut,
)
from app.slot_sync_service import get_booking_screen_ids, get_booking_slots_map, sync_booked_slots_for_screens

router = APIRouter(prefix="/api/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _screen_to_out(screen: Screen) -> ScreenOut:
    return ScreenOut(
        id=screen.id,
        name=screen.name,
        area=screen.area,
        description=screen.description,
        footfall=screen.footfall,
        base_price=float(screen.base_price or 0),
        price_unit=screen.price_unit or "day",
        total_slots=screen.total_slots,
        booked_slots=screen.booked_slots,
        available_slots=screen.available_slots,
        latitude=float(screen.latitude) if screen.latitude is not None else None,
        longitude=float(screen.longitude) if screen.longitude is not None else None,
        image_url=screen.image_url,
        promo_video_url=screen.promo_video_url,
        additional_images=screen.additional_images or [],
        gallery_order=screen.gallery_order or [],
        is_active=screen.is_active,
        created_at=screen.created_at,
    )


def _booking_reference_for_screen(db: Session, screen_id: int) -> int | None:
    bookings = db.query(Booking).all()

    for booking in bookings:
        if booking.screen_id == screen_id:
            return booking.id

        for selected_id in booking.selected_screen_ids or []:
            try:
                if int(selected_id) == screen_id:
                    return booking.id
            except (TypeError, ValueError):
                continue

        for snapshot in booking.selected_screens or []:
            if not isinstance(snapshot, dict):
                continue
            try:
                if int(snapshot.get("id")) == screen_id:
                    return booking.id
            except (TypeError, ValueError):
                continue

    return None


def _normalize_selected_screen_snapshots(booking: Booking) -> tuple[list[dict], list[int], bool]:
    raw_snapshots = list(booking.selected_screens or [])
    fallback_screen_ids = get_booking_screen_ids(booking)
    normalized_snapshots: list[dict] = []
    normalized_screen_ids: list[int] = []
    changed = False

    for index, snapshot in enumerate(raw_snapshots):
        if not isinstance(snapshot, dict):
            changed = True
            continue

        resolved_id = snapshot.get("id")
        if resolved_id is None and index < len(fallback_screen_ids):
            resolved_id = fallback_screen_ids[index]
            changed = True
        if resolved_id is None and booking.screen_id is not None:
            resolved_id = booking.screen_id
            changed = True

        if resolved_id is None:
            changed = True
            continue

        resolved_id = int(resolved_id)
        resolved_slots = int(snapshot.get("slots") or booking.slot_quantity or 1)
        normalized_snapshot = {
            "id": resolved_id,
            "name": snapshot.get("name") or (booking.screen.name if booking.screen and booking.screen_id == resolved_id else f"Screen #{resolved_id}"),
            "area": snapshot.get("area") or (booking.screen.area if booking.screen and booking.screen_id == resolved_id else ""),
            "slots": resolved_slots,
            "footfall": snapshot.get("footfall"),
            "base_price": float(snapshot["base_price"]) if snapshot.get("base_price") not in (None, "") else None,
            "price_unit": snapshot.get("price_unit"),
        }
        if normalized_snapshot != snapshot:
            changed = True

        normalized_snapshots.append(normalized_snapshot)
        normalized_screen_ids.append(resolved_id)

    if normalized_snapshots:
        expected_ids = [int(screen_id) for screen_id in (booking.selected_screen_ids or [])]
        if expected_ids != normalized_screen_ids:
            changed = True
        return normalized_snapshots, normalized_screen_ids, changed

    if booking.screen:
        fallback_snapshot = [{
            "id": booking.screen.id,
            "name": booking.screen.name,
            "area": booking.screen.area,
            "slots": int(booking.slot_quantity or 1),
            "footfall": booking.screen.footfall,
            "base_price": float(booking.screen.base_price or 0),
            "price_unit": booking.screen.price_unit or "day",
        }]
        fallback_ids = [int(booking.screen.id)]
        changed = changed or bool(raw_snapshots) or list(booking.selected_screen_ids or []) != fallback_ids
        return fallback_snapshot, fallback_ids, changed

    fallback_ids = [int(screen_id) for screen_id in (booking.selected_screen_ids or []) if screen_id is not None]
    return [], fallback_ids, changed


def _normalized_location_label(booking: Booking) -> str:
    snapshots, _, _ = _normalize_selected_screen_snapshots(booking)
    labels = [s.get("name") or s.get("area") or f'Screen #{s.get("id", "N/A")}' for s in snapshots]
    return ", ".join(labels) if labels else ""


def _booking_to_out(booking: Booking) -> BookingOut:
    selected_screens, selected_screen_ids, _ = _normalize_selected_screen_snapshots(booking)
    location_count = max(len(selected_screen_ids), 1)
    location_names = [screen.get("name") or f'Screen #{screen.get("id", "N/A")}' for screen in selected_screens]
    location_areas = []
    for screen in selected_screens:
        area = screen.get("area")
        if area and area not in location_areas:
            location_areas.append(area)

    return BookingOut(
        id=booking.id,
        user_id=booking.user_id,
        screen_id=booking.screen_id,
        screen_ids=[int(screen_id) for screen_id in selected_screen_ids],
        selected_screens=selected_screens,
        location_count=location_count,
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
        screen_name=(
            location_names[0]
            if len(location_names) <= 1
            else f"{location_names[0]} + {len(location_names) - 1} more"
        ) if location_names else None,
        screen_area=(
            location_areas[0]
            if len(location_areas) <= 1
            else f"{location_areas[0]} + {len(location_areas) - 1} more"
        ) if location_areas else None,
        user_name=booking.user.name if booking.user else None,
    )


def _get_booking_screen_ids(booking: Booking) -> list[int]:
    return get_booking_screen_ids(booking)


def _get_booking_screens(db: Session, booking: Booking) -> list[Screen]:
    selected_ids = _get_booking_screen_ids(booking)
    if not selected_ids:
        return []

    screens = db.query(Screen).filter(Screen.id.in_(selected_ids)).all()
    screens_by_id = {screen.id: screen for screen in screens}
    return [screens_by_id[screen_id] for screen_id in selected_ids if screen_id in screens_by_id]


def _get_screen_slots_map(booking: Booking) -> dict:
    return get_booking_slots_map(booking)


def _reserve_booking_screens(db: Session, booking: Booking):
    """
    Validate that requested slots do not exceed total_slots.
    (We no longer block/increment booked_slots for enquiries).
    """
    screens = _get_booking_screens(db, booking)
    slots_map = _get_screen_slots_map(booking)

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


def _build_legacy_analytics(db: Session) -> AnalyticsOut:
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    screens = db.query(Screen).all()

    total_revenue = sum(
        float(booking.total_price or 0)
        for booking in bookings
        if booking.status == BookingStatus.confirmed
    )
    confirmed = sum(1 for booking in bookings if booking.status == BookingStatus.confirmed)
    pending = sum(1 for booking in bookings if booking.status == BookingStatus.pending)
    cancelled = sum(1 for booking in bookings if booking.status == BookingStatus.cancelled)
    active_screens = sum(1 for screen in screens if screen.is_active)

    category_counts: dict[str, int] = {}
    for booking in bookings:
        category = booking.ai_category or "Uncategorized"
        category_counts[category] = category_counts.get(category, 0) + 1

    monthly_revenue = defaultdict(float)
    for booking in bookings:
        if booking.status == BookingStatus.confirmed and booking.created_at:
            monthly_revenue[booking.created_at.strftime("%Y-%m")] += float(booking.total_price or 0)

    return AnalyticsOut(
        total_revenue=total_revenue,
        total_bookings=len(bookings),
        confirmed_bookings=confirmed,
        pending_bookings=pending,
        cancelled_bookings=cancelled,
        total_screens=len(screens),
        active_screens=active_screens,
        category_breakdown=[
            {"category": label, "count": count}
            for label, count in sorted(category_counts.items(), key=lambda item: -item[1])
        ],
        monthly_revenue=[
            {"month": month, "revenue": revenue}
            for month, revenue in sorted(monthly_revenue.items())
        ],
        recent_bookings=[_booking_to_out(booking) for booking in bookings[:10]],
    )


@router.get("/bookings", response_model=List[BookingOut])
def list_all_bookings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    merged_config = get_merged_settings()["config"]
    bookings = db.query(Booking).order_by(Booking.created_at.asc(), Booking.id.asc()).all()
    pricing_changed = False
    for booking in bookings:
        normalized_snapshots, normalized_screen_ids, snapshots_changed = _normalize_selected_screen_snapshots(booking)
        if snapshots_changed:
            booking.selected_screens = normalized_snapshots
            booking.selected_screen_ids = normalized_screen_ids
            pricing_changed = True
        pricing_changed = synchronize_booking_pricing(booking, merged_config) or pricing_changed
    if pricing_changed:
        db.commit()
    return [_booking_to_out(booking) for booking in bookings]


@router.patch("/bookings/{booking_id}/status", response_model=BookingOut)
def update_booking_status(
    booking_id: int,
    req: BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    affected_screen_ids = _get_booking_screen_ids(booking)
    old_status = booking.status
    new_status = BookingStatus(req.status)

    if old_status != BookingStatus.confirmed and new_status == BookingStatus.confirmed:
        _reserve_booking_screens(db, booking)

    if old_status == BookingStatus.confirmed and new_status != BookingStatus.confirmed:
        _release_booking_screens(db, booking)

    booking.status = new_status
    sync_booked_slots_for_screens(db, affected_screen_ids)
    db.commit()
    db.refresh(booking)
    return _booking_to_out(booking)


@router.get("/bookings/{booking_id}/invoice")
async def download_booking_invoice(
    booking_id: int,
    format: str = Query(..., pattern="^(pdf|docx)$"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    context = build_invoice_context(booking)

    try:
        if format == "pdf":
            file_bytes = await generate_invoice_pdf_bytes(context)
            media_type = "application/pdf"
        else:
            file_bytes = await run_in_threadpool(generate_invoice_docx_bytes, context)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    except Exception as exc:
        logger.exception("Invoice generation failed for booking_id=%s format=%s", booking_id, format)
        raise HTTPException(status_code=500, detail=f"Failed to generate {format.upper()} invoice") from exc

    filename = build_invoice_filename(context["invoice_id"], format)
    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/bookings/{booking_id}/quotation")
def get_quotation_data(
    booking_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    merged_config = get_merged_settings()["config"]
    if synchronize_booking_pricing(booking, merged_config):
        db.commit()
        db.refresh(booking)

    context = build_quotation_context(booking)
    location_label = context.get("location") or ""
    
    # Date Calculations
    start_date = booking.created_at or datetime.now(timezone.utc)
    
    delta_days = booking.duration_days or 30
    end_date = start_date + timedelta(days=delta_days)
    
    total_days = delta_days
    duration_start_str = start_date.strftime("%d %b %Y")
    duration_end_str = end_date.strftime("%d %b %Y")
    duration_text = booking.duration_label or f"{total_days} Days"

    base_slot_duration = merged_config.get("booking_base_slot_duration_seconds", 20)

    normalized_quotation = booking.quotation_data or {}

    return {
        "booking_id": booking_id,
        "quotation_data": normalized_quotation,
        "booking_defaults": {
            "client_name": booking.client_name,
            "client_phone": booking.phone or "",
            "client_company": booking.company or "",
            "location": location_label,
            "slot_quantity": booking.slot_quantity or 1,
            "total_price": float(booking.total_price or 0),
            "email": booking.email or "",
            "duration": duration_text,
            "created_at": start_date.strftime("%d %m %Y"),
            "duration_start": duration_start_str,
            "duration_end": duration_end_str,
            "total_days_text": duration_text,
            "no_of_days": total_days,
            "selected_screens": _normalize_selected_screen_snapshots(booking)[0],
            "screen_id": booking.screen_id,
            "screen_name": (booking.screen.name if booking.screen else None),
            "duration_days": booking.duration_days or 0,
            "duration_hours": booking.duration_hours or 0,
            "base_slot_duration": int(base_slot_duration),
        },
        "company": {
            "name": context.get("company_name") or "",
            "phone": context.get("contact_phone") or "",
            "email": context.get("contact_email") or "",
            "address": context.get("address") or "",
            "logo_url": context.get("logo_url") or "",
            "seal_url": context.get("seal_url") or "",
            "location_label": location_label,
            "bank_name": context.get("bank_name") or "",
            "account_name": context.get("account_name") or "",
            "account_number": context.get("account_number") or "",
            "ifsc": context.get("ifsc") or "",
            "upi": context.get("upi") or "",
            "tax_rate": context.get("tax_rate") or "18",
            "tax_enabled": merged_config.get("quotation_tax_enabled", True),
        },
    }


@router.put("/bookings/{booking_id}/quotation")
def update_quotation_data(
    booking_id: int,
    req: QuotationUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    merged_config = get_merged_settings()["config"]
    booking.quotation_data = normalize_quotation_data(booking, req.quotation_data.model_dump(), merged_config)
    booking.quotation_data["is_manually_locked"] = True
    booking.total_price = get_effective_quotation_total(booking.quotation_data)
    db.commit()
    return {"detail": "Quotation saved"}


@router.post("/bookings/{booking_id}/send-quotation")
async def send_booking_quotation(
    booking_id: int,
    req: QuotationSendRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not req.send_to_client and not req.send_to_admin:
        raise HTTPException(status_code=400, detail="Select at least one recipient")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    merged = get_merged_settings()
    merged_config = merged["config"]
    if synchronize_booking_pricing(booking, merged_config):
        db.commit()
        db.refresh(booking)
    quotation_data = booking.quotation_data or {}

    context = build_quotation_context(booking)
    company = {
        "name": context.get("company_name") or "",
        "phone": context.get("contact_phone") or "",
        "email": context.get("contact_email") or "",
        "address": context.get("address") or "",
        "logo_url": context.get("logo_url") or "",
        "seal_url": context.get("seal_url") or "",
        "location_label": _normalized_location_label(booking) or context.get("location") or "",
        "bank_name": context.get("bank_name") or "",
        "account_name": context.get("account_name") or "",
        "account_number": context.get("account_number") or "",
        "ifsc": context.get("ifsc") or "",
        "upi": context.get("upi") or "",
        "tax_rate": context.get("tax_rate") or "18",
        "tax_enabled": merged_config.get("quotation_tax_enabled", True),
        "booking_base_slot_duration_seconds": merged_config.get("booking_base_slot_duration_seconds", 20),
    }

    pdf_filename = f"QUOTATION-{booking_id:05d}.pdf"
    try:
        quotation_html = build_quotation_html(booking, quotation_data, company)
        pdf_bytes = await generate_pdf_from_html(quotation_html)
    except Exception as exc:
        logger.error("Quotation PDF generation failed for booking %s: %s", booking_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}") from exc

    sent_to = []
    failed = []

    if req.send_to_client:
        target = req.client_email or booking.email
        if target:
            ok = await run_in_threadpool(
                send_quotation_email, target, booking, quotation_data, company,
                pdf_bytes=pdf_bytes, pdf_filename=pdf_filename,
            )
            (sent_to if ok else failed).append(target)

    if req.send_to_admin:
        target = req.admin_email or merged.get("contact_email") or ""
        if target:
            ok = await run_in_threadpool(
                send_quotation_email, target, booking, quotation_data, company,
                pdf_bytes=pdf_bytes, pdf_filename=pdf_filename,
            )
            (sent_to if ok else failed).append(target)

    if failed and not sent_to:
        raise HTTPException(status_code=500, detail=f"Failed to send to: {', '.join(failed)}")

    return {"sent_to": sent_to, "failed": failed}

@router.get("/bookings/{booking_id}/quotation/pdf")
async def download_booking_quotation_pdf(
    booking_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    merged = get_merged_settings()
    merged_config = merged["config"]
    if synchronize_booking_pricing(booking, merged_config):
        db.commit()
        db.refresh(booking)
    quotation_data = booking.quotation_data or {}
    context = build_quotation_context(booking)
    company = {
        "name": context.get("company_name") or "",
        "phone": context.get("contact_phone") or "",
        "email": context.get("contact_email") or "",
        "address": context.get("address") or "",
        "logo_url": context.get("logo_url") or "",
        "seal_url": context.get("seal_url") or "",
        "location_label": _normalized_location_label(booking) or context.get("location") or "",
        "bank_name": context.get("bank_name") or "",
        "account_name": context.get("account_name") or "",
        "account_number": context.get("account_number") or "",
        "ifsc": context.get("ifsc") or "",
        "upi": context.get("upi") or "",
        "tax_rate": context.get("tax_rate") or "18",
        "tax_enabled": merged_config.get("quotation_tax_enabled", True),
        "booking_base_slot_duration_seconds": merged_config.get("booking_base_slot_duration_seconds", 20),
    }

    try:
        quotation_html = build_quotation_html(booking, quotation_data, company)
        pdf_bytes = await generate_pdf_from_html(quotation_html)
    except Exception as exc:
        logger.exception("Quotation PDF generation failed for booking_id=%s", booking_id)
        raise HTTPException(status_code=500, detail="Failed to generate quotation PDF") from exc

    filename = f"QUOTATION-{booking_id:05d}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/bookings/{booking_id}")
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    affected_screen_ids = _get_booking_screen_ids(booking)
    if booking.status == BookingStatus.confirmed:
        _release_booking_screens(db, booking)

    db.delete(booking)
    sync_booked_slots_for_screens(db, affected_screen_ids)
    db.commit()
    return {"detail": "Booking deleted"}


@router.post("/screens/recalculate-slots")
def recalculate_all_slots(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Recompute booked_slots for every screen from confirmed bookings. Fixes any drift."""
    screens = db.query(Screen).all()
    sync_booked_slots_for_screens(db, [screen.id for screen in screens])
    db.commit()
    return {"detail": f"Slot counts recalculated for {len(screens)} screens."}


@router.post("/screens", response_model=ScreenOut, status_code=status.HTTP_201_CREATED)
def create_screen(
    req: ScreenCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    screen = Screen(
        name=req.name,
        area=req.area,
        description=req.description,
        footfall=req.footfall,
        base_price=req.base_price,
        price_unit=req.price_unit,
        total_slots=req.total_slots,
        latitude=req.latitude,
        longitude=req.longitude,
        image_url=req.image_url,
        promo_video_url=req.promo_video_url,
        additional_images=req.additional_images,
        gallery_order=req.gallery_order,
    )
    db.add(screen)
    db.commit()
    db.refresh(screen)
    return _screen_to_out(screen)


@router.post("/screens/upload-image")
def upload_screen_image(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
):
    os.makedirs("uploads", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"screen_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{filename}"}


@router.get("/screens", response_model=List[ScreenOut])
def list_all_screens(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    screens = db.query(Screen).order_by(Screen.created_at.asc(), Screen.id.asc()).all()
    return [_screen_to_out(screen) for screen in screens]


@router.put("/screens/{screen_id}", response_model=ScreenOut)
def update_screen(
    screen_id: int,
    req: ScreenUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    screen = db.query(Screen).filter(Screen.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(screen, key, value)

    db.commit()
    db.refresh(screen)
    return _screen_to_out(screen)


@router.delete("/screens/{screen_id}")
def delete_screen(
    screen_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    screen = db.query(Screen).filter(Screen.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    booking_id = _booking_reference_for_screen(db, screen_id)
    if booking_id is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete this screen because it is referenced by booking #{booking_id}. Block it instead if you want to hide it.",
        )

    db.delete(screen)
    db.commit()
    return {"detail": "Screen deleted permanently"}


@router.get("/dashboard-summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    current_window_start = now - timedelta(days=7)
    previous_window_start = current_window_start - timedelta(days=7)

    total_bookings = db.query(func.count(Booking.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).filter(User.role != "admin").scalar() or 0
    active_locations = db.query(func.count(Screen.id)).filter(Screen.is_active.is_(True)).scalar() or 0
    total_revenue = (
        db.query(func.coalesce(func.sum(Booking.total_price), 0))
        .filter(Booking.status == BookingStatus.confirmed)
        .scalar()
        or 0
    )

    current_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.created_at >= current_window_start, Booking.created_at <= now)
        .scalar()
        or 0
    )
    previous_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.created_at >= previous_window_start, Booking.created_at < current_window_start)
        .scalar()
        or 0
    )

    current_revenue = (
        db.query(func.coalesce(func.sum(Booking.total_price), 0))
        .filter(
            Booking.status == BookingStatus.confirmed,
            Booking.created_at >= current_window_start,
            Booking.created_at <= now,
        )
        .scalar()
        or 0
    )
    previous_revenue = (
        db.query(func.coalesce(func.sum(Booking.total_price), 0))
        .filter(
            Booking.status == BookingStatus.confirmed,
            Booking.created_at >= previous_window_start,
            Booking.created_at < current_window_start,
        )
        .scalar()
        or 0
    )

    def calc_percent_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    return DashboardSummaryOut(
        total_bookings=int(total_bookings),
        total_revenue=float(total_revenue),
        active_locations=int(active_locations),
        total_users=int(total_users),
        bookings_trend_percent=calc_percent_change(float(current_bookings), float(previous_bookings)),
        revenue_trend_percent=calc_percent_change(float(current_revenue), float(previous_revenue)),
    )


@router.get("/insights/bookings-trend", response_model=List[BookingTrendPoint])
def get_bookings_trend(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=13)

    rows = (
        db.query(func.date(Booking.created_at), func.count(Booking.id))
        .filter(Booking.created_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
        .group_by(func.date(Booking.created_at))
        .all()
    )
    counts_by_day = {str(day): count for day, count in rows}

    return [
        BookingTrendPoint(
            label=(start_date + timedelta(days=offset)).strftime("%d %b"),
            bookings=int(counts_by_day.get(str(start_date + timedelta(days=offset)), 0)),
        )
        for offset in range(14)
    ]


@router.get("/insights/revenue-analysis", response_model=List[RevenueAnalysisPoint])
def get_revenue_analysis(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    month_keys = []
    current = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    for _ in range(6):
        month_keys.append(current.strftime("%Y-%m"))
        if current.month == 1:
            current = datetime(current.year - 1, 12, 1, tzinfo=timezone.utc)
        else:
            current = datetime(current.year, current.month - 1, 1, tzinfo=timezone.utc)
    month_keys.reverse()

    revenue_by_month = {month_key: 0.0 for month_key in month_keys}
    bookings = (
        db.query(Booking.created_at, Booking.total_price)
        .filter(Booking.status == BookingStatus.confirmed)
        .all()
    )
    for created_at, total_price in bookings:
        if not created_at:
            continue
        month_key = created_at.strftime("%Y-%m")
        if month_key in revenue_by_month:
            revenue_by_month[month_key] += float(total_price or 0)

    return [
        RevenueAnalysisPoint(
            label=datetime.strptime(month_key, "%Y-%m").strftime("%b %Y"),
            revenue=revenue_by_month.get(month_key, 0),
        )
        for month_key in month_keys
    ]


@router.get("/insights/top-locations", response_model=List[TopLocationPoint])
def get_top_locations(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rows = (
        db.query(
            Screen.name,
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total_price), 0),
        )
        .join(Booking, Booking.screen_id == Screen.id)
        .group_by(Screen.id, Screen.name)
        .order_by(func.count(Booking.id).desc(), func.sum(Booking.total_price).desc())
        .limit(5)
        .all()
    )

    return [
        TopLocationPoint(label=name, bookings=int(bookings), revenue=float(revenue or 0))
        for name, bookings, revenue in rows
    ]


@router.get("/insights/top-customers")
def get_top_customers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # 1. Find the top 5 screens by total bookings (confirmed only)
    top_screens = (
        db.query(Screen.id, Screen.name)
        .join(Booking, Booking.screen_id == Screen.id)
        .filter(Booking.status == BookingStatus.confirmed)
        .group_by(Screen.id, Screen.name)
        .order_by(func.count(Booking.id).desc())
        .limit(5)
        .all()
    )

    if not top_screens:
        return {"data": [], "clients": []}

    screen_ids = [s.id for s in top_screens]
    screen_names = {s.id: s.name for s in top_screens}

    # 2. Get customer breakdown for these top screens
    breakdown = (
        db.query(Booking.screen_id, Booking.client_name, func.count(Booking.id))
        .filter(Booking.screen_id.in_(screen_ids), Booking.status == BookingStatus.confirmed)
        .group_by(Booking.screen_id, Booking.client_name)
        .all()
    )

    # 3. Format strictly for Recharts stacked bar
    results_map = {s_id: {"label": screen_names[s_id]} for s_id in screen_ids}
    clients_set = set()

    for s_id, client_name, count in breakdown:
        c_name = client_name or "Unknown"
        clients_set.add(c_name)
        results_map[s_id][c_name] = int(count)

    # Order data matches the original top_screens order
    ordered_data = [results_map[s_id] for s_id in screen_ids]

    return {
        "data": ordered_data,
        "clients": list(clients_set)
    }


@router.get("/insights/booking-status", response_model=List[BookingStatusPoint])
def get_booking_status_breakdown(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rows = (
        db.query(Booking.status, func.count(Booking.id))
        .group_by(Booking.status)
        .all()
    )
    counts = {status.value if status else "pending": int(count) for status, count in rows}

    return [
        BookingStatusPoint(label="Pending", count=counts.get("pending", 0)),
        BookingStatusPoint(label="Approved", count=counts.get("confirmed", 0)),
        BookingStatusPoint(label="Rejected", count=counts.get("cancelled", 0)),
    ]


@router.get("/insights/time-slot-usage", response_model=List[TimeSlotUsagePoint])
def get_time_slot_usage(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Group bookings by their custom duration_label and return slot totals."""
    rows = (
        db.query(Booking.duration_label, func.coalesce(func.sum(Booking.slot_quantity), 0))
        .filter(Booking.duration_label.isnot(None))
        .group_by(Booking.duration_label)
        .order_by(func.sum(Booking.slot_quantity).desc())
        .limit(10)
        .all()
    )
    return [
        TimeSlotUsagePoint(label=label or "Custom", count=int(total or 0))
        for label, total in rows
    ]


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return _build_legacy_analytics(db)


@router.get("/posthog/web-analytics")
async def get_posthog_web_analytics(
    admin: User = Depends(require_admin),
):
    """Proxy PostHog Query API and return structured web analytics for the last 30 days."""
    config = get_merged_settings()["config"]
    api_key = config.get("posthog_personal_api_key", "").strip()
    project_id = config.get("posthog_project_id", "").strip()
    ph_host = (config.get("posthog_host") or "https://us.posthog.com").rstrip("/")

    if not api_key or not project_id:
        return {"configured": False}

    headers = {"Authorization": f"Bearer {api_key}"}
    trend_url = f"{ph_host}/api/projects/{project_id}/insights/trend/"

    def _params(events, *, breakdown=None, math=None):
        ev = [{"id": e, **({"math": math} if math else {})} for e in events]
        p = {"events": json.dumps(ev), "date_from": "-30d", "interval": "day"}
        if breakdown:
            p["breakdown"] = breakdown
            p["breakdown_type"] = "event"
        return p

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            pv_res, uv_res, top_res, sv_res, bs_res, sub_res = await asyncio.gather(
                client.get(trend_url, headers=headers, params=_params(["$pageview"])),
                client.get(trend_url, headers=headers, params=_params(["$pageview"], math="dau")),
                client.get(trend_url, headers=headers, params=_params(["$pageview"], breakdown="$pathname")),
                client.get(trend_url, headers=headers, params=_params(["screen_viewed"])),
                client.get(trend_url, headers=headers, params=_params(["booking_started"])),
                client.get(trend_url, headers=headers, params=_params(["booking_submitted"])),
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"PostHog API unreachable: {exc}") from exc

    def _series(res):
        try:
            data = res.json()
            results = data.get("result") or data.get("results") or []
            return results[0] if results else {}
        except Exception:
            return {}

    def _count(series):
        try:
            v = series.get("count")
            if v is not None:
                return int(v)
            return int(sum(series.get("data") or [0]))
        except Exception:
            return 0

    pv_series = _series(pv_res)
    uv_series = _series(uv_res)
    pv_days = pv_series.get("days") or []
    pv_vals = pv_series.get("data") or []
    uv_vals = uv_series.get("data") or []

    trend = [
        {
            "label": d[5:],  # "MM-DD" slice from "YYYY-MM-DD"
            "pageviews": int(pv_vals[i]) if i < len(pv_vals) else 0,
            "visitors": int(uv_vals[i]) if i < len(uv_vals) else 0,
        }
        for i, d in enumerate(pv_days)
    ]

    # Top pages (breakdown by $pathname)
    try:
        top_raw = top_res.json()
        top_results = top_raw.get("result") or top_raw.get("results") or []
        top_pages = sorted(
            [
                {"path": str(r.get("breakdown_value") or "/"), "count": _count(r)}
                for r in top_results
                if r.get("breakdown_value") and not str(r.get("breakdown_value", "")).startswith("http")
            ],
            key=lambda x: x["count"],
            reverse=True,
        )[:6]
    except Exception:
        top_pages = []

    sv = _count(_series(sv_res))
    bs = _count(_series(bs_res))
    sub = _count(_series(sub_res))
    base = sv or bs or sub or 1

    funnel = [
        {"name": "Screen Viewed", "count": sv, "percent": 100},
        {"name": "Booking Started", "count": bs, "percent": round(bs / base * 100)},
        {"name": "Booking Submitted", "count": sub, "percent": round(sub / base * 100)},
    ]

    return {
        "configured": True,
        "total_pageviews": _count(pv_series),
        "total_visitors": _count(uv_series),
        "conversion_rate": round(sub / base * 100),
        "trend": trend,
        "top_pages": top_pages,
        "funnel": funnel,
        "project_url": f"{ph_host}/project/{project_id}",
    }


@router.get("/settings", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    setting = db.query(SystemSettings).first()
    if not setting:
        setting = SystemSettings()
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("/settings", response_model=SettingsOut)
def update_settings(
    req: SettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    setting = db.query(SystemSettings).first()
    if not setting:
        setting = SystemSettings()
        db.add(setting)

    if req.whatsapp_number is not None:
        setting.whatsapp_number = req.whatsapp_number
    if req.contact_email is not None:
        setting.contact_email = req.contact_email
    if req.config is not None:
        current_config = dict(setting.config or {})
        current_config.update(req.config)
        setting.config = current_config

    db.commit()
    db.refresh(setting)
    invalidate_settings_cache()
    return setting


@router.post("/settings/test-smtp")
def test_smtp(admin: User = Depends(require_admin)):
    import smtplib
    import ssl
    from app.email_service import _get_smtp_config
    host, port, user, password, from_name = _get_smtp_config()
    if not user or not password:
        raise HTTPException(status_code=400, detail="SMTP not configured. Set host, user, and password first.")
    if not host:
        raise HTTPException(status_code=400, detail="SMTP host is not set.")

    try:
        with smtplib.SMTP(host, int(port), timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: wrong email or app password. ({e.smtp_error.decode(errors='ignore').strip()})")
    except smtplib.SMTPConnectError as e:
        raise HTTPException(status_code=400, detail=f"Cannot connect to {host}:{port}. Check host and port. ({e})")
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=400, detail=f"SMTP error: {e}")
    except OSError as e:
        raise HTTPException(status_code=400, detail=f"Network error connecting to {host}:{port} — {e}")

    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.utils import formataddr
    html = (
        "<div style='font-family:sans-serif;padding:24px'>"
        "<h2 style='color:#0f172a'>SMTP Test — Olrac Admin</h2>"
        "<p style='color:#334155'>Your SMTP settings are working correctly.</p>"
        f"<p style='color:#64748b;font-size:12px'>Sent via {host}:{port} as {user}</p>"
        "</div>"
    )
    msg = MIMEMultipart("mixed")
    msg["Subject"] = "SMTP Test — Olrac Admin"
    msg["From"] = formataddr((from_name or "Olrac", user))
    msg["To"] = admin.email
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, int(port), timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connected but failed to send: {e}")
    return {"sent": True, "to": admin.email}


@router.get("/settings/smtp-status")
def get_smtp_status(admin: User = Depends(require_admin)):
    """Return the currently-active SMTP config (password masked) for display in admin settings."""
    from app.email_service import _get_smtp_config
    host, port, user, password, from_name = _get_smtp_config()
    masked = ("*" * (len(password) - 4) + password[-4:]) if len(password) > 4 else ("*" * len(password))
    return {
        "host": host,
        "port": port,
        "user": user,
        "password_masked": masked if password else "",
        "from_name": from_name,
        "configured": bool(user and password),
    }


@router.put("/profile")
def update_admin_profile(
    req: AdminProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if req.name:
        admin.name = req.name.strip()
    if req.email:
        normalized_email = _normalize_email(str(req.email))
        existing = db.query(User).filter(User.email == normalized_email, User.id != admin.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        admin.email = normalized_email
    if req.password:
        admin.password_hash = hash_password(req.password)
        admin.must_change_password = False

    db.commit()
    return {"detail": "Profile updated successfully"}


@router.get("/users", response_model=List[UserOut])
def list_admin_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    admins = (
        db.query(User)
        .filter(User.role == UserRole.admin)
        .order_by(User.created_at.asc(), User.id.asc())
        .all()
    )
    return [UserOut.model_validate(admin_user) for admin_user in admins]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    req: AdminUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    normalized_email = _normalize_email(str(req.email))
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_admin = User(
        name=req.name.strip(),
        email=normalized_email,
        password_hash=hash_password(req.password),
        role=UserRole.admin,
        company="Olrac Adverse",
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return UserOut.model_validate(new_admin)


@router.put("/users/{admin_id}", response_model=UserOut)
def update_admin_user(
    admin_id: int,
    req: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target_admin = (
        db.query(User)
        .filter(User.id == admin_id, User.role == UserRole.admin)
        .first()
    )
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin account not found")

    if req.name is not None:
        target_admin.name = req.name.strip()
    if req.email is not None:
        normalized_email = _normalize_email(str(req.email))
        existing = db.query(User).filter(User.email == normalized_email, User.id != admin_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        target_admin.email = normalized_email
    if req.password:
        target_admin.password_hash = hash_password(req.password)

    db.commit()
    db.refresh(target_admin)
    return UserOut.model_validate(target_admin)


@router.delete("/users/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if admin.id == admin_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target_admin = (
        db.query(User)
        .filter(User.id == admin_id, User.role == UserRole.admin)
        .first()
    )
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin account not found")

    total_admins = db.query(User).filter(User.role == UserRole.admin).count()
    if total_admins <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last admin account")

    db.delete(target_admin)
    db.commit()
