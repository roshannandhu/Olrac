"""Admin-only routes: manage bookings, screens, and platform insights."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from io import BytesIO
import logging
import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import get_db
from app.deps import require_admin
from app.invoice_service import (
    build_invoice_context,
    build_invoice_filename,
    generate_invoice_docx_bytes,
    generate_invoice_pdf_bytes,
)
from app.models import Booking, BookingStatus, Screen, SystemSettings, User
from app.schemas import (
    AdminProfileUpdate,
    AnalyticsOut,
    BookingOut,
    BookingStatusPoint,
    BookingStatusUpdate,
    BookingTrendPoint,
    DashboardSummaryOut,
    RevenueAnalysisPoint,
    ScreenCreate,
    ScreenOut,
    ScreenUpdate,
    SettingsOut,
    SettingsUpdate,
    TimeSlotUsagePoint,
    TopLocationPoint,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


def _screen_to_out(screen: Screen) -> ScreenOut:
    return ScreenOut(
        id=screen.id,
        name=screen.name,
        area=screen.area,
        description=screen.description,
        footfall=screen.footfall,
        price_daily=float(screen.price_daily or 0),
        price_weekly=float(screen.price_weekly or 0),
        price_monthly=float(screen.price_monthly or 0),
        price_yearly=float(screen.price_yearly or 0),
        total_slots=screen.total_slots,
        booked_slots=screen.booked_slots,
        available_slots=screen.available_slots,
        latitude=float(screen.latitude) if screen.latitude is not None else None,
        longitude=float(screen.longitude) if screen.longitude is not None else None,
        image_url=screen.image_url,
        additional_images=screen.additional_images or [],
        is_active=screen.is_active,
        created_at=screen.created_at,
    )


def _booking_to_out(booking: Booking) -> BookingOut:
    selected_screens = booking.selected_screens or []
    if not selected_screens and booking.screen:
        selected_screens = [
            {
                "id": booking.screen.id,
                "name": booking.screen.name,
                "area": booking.screen.area,
            }
        ]

    selected_screen_ids = booking.selected_screen_ids or (
        [booking.screen_id] if booking.screen_id is not None else []
    )
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
        billing_cycle=booking.billing_cycle.value if booking.billing_cycle else "monthly",
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
    selected_screen_ids = booking.selected_screen_ids or []
    if selected_screen_ids:
        return [int(screen_id) for screen_id in selected_screen_ids]
    if booking.screen_id is not None:
        return [int(booking.screen_id)]
    return []


def _get_booking_screens(db: Session, booking: Booking) -> list[Screen]:
    selected_ids = _get_booking_screen_ids(booking)
    if not selected_ids:
        return []

    screens = db.query(Screen).filter(Screen.id.in_(selected_ids)).all()
    screens_by_id = {screen.id: screen for screen in screens}
    return [screens_by_id[screen_id] for screen_id in selected_ids if screen_id in screens_by_id]


def _reserve_booking_screens(db: Session, booking: Booking):
    screens = _get_booking_screens(db, booking)

    for screen in screens:
        if screen.available_slots < booking.slot_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {screen.available_slots} slots available for {screen.name}",
            )

    for screen in screens:
        screen.booked_slots += booking.slot_quantity


def _release_booking_screens(db: Session, booking: Booking):
    for screen in _get_booking_screens(db, booking):
        screen.booked_slots = max(0, screen.booked_slots - booking.slot_quantity)


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
    bookings = db.query(Booking).order_by(Booking.created_at.asc(), Booking.id.asc()).all()
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

    old_status = booking.status
    new_status = BookingStatus(req.status)

    if old_status != BookingStatus.confirmed and new_status == BookingStatus.confirmed:
        _reserve_booking_screens(db, booking)

    if old_status == BookingStatus.confirmed and new_status != BookingStatus.confirmed:
        _release_booking_screens(db, booking)

    booking.status = new_status
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
            file_bytes = await run_in_threadpool(generate_invoice_pdf_bytes, context)
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


@router.delete("/bookings/{booking_id}")
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.confirmed:
        _release_booking_screens(db, booking)

    db.delete(booking)
    db.commit()
    return {"detail": "Booking deleted"}


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
        price_daily=req.price_daily,
        price_weekly=req.price_weekly,
        price_monthly=req.price_monthly,
        price_yearly=req.price_yearly,
        total_slots=req.total_slots,
        latitude=req.latitude,
        longitude=req.longitude,
        image_url=req.image_url,
        additional_images=req.additional_images,
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

    screen.is_active = False
    db.commit()
    return {"detail": "Screen deactivated"}


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
    rows = (
        db.query(Booking.billing_cycle, func.coalesce(func.sum(Booking.slot_quantity), 0))
        .group_by(Booking.billing_cycle)
        .all()
    )
    counts = {cycle.value if cycle else "monthly": int(total or 0) for cycle, total in rows}

    return [
        TimeSlotUsagePoint(label="1 Month", count=counts.get("daily", 0)),
        TimeSlotUsagePoint(label="3 Months", count=counts.get("weekly", 0)),
        TimeSlotUsagePoint(label="6 Months", count=counts.get("monthly", 0)),
        TimeSlotUsagePoint(label="1 Year", count=counts.get("yearly", 0)),
    ]


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return _build_legacy_analytics(db)


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
    return setting


@router.put("/profile")
def update_admin_profile(
    req: AdminProfileUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if req.name:
        admin.name = req.name
    if req.email:
        admin.email = req.email
    if req.password:
        admin.password_hash = hash_password(req.password)

    db.commit()
    return {"detail": "Profile updated successfully"}
