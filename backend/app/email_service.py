"""SMTP email service for booking notifications and OTP verification."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape

from app.config import settings

logger = logging.getLogger(__name__)


def _send_html_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via SMTP and return True on success."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured - skipping email to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_USER))
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, str(exc))
        return False


def send_booking_verification_otp(to_email: str, otp_code: str, expiry_minutes: int = 2) -> bool:
    """Send the 6-digit booking verification OTP via SMTP."""
    safe_code = escape(otp_code)
    safe_app_name = escape(settings.SMTP_FROM_NAME or "Olrac")
    subject = f"{safe_app_name} - Your booking verification code"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8f8fa; margin: 0; padding: 20px; color: #0f172a; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 36px rgba(15, 23, 42, 0.08); }}
        .header {{ background: linear-gradient(135deg, #1d4ed8, #0f766e); color: white; padding: 28px 32px; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 10px 0 0; opacity: 0.9; line-height: 1.6; }}
        .content {{ padding: 32px; }}
        .otp-box {{ margin: 24px 0; border-radius: 18px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; text-align: center; }}
        .otp-label {{ font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #2563eb; font-weight: 700; }}
        .otp-code {{ margin-top: 12px; font-size: 34px; font-weight: 800; letter-spacing: 0.45em; color: #0f172a; }}
        .footer {{ padding: 0 32px 32px; color: #64748b; font-size: 13px; line-height: 1.7; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify your email to continue</h1>
          <p>Use this one-time password to unlock your quote request and WhatsApp checkout flow.</p>
        </div>
        <div class="content">
          <p>Your verification code is valid for <strong>{expiry_minutes} minutes</strong>.</p>
          <div class="otp-box">
            <div class="otp-label">One-Time Password</div>
            <div class="otp-code">{safe_code}</div>
          </div>
          <p>If you did not request this code, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          This code works only once and is meant for your current booking request on {safe_app_name}.
        </div>
      </div>
    </body>
    </html>
    """

    return _send_html_email(to_email, subject, html_body)


def send_booking_confirmation(to_email: str, booking_data: dict) -> bool:
    """Send an HTML booking confirmation email via SMTP."""
    safe_app_name = escape(settings.SMTP_FROM_NAME or "Olrac")
    subject = f"{safe_app_name} - Booking Confirmation #{booking_data.get('booking_id', '')}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8f8fa; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 32px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 8px 0 0; opacity: 0.9; }}
        .content {{ padding: 32px; }}
        .detail-row {{ display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }}
        .detail-label {{ color: #6b7280; font-size: 14px; }}
        .detail-value {{ color: #1e1e2e; font-weight: 600; font-size: 14px; text-align: right; }}
        .total {{ background: #f8f4ff; border-radius: 8px; padding: 16px; margin-top: 20px; text-align: center; }}
        .total-amount {{ font-size: 28px; color: #7c3aed; font-weight: 700; }}
        .footer {{ text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
          <p>Thank you for choosing {safe_app_name}</p>
        </div>
        <div class="content">
          <div class="detail-row">
            <span class="detail-label">Booking ID</span>
            <span class="detail-value">#{escape(str(booking_data.get('booking_id', 'N/A')))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Client</span>
            <span class="detail-value">{escape(str(booking_data.get('client_name', 'N/A')))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Company</span>
            <span class="detail-value">{escape(str(booking_data.get('company', 'N/A')))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Locations</span>
            <span class="detail-value">{escape(str(booking_data.get('screen_name', 'N/A')))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Areas</span>
            <span class="detail-value">{escape(str(booking_data.get('screen_area', 'N/A')))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Billing Cycle</span>
            <span class="detail-value">{escape(str(booking_data.get('billing_cycle', 'N/A'))).title()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Slots</span>
            <span class="detail-value">{escape(str(booking_data.get('slot_quantity', 1)))}</span>
          </div>
          <div class="total">
            <div style="color:#6b7280;font-size:13px;">Total Amount</div>
            <div class="total-amount">Rs {float(booking_data.get('total_price', 0) or 0):,.2f}</div>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 {safe_app_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    return _send_html_email(to_email, subject, html_body)
