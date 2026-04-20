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
        "price_daily": float(screen.price_daily or 0),
        "price_weekly": float(screen.price_weekly or 0),
        "price_monthly": float(screen.price_monthly or 0),
        "price_yearly": float(screen.price_yearly or 0),
        "total_slots": screen.total_slots,
        "booked_slots": screen.booked_slots,
        "available_slots": screen.available_slots,
        "latitude": float(screen.latitude) if screen.latitude is not None else None,
        "longitude": float(screen.longitude) if screen.longitude is not None else None,
        "image_url": screen.image_url,
        "additional_images": screen.additional_images or [],
        "is_active": screen.is_active,
        "created_at": screen.created_at,
    }


@router.get("", response_model=List[ScreenOut])
def list_screens(db: Session = Depends(get_db)):
    """List all active screens (public endpoint)."""
    screens = (
        db.query(Screen)
        .filter(Screen.is_active == True)
        .filter(Screen.booked_slots < Screen.total_slots)
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
        },
    }
