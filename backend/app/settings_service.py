"""Helpers for reading merged system settings."""

from app.database import SessionLocal
from app.models import SystemSettings


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
    "notifications_smtp": "",
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
    "booking_max_per_day": "10",
    "booking_allow_overlap": False,
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
}


def get_merged_settings():
    db = SessionLocal()
    try:
        record = db.query(SystemSettings).first()
        if not record:
            return {
                "whatsapp_number": "919876543210",
                "contact_email": "support@olrac.com",
                "config": dict(DEFAULT_CONFIG),
            }

        return {
            "whatsapp_number": record.whatsapp_number or "919876543210",
            "contact_email": record.contact_email or "support@olrac.com",
            "config": {**DEFAULT_CONFIG, **(record.config or {})},
        }
    finally:
        db.close()
