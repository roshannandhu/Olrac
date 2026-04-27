"""SMTP email service for booking notifications and OTP verification."""

from __future__ import annotations

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape
from datetime import datetime, timezone, timedelta

from app.config import settings
from app.quotation_service import normalize_quotation_data

logger = logging.getLogger(__name__)


def _get_smtp_config() -> tuple[str, int, str, str, str]:
    """Return (host, port, user, password, from_name) reading DB settings first, env vars as fallback."""
    try:
        from app.settings_service import get_merged_settings
        cfg = get_merged_settings()["config"]
        host = cfg.get("smtp_host", "").strip() or settings.SMTP_HOST
        port = int(cfg.get("smtp_port") or settings.SMTP_PORT)
        user = cfg.get("smtp_user", "").strip() or settings.SMTP_USER
        password = cfg.get("smtp_password", "").strip() or settings.SMTP_PASSWORD
        from_name = cfg.get("smtp_from_name", "").strip() or settings.SMTP_FROM_NAME
        return host, port, user, password, from_name
    except Exception:
        return settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD, settings.SMTP_FROM_NAME


def _send_html_email(
    to_email: str,
    subject: str,
    html_body: str,
    *,
    pdf_bytes: bytes | None = None,
    pdf_filename: str | None = None,
) -> bool:
    """Send an HTML email via SMTP, optionally with a PDF attachment."""
    host, port, user, password, from_name = _get_smtp_config()

    if not user or not password:
        logger.warning("SMTP not configured - skipping email to %s", to_email)
        return False

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, user))
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if pdf_bytes:
        attachment = MIMEApplication(pdf_bytes, _subtype="pdf", Name=pdf_filename or "quotation.pdf")
        attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=pdf_filename or "quotation.pdf",
        )
        msg.attach(attachment)

    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
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


def send_admin_password_reset_otp(to_email: str, otp_code: str, expiry_minutes: int = 10) -> bool:
    """Send the admin password reset OTP via SMTP."""
    safe_code = escape(otp_code)
    safe_app_name = escape(settings.SMTP_FROM_NAME or "Olrac")
    subject = f"{safe_app_name} - Admin password reset code"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
        .container {{ max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }}
        .header {{ background: linear-gradient(135deg, #0f172a, #1e3a8a); color: white; padding: 32px; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 10px 0 0; opacity: 0.88; line-height: 1.6; }}
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
          <h1>Reset your admin password</h1>
          <p>Use this one-time password to recover access to the OLRAC admin control panel.</p>
        </div>
        <div class="content">
          <p>Your reset code is valid for <strong>{expiry_minutes} minutes</strong>.</p>
          <div class="otp-box">
            <div class="otp-label">Admin OTP</div>
            <div class="otp-code">{safe_code}</div>
          </div>
          <p>If you did not request this reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          This code works only once and is meant for the admin account on {safe_app_name}.
        </div>
      </div>
    </body>
    </html>
    """

    return _send_html_email(to_email, subject, html_body)


def build_quotation_html(booking, quotation_data: dict, company: dict) -> str:
    """Return the full A4 quotation HTML, used for PDF rendering."""
    normalized_quote = normalize_quotation_data(booking, quotation_data, company)
    safe_company = escape(company.get("name") or "Olrac Adverse")
    safe_client = escape(str(booking.client_name or ""))
    safe_campaign = escape(str(normalized_quote.get("campaign_name") or booking.ad_description or "Advertising Campaign"))
    safe_location = escape(str(company.get("location_label") or ""))

    start_date = booking.created_at or datetime.now(timezone.utc)
    delta_days = booking.duration_days or 30
    end_date = start_date + timedelta(days=delta_days)

    duration_start = normalized_quote.get("duration_start") or start_date.strftime("%d %b %Y")
    duration_end = normalized_quote.get("duration_end") or end_date.strftime("%d %b %Y")
    total_days_text = normalized_quote.get("total_days_text") or booking.duration_label or f"{delta_days} Days"

    safe_duration = escape(f"{duration_start} - {duration_end}")
    safe_total_days = escape(str(total_days_text))
    
    items = normalized_quote.get("items") or []
    subtotal = float(normalized_quote.get("subtotal") or 0)
    discount = float(normalized_quote.get("discount") or 0)
    tax_enabled = bool(normalized_quote.get("tax_enabled"))
    tax_rate = float(normalized_quote.get("tax_rate") or 0) if tax_enabled else 0.0
    tax_amount = float(normalized_quote.get("tax_amount") or 0)
    grand_total = float(normalized_quote.get("grand_total") or 0)
    
    bank_name = escape(str(company.get("bank_name") or ""))
    acc_name = escape(str(company.get("account_name") or ""))
    acc_no = escape(str(company.get("account_number") or ""))
    ifsc = escape(str(company.get("ifsc") or ""))
    upi = escape(str(company.get("upi") or ""))
    
    issue_date = escape(str(normalized_quote.get("issue_date") or start_date.strftime("%d %b %Y")))
    terms_payment = escape(str(normalized_quote.get("terms_payment") or ""))
    terms_content = escape(str(normalized_quote.get("terms_content") or ""))
    terms_downtime = escape(str(normalized_quote.get("terms_downtime") or ""))
    terms_branding = escape(str(normalized_quote.get("terms_branding") or ""))
    phone_c = escape(company.get("phone") or "")
    email_c = escape(company.get("email") or "")
    address_c = escape(company.get("address") or "")
    client_phone = escape(str(booking.phone or ""))
    client_company = escape(str(booking.company or ""))

    rows_html = ""
    for item in items:
        desc = escape(str(item.get("description") or ""))
        slots = escape(str(item.get("no_of_slots") or ""))
        dur = escape(str(item.get("slot_duration") or ""))
        rate = float(item.get("rate") or 0)
        total = float(item.get("subtotal") or 0)
        rows_html += f'''
      <tr>
        <td>{desc}</td>
        <td class="c">{slots}</td>
        <td class="c">{dur}</td>
        <td class="r">{rate:,.0f}</td>
        <td class="r b">{total:,.0f}</td>
      </tr>'''

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#0f172a;width:794px;min-height:1123px;padding:52px 56px}}
  .hdr{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}}
  .brand{{font-size:22px;font-weight:900;color:#0f172a;line-height:1}}
  .brand-sub{{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#94a3b8;margin-top:4px}}
  .date-lbl{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#94a3b8;text-align:right}}
  .date-val{{font-size:13px;font-weight:700;color:#0f172a;text-align:right;margin-top:2px}}
  h1{{font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-.5px;margin-bottom:28px}}
  .from-to{{display:flex;gap:32px;margin-bottom:24px}}
  .side{{flex:1;padding-left:14px;border-left:3px solid #cbd5e1}}
  .sec-lbl{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:#94a3b8;margin-bottom:6px}}
  .sec-val{{font-size:13px;color:#334155;line-height:1.7}}
  .sec-val strong{{color:#0f172a}}
  .divider{{width:1px;background:#e2e8f0;flex-shrink:0}}
  .campaign{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px}}
  .cf-lbl{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:4px}}
  .cf-val{{font-size:13px;font-weight:700;color:#0f172a}}
  .cf-val.blue{{color:#2563eb}}
  .tbl-label{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#94a3b8;margin-bottom:8px}}
  table{{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}}
  th{{background:#f1f5f9;padding:10px 12px;font-weight:700;color:#475569;border:1px solid #e2e8f0}}
  th.r{{text-align:right}}th.c{{text-align:center}}th.l{{text-align:left}}
  td{{padding:12px;border:1px solid #e2e8f0;color:#334155}}
  .totals{{display:flex;justify-content:space-between;margin:16px 0 32px}}
  .bank-details{{border:1px solid #e2e8f0;background:#f8fafc;padding:16px;border-radius:10px;width:380px;font-size:11px}}
  .bank-details strong{{color:#0f172a;display:inline-block;width:110px}}
  .totals-inner{{width:280px}}
  .tot-row{{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b}}
  .tot-row.grand{{border-bottom:none;padding-top:12px;font-size:16px;font-weight:900;color:#0f172a}}
  .grand-val{{color:#2563eb}}
  .terms-title{{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.16em;color:#0f172a;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}}
  .terms-grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px}}
  .term-h{{font-size:11px;font-weight:700;color:#334155;margin-bottom:4px}}
  .term-p{{font-size:11px;color:#64748b;line-height:1.7}}
  .sig{{text-align:center;padding-top:24px;border-top:1px solid #e2e8f0}}
  .sig-text{{display:inline-block;border-bottom:1px solid #94a3b8;padding-bottom:2px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#64748b}}
</style>
</head>
<body>
  <div class="hdr">
    <div>
      {f'<img src="{escape(company.get("logo_url"))}" alt="Logo" style="height:56px;margin-bottom:8px;"/><br>' if company.get("logo_url") else ""}
      <div class="brand">{safe_company}</div>
      <div class="brand-sub">Adverse</div>
    </div>
    <div>
      <div class="date-lbl">Date of Issue</div>
      <div class="date-val">{issue_date}</div>
    </div>
  </div>
  <h1>ADVERTISING QUOTATION</h1>
  <div class="from-to">
    <div class="side">
      <div class="sec-lbl">FROM</div>
      <div class="sec-val">
        <strong>{safe_company}</strong><br>
        {"Phone: " + phone_c + "<br>" if phone_c else ""}{"Email: " + email_c + "<br>" if email_c else ""}{"Address: " + address_c if address_c else ""}
      </div>
    </div>
    <div class="divider"></div>
    <div class="side">
      <div class="sec-lbl">TO</div>
      <div class="sec-val">
        <strong>{safe_client}</strong><br>
        {('<strong>' + client_company + '</strong><br>') if client_company else ""}
        {"Phone: " + client_phone + "<br>" if client_phone else ""}
        {"Email: " + escape(str(booking.email or ""))}
      </div>
    </div>
  </div>
  <div class="campaign">
    <div><div class="cf-lbl">Campaign Name</div><div class="cf-val blue">{safe_campaign}</div></div>
    <div><div class="cf-lbl">Screen Location</div><div class="cf-val">{safe_location}</div></div>
    <div><div class="cf-lbl">Duration</div><div class="cf-val">{safe_duration}</div></div>
    <div><div class="cf-lbl">Total Days</div><div class="cf-val">{safe_total_days}</div></div>
  </div>
  <div class="tbl-label">Service Distribution</div>
  <table>
    <thead>
      <tr>
        <th class="l">Location &amp; Detail</th>
        <th class="c">Slots</th>
        <th class="c">Slot Size</th>
        <th class="r">Rate</th>
        <th class="r">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>
  <div class="totals">
    {f'''<div class="bank-details">
      <div style="font-weight:900;margin-bottom:8px;text-transform:uppercase;color:#475569;letter-spacing:0.1em;border-bottom:1px solid #cbd5e1;padding-bottom:4px">Bank Details For Remittance</div>
      <div style="margin-bottom:3px"><strong>Account Name:</strong> {acc_name}</div>
      <div style="margin-bottom:3px"><strong>Bank Name:</strong> {bank_name}</div>
      <div style="margin-bottom:3px"><strong>Account No:</strong> {acc_no}</div>
      <div style="margin-bottom:3px"><strong>IFSC Code:</strong> {ifsc}</div>
      {f'<div><strong>UPI ID:</strong> {upi}</div>' if upi else ''}
    </div>''' if any([bank_name, acc_no]) else "<div></div>"}
    <div class="totals-inner">
      <div class="tot-row"><span>Subtotal</span><span>{subtotal:,.0f}</span></div>
      <div class="tot-row" style="color:#2563eb"><span>Discount</span><span>{discount:,.0f}</span></div>
      {f'<div class="tot-row"><span>Tax ({tax_rate}%)</span><span>{tax_amount:,.0f}</span></div>' if tax_rate > 0 else ""}
      <div class="tot-row grand"><span>Grand Total</span><span class="grand-val">Rs {grand_total:,.0f}</span></div>
    </div>
  </div>
  {"" if not any([terms_payment, terms_content, terms_downtime, terms_branding]) else f'''
  <div class="terms-title">Terms &amp; Conditions</div>
  <div class="terms-grid">
    {('<div><div class="term-h">01. PAYMENT</div><div class="term-p">' + terms_payment + "</div></div>") if terms_payment else ""}
    {('<div><div class="term-h">02. CONTENT POLICY</div><div class="term-p">' + terms_content + "</div></div>") if terms_content else ""}
    {('<div><div class="term-h">03. DOWNTIME</div><div class="term-p">' + terms_downtime + "</div></div>") if terms_downtime else ""}
    {('<div><div class="term-h">BRAND PRIMING</div><div class="term-p">' + terms_branding + "</div></div>") if terms_branding else ""}
  </div>'''}
  <div class="sig" style="display:flex; justify-content:flex-end; align-items:flex-end; gap:20px; padding-top:24px; border-top:1px solid #e2e8f0;">
    {f'<img src="{escape(company.get("seal_url"))}" alt="Seal" style="height:80px; object-fit:contain;"/>' if company.get("seal_url") else ""}
    <div style="text-align:center;">
      <span class="sig-text">Authorized Signatory</span>
    </div>
  </div>
</body>
</html>"""


def send_quotation_email(
    to_email: str,
    booking,
    quotation_data: dict,
    company: dict,
    *,
    pdf_bytes: bytes | None = None,
    pdf_filename: str | None = None,
) -> bool:
    """Send a cover email with the quotation attached as a PDF."""
    safe_company = escape(company.get("name") or "Olrac Adverse")
    safe_client = escape(str(booking.client_name or ""))
    safe_campaign = escape(str(quotation_data.get("campaign_name") or booking.ad_description or "your campaign"))
    phone_c = escape(company.get("phone") or "")
    email_c = escape(company.get("email") or "")

    subject = f"{safe_company}  - Advertising Quotation"

    cover_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#0f172a}}
  .page{{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,.10)}}
  .hdr{{background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#fff;padding:32px 40px}}
  .hdr h1{{margin:0;font-size:20px;font-weight:900}}
  .hdr p{{margin:6px 0 0;opacity:.85;font-size:13px;line-height:1.6}}
  .body{{padding:32px 40px}}
  .body p{{color:#334155;font-size:14px;line-height:1.8;margin:0 0 14px}}
.footer{{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;color:#94a3b8;font-size:11px;text-align:center}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <h1>{safe_company}</h1>
    <p>Advertising Quotation  - {safe_campaign}</p>
  </div>
  <div class="body">
    <p>Dear <strong>{safe_client}</strong>,</p>
    <p>Thank you for your interest in our advertising services. Please find your customised advertising quotation attached to this email as a PDF document.</p>
    <p>The quotation covers your campaign specifications, slot details, pricing, and terms. Kindly review it and reach out if you need any modifications.</p>
    <p>We look forward to working with you.</p>
    <p>Warm regards,<br><strong>{safe_company}</strong></p>
  </div>
  <div class="footer">{email_c}{(" &nbsp;|&nbsp; " + phone_c) if phone_c else ""}</div>
</div>
</body>
</html>"""

    return _send_html_email(to_email, subject, cover_html, pdf_bytes=pdf_bytes, pdf_filename=pdf_filename)


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
            <span class="detail-label">Duration</span>
            <span class="detail-value">{escape(str(booking_data.get('duration_label', booking_data.get('billing_cycle', 'N/A'))))}</span>
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


