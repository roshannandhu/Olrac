"""AI-powered routes: polish text, summarize revenue."""

from fastapi import APIRouter, Depends
from app.schemas import (
    AIInsightsRequest,
    AIInsightsResponse,
    AIPolishRequest,
    AIPolishResponse,
    AISummarizeRevenueRequest,
    AISummarizeRevenueResponse,
)
from app.ai_service import generate_admin_ai_insights, polish_text, summarize_revenue
from app.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/polish", response_model=AIPolishResponse)
async def polish_ad_text(
    req: AIPolishRequest,
):
    """Polish raw ad description text using AI."""
    polished = await polish_text(req.text)
    return AIPolishResponse(original=req.text, polished=polished)


@router.post("/summarize-revenue", response_model=AISummarizeRevenueResponse)
async def summarize_revenue_stats(
    req: AISummarizeRevenueRequest,
    admin: User = Depends(get_current_user),
):
    """Summarize revenue statistics using AI (admin)."""
    stats = {
        "total_revenue": req.total_revenue,
        "total_bookings": req.total_bookings,
        "confirmed_bookings": req.confirmed_bookings,
        "pending_bookings": req.pending_bookings,
        "cancelled_bookings": req.cancelled_bookings,
        "top_categories": req.top_categories or [],
    }
    summary = await summarize_revenue(stats)
    return AISummarizeRevenueResponse(summary=summary)


@router.post("/admin-insights", response_model=AIInsightsResponse)
async def build_admin_ai_insights(
    req: AIInsightsRequest,
    admin: User = Depends(get_current_user),
):
    payload = {
        "total_revenue": req.total_revenue,
        "total_bookings": req.total_bookings,
        "confirmed_bookings": req.confirmed_bookings,
        "pending_bookings": req.pending_bookings,
        "cancelled_bookings": req.cancelled_bookings,
        "bookings_trend": req.bookings_trend or [],
        "top_locations": req.top_locations or [],
        "revenue_analysis": req.revenue_analysis or [],
        "time_slot_usage": req.time_slot_usage or [],
    }
    result = await generate_admin_ai_insights(payload)
    return AIInsightsResponse(**result)
