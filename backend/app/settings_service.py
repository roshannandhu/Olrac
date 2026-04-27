"""Helpers for reading merged system settings."""

import threading
import time

from app.database import SessionLocal
from app.models import SystemSettings

_cache_lock = threading.Lock()
_cached_settings: dict | None = None
_cached_at: float = 0.0
_CACHE_TTL = 30.0  # seconds


def invalidate_settings_cache() -> None:
    """Force the next get_merged_settings() call to hit the database."""
    global _cached_settings
    with _cache_lock:
        _cached_settings = None


DEFAULT_CONFIG = {
    "general_app_name": "OLRAC Advertising",
    "general_contact_phone": "",
    "general_logo_url": "",
    "general_brand_images": [],
    "landing_card_1_videos": [],
    "landing_card_2_videos": [],
    "landing_card_3_videos": [],
    "whatsapp_enable": True,
    "whatsapp_template": "Hi, I want to book an ad slot.\n\nBooking ID: {booking_id}\nName: {name}\nCompany: {company}\nLocation: {location}\nBudget: {budget}\n\nEmail: {email}\nPhone: {phone}\nArea: {area}\nBilling: {billing}\nSlots: {slots}\nTotal Price: {total_price}\n\nAd Description:\n{description}",
    "notifications_enable": True,
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from_name": "",
    "notifications_template_created": "Your booking {booking_id} has been received and is pending approval.",
    "notifications_template_approved": "Great news! Your booking {booking_id} has been approved.",
    "notifications_template_rejected": "Unfortunately, your booking {booking_id} could not be approved at this time.",
    "ai_enable": True,
    "ai_api_key": "",
    "ai_model": "gpt-4",
    "ai_feature_improver": True,
    "ai_feature_summary": True,
    "ai_feature_classification": True,
    "booking_default_status": "pending",
    "booking_min_budget": "500",
    "booking_slot_duration": "1",
    "booking_base_slot_duration_seconds": 20,
    "booking_max_per_day": "10",
    "booking_allow_overlap": False,
    "booking_default_duration_id": "d3",
    "booking_durations": [
        {"id": "d1", "label": "1 Day", "days": 1, "hours": 24},
        {"id": "d2", "label": "1 Week", "days": 7, "hours": 168},
        {"id": "d3", "label": "1 Month", "days": 30, "hours": 720},
        {"id": "d4", "label": "6 Months", "days": 180, "hours": 4320},
        {"id": "d5", "label": "1 Year", "days": 365, "hours": 8760}
    ],
    "security_token_expiry": "24",
    "security_session_timeout": "60",
    "security_ip_restriction": "",
    "invoice_company_name": "OLRAC Advertising Pvt Ltd",
    "invoice_address": "",
    "invoice_gst": "",
    "invoice_logo_url": "",
    "invoice_seal_url": "",
    "invoice_title": "INVOICE",
    "invoice_prefix": "INV",
    "invoice_primary_color": "#334155",
    "invoice_show_seal": True,
    "invoice_show_slot_details": True,
    "invoice_signature_name": "",
    "invoice_signature_title": "Authorized Signatory",
    "invoice_payment_terms": "",
    "invoice_notes": "",
    "invoice_footer_note": "",
    "invoice_bank_name": "",
    "invoice_account_name": "",
    "invoice_account_number": "",
    "invoice_ifsc": "",
    "invoice_upi": "",
    "quotation_company_name": "OLRAC Advertising Pvt Ltd",
    "quotation_address": "",
    "quotation_gst": "",
    "quotation_logo_url": "",
    "quotation_seal_url": "",
    "quotation_title": "ADVERTISING QUOTATION",
    "quotation_prefix": "QTN",
    "quotation_primary_color": "#334155",
    "quotation_bank_name": "",
    "quotation_account_name": "",
    "quotation_account_number": "",
    "quotation_ifsc": "",
    "quotation_upi": "",
    "quotation_tax_rate": "18",
    "quotation_tax_enabled": True,
    "admin_email": "",
    "whatsapp_message_format": "text",
    "posthog_public_key": "",
    "posthog_personal_api_key": "",
    "posthog_project_id": "",
    "posthog_host": "https://us.posthog.com",
    "contact_instagram_url": "https://www.instagram.com/olracadvertise?igsh=MWlhNHVnb2J1cmFwMg==",
    "contact_facebook_url": "https://www.facebook.com/share/14egZ1762Hm/",
    "contact_linkedin_url": "https://www.linkedin.com/in/olrac-advertise-b32917405?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
    "contact_map_url": "",
}


def get_merged_settings() -> dict:
    global _cached_settings, _cached_at
    now = time.monotonic()
    with _cache_lock:
        if _cached_settings is not None and now - _cached_at < _CACHE_TTL:
            return _cached_settings

    db = SessionLocal()
    try:
        record = db.query(SystemSettings).first()
        if not record:
            result = {
                "whatsapp_number": "919876543210",
                "contact_email": "support@olrac.com",
                "config": dict(DEFAULT_CONFIG),
            }
        else:
            result = {
                "whatsapp_number": record.whatsapp_number or "919876543210",
                "contact_email": record.contact_email or "support@olrac.com",
                "config": {**DEFAULT_CONFIG, **(record.config or {})},
            }

        with _cache_lock:
            _cached_settings = result
            _cached_at = time.monotonic()
        return result
    finally:
        db.close()
