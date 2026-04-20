"""Public settings routes exposed to the client website."""

from fastapi import APIRouter

from app.settings_service import get_merged_settings

router = APIRouter(prefix="/api/settings", tags=["Public Settings"])


@router.get("/brand-images")
def get_brand_images():
    """Return homepage brand-carousel images configured by admin settings."""
    merged = get_merged_settings()
    images = merged["config"].get("general_brand_images", []) or []
    return {
        "images": [image for image in images if image],
    }


@router.get("/landing-videos")
def get_landing_videos():
    """Return homepage promotional videos for the 3 visual cards."""
    merged = get_merged_settings()
    c1 = merged["config"].get("landing_card_1_videos", []) or []
    c2 = merged["config"].get("landing_card_2_videos", []) or []
    c3 = merged["config"].get("landing_card_3_videos", []) or []
    return {
        "card1": [v for v in c1 if v],
        "card2": [v for v in c2 if v],
        "card3": [v for v in c3 if v],
    }
