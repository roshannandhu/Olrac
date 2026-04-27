"""Public screen listing routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Screen, SystemSettings
from app.schemas import ScreenOut
from app.settings_service import get_merged_settings

router = APIRouter(prefix="/api/screens", tags=["Screens"])


def _screen_to_out(screen: Screen) -> dict:
    """Convert a Screen ORM object to a dict suitable for ScreenOut."""
    return {
        "id": screen.id,
        "name": screen.name,
        "area": screen.area,
        "description": screen.description,
        "footfall": screen.footfall,
        "base_price": float(screen.base_price or 0),
        "price_unit": screen.price_unit,
        "total_slots": screen.total_slots,
        "booked_slots": screen.booked_slots,
        "available_slots": screen.available_slots,
        "latitude": float(screen.latitude) if screen.latitude is not None else None,
        "longitude": float(screen.longitude) if screen.longitude is not None else None,
        "image_url": screen.image_url,
        "promo_video_url": screen.promo_video_url,
        "additional_images": screen.additional_images or [],
        "gallery_order": screen.gallery_order or [],
        "is_active": screen.is_active,
        "created_at": screen.created_at,
    }


@router.get("", response_model=List[ScreenOut])
def list_screens(db: Session = Depends(get_db)):
    """List all active screens (public endpoint)."""
    screens = (
        db.query(Screen)
        .filter(Screen.is_active == True)
        .order_by(Screen.created_at.asc(), Screen.id.asc())
        .all()
    )
    return [ScreenOut(**_screen_to_out(s)) for s in screens]


@router.get("/{screen_id}", response_model=ScreenOut)
def get_screen(screen_id: int, db: Session = Depends(get_db)):
    """Get a single screen by ID (public)."""
    screen = db.query(Screen).filter(Screen.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    return ScreenOut(**_screen_to_out(screen))

@router.get("/config/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Get public system settings like whatsapp number."""
    merged = get_merged_settings()
    return {
        "whatsapp_number": merged["whatsapp_number"],
        "contact_email": merged["contact_email"],
        "config": {
            "general_app_name": merged["config"].get("general_app_name", "OLRAC Advertising"),
            "general_contact_phone": merged["config"].get("general_contact_phone", ""),
            "general_logo_url": merged["config"].get("general_logo_url", ""),
            "general_brand_images": merged["config"].get("general_brand_images", []),
            "invoice_company_name": merged["config"].get("invoice_company_name", "OLRAC Advertising Pvt Ltd"),
            "invoice_address": merged["config"].get("invoice_address", ""),
            "invoice_gst": merged["config"].get("invoice_gst", ""),
            "invoice_logo_url": merged["config"].get("invoice_logo_url", ""),
            "invoice_seal_url": merged["config"].get("invoice_seal_url", ""),
            "whatsapp_enable": merged["config"].get("whatsapp_enable", True),
            "whatsapp_template": merged["config"].get("whatsapp_template", ""),
            "whatsapp_message_format": merged["config"].get("whatsapp_message_format", "text"),
            "hero_billboard_media": merged["config"].get("hero_billboard_media", []),
            "booking_durations": merged["config"].get("booking_durations", []),
            "booking_default_duration_id": merged["config"].get("booking_default_duration_id", "d3"),
            "booking_base_slot_duration_seconds": merged["config"].get("booking_base_slot_duration_seconds", 20),
            "booking_method_whatsapp": merged["config"].get("booking_method_whatsapp", True),
            "booking_method_email": merged["config"].get("booking_method_email", True),
            "security_otp_booking_enable": merged["config"].get("security_otp_booking_enable", True),
            "posthog_public_key": merged["config"].get("posthog_public_key", ""),
            "posthog_host": merged["config"].get("posthog_host", "https://us.posthog.com"),
            "contact_instagram_url": merged["config"].get("contact_instagram_url", ""),
            "contact_facebook_url": merged["config"].get("contact_facebook_url", ""),
            "contact_linkedin_url": merged["config"].get("contact_linkedin_url", ""),
            "contact_map_url": merged["config"].get("contact_map_url", ""),
        },
    }
