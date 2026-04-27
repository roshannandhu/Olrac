"""Groq AI service for text polishing, summarisation, and classification."""

import json

import httpx
from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def _call_groq(system_prompt: str, user_prompt: str) -> str:
    """Make an async call to the Groq chat completions API."""
    if not settings.GROQ_API_KEY:
        return "[AI unavailable — no GROQ_API_KEY configured]"

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[AI error: {str(e)}]"


async def polish_text(raw_text: str) -> str:
    """Polish a raw ad description into professional ad copy."""
    system = (
        "You are an expert advertising copywriter. Rewrite the user's raw ad "
        "description into polished, professional, compelling advertising copy. "
        "Keep the core message but make it persuasive and engaging. "
        "Return ONLY the rewritten text, nothing else."
    )
    return await _call_groq(system, raw_text)


async def summarize_booking(booking_data: dict) -> str:
    """Generate a 1-paragraph executive summary of a booking."""
    system = (
        "You are a business analyst. Write a concise 1-paragraph executive "
        "summary of this advertising booking. Include key details like client, "
        "screen, pricing, and billing cycle. Be professional and clear. "
        "Return ONLY the summary paragraph."
    )
    user_msg = (
        f"Client: {booking_data.get('client_name', 'N/A')}\n"
        f"Company: {booking_data.get('company', 'N/A')}\n"
        f"Screen: {booking_data.get('screen_name', 'N/A')}\n"
        f"Area: {booking_data.get('screen_area', 'N/A')}\n"
        f"Duration: {booking_data.get('duration', 'N/A')}\n"
        f"Slots: {booking_data.get('slot_quantity', 1)}\n"
        f"Total Price: ${booking_data.get('total_price', 0)}\n"
        f"Ad Description: {booking_data.get('ad_description', 'N/A')}"
    )
    return await _call_groq(system, user_msg)


async def classify_intent(ad_description: str) -> str:
    """Classify the advertising intent into a category."""
    system = (
        "You are an advertising analyst. Classify the following ad description "
        "into exactly ONE of these categories: Retail, Food & Beverage, "
        "Technology, Healthcare, Automotive, Real Estate, Entertainment, "
        "Education, Finance, Fashion, Travel, Sports, Other. "
        "Return ONLY the category name, nothing else."
    )
    return await _call_groq(system, ad_description or "General advertisement")


async def summarize_revenue(stats: dict) -> str:
    """Generate a natural-language summary of revenue statistics."""
    system = (
        "You are a business intelligence analyst. Write a concise, insightful "
        "2-3 sentence summary of these advertising platform revenue statistics. "
        "Highlight trends, performance, and actionable insights. "
        "Return ONLY the summary."
    )
    user_msg = (
        f"Total Revenue: ${stats.get('total_revenue', 0):,.2f}\n"
        f"Total Bookings: {stats.get('total_bookings', 0)}\n"
        f"Confirmed: {stats.get('confirmed_bookings', 0)}\n"
        f"Pending: {stats.get('pending_bookings', 0)}\n"
        f"Cancelled: {stats.get('cancelled_bookings', 0)}\n"
        f"Top Categories: {stats.get('top_categories', [])}"
    )
    return await _call_groq(system, user_msg)


async def generate_admin_ai_insights(payload: dict) -> dict:
    """Generate structured AI highlights/details for the admin insights page."""
    system = (
        "You are a senior SaaS business intelligence analyst. "
        "Return strict JSON with two keys: "
        "\"highlights\" as an array of exactly 4 short bullet strings, and "
        "\"details\" as an array of exactly 7 objects with keys \"title\" and \"value\". "
        "The detail titles must be exactly: "
        "Summary, Top Locations, Peak Times, Alerts, Revenue Analysis, User Behavior, Suggestions. "
        "Be concise, actionable, and professional. Do not include markdown fences."
    )
    user_msg = json.dumps(payload)
    raw = await _call_groq(system, user_msg)

    try:
        parsed = json.loads(raw)
        highlights = parsed.get("highlights") or []
        details = parsed.get("details") or []
        if not isinstance(highlights, list) or not isinstance(details, list):
            raise ValueError("Invalid AI insights format")
        return {"highlights": highlights[:4], "details": details[:7]}
    except Exception:
        return {
            "highlights": [
                "AI highlights are temporarily unavailable.",
                "Refresh to try again after the model responds.",
                "Core analytics are still available below.",
                "Use the charts to continue your review.",
            ],
            "details": [
                {"title": "Summary", "value": "AI summary could not be generated right now."},
                {"title": "Top Locations", "value": "Check the Top Locations chart for the strongest performing inventory."},
                {"title": "Peak Times", "value": "Review time slot usage to infer demand concentration."},
                {"title": "Alerts", "value": "Check pending and rejected bookings for operational follow-up."},
                {"title": "Revenue Analysis", "value": "Review monthly revenue bars for short-term performance changes."},
                {"title": "User Behavior", "value": "Inspect bookings versus total clients to understand repeat usage."},
                {"title": "Suggestions", "value": "Refresh AI later for a model-generated recommendation set."},
            ],
        }
