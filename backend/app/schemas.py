"""Pydantic schemas for request/response validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    company: str = Field(..., min_length=1, max_length=150)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    company: Optional[str] = None
    phone: Optional[str] = None
    must_change_password: Optional[bool] = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)


class AdminUserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)


class AdminForgotPasswordRequest(BaseModel):
    email: EmailStr


class AdminForgotPasswordSendResponse(BaseModel):
    email: EmailStr
    detail: str
    expires_in_seconds: int
    resend_in_seconds: int


class AdminForgotPasswordVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$")


class AdminForgotPasswordVerifyResponse(BaseModel):
    email: EmailStr
    detail: str
    reset_token: str
    verified_for_seconds: int


class AdminForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    reset_token: str = Field(..., min_length=16, max_length=255)
    new_password: str = Field(..., min_length=6)


class QuotationItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[Any] = None
    description: str = ""
    no_of_slots: Optional[int] = Field(None, ge=1)
    slot_duration: Optional[str] = None
    rate: Optional[float] = Field(None, ge=0)
    subtotal: Optional[float] = Field(None, ge=0)


class QuotationDataInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    pricing_mode: str = Field("booking", pattern="^(booking|manual)$")
    items: Optional[List[QuotationItem]] = None
    discount: Optional[float] = Field(None, ge=0)
    tax_enabled: Optional[bool] = None
    tax_rate: Optional[float] = Field(None, ge=0, le=100)
    campaign_name: Optional[str] = Field(None, max_length=300)
    issue_date: Optional[str] = None
    duration_start: Optional[str] = None
    duration_end: Optional[str] = None
    total_days_text: Optional[str] = None
    terms_payment: Optional[str] = None
    terms_content: Optional[str] = None
    terms_downtime: Optional[str] = None
    terms_branding: Optional[str] = None
    is_manually_locked: Optional[bool] = None


class QuotationUpdateRequest(BaseModel):
    quotation_data: QuotationDataInput = Field(default_factory=QuotationDataInput)


class QuotationSendRequest(BaseModel):
    send_to_client: bool = True
    send_to_admin: bool = False
    client_email: Optional[str] = None
    admin_email: Optional[str] = None


TokenResponse.model_rebuild()


class ScreenCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    area: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    footfall: Optional[str] = None
    base_price: float = Field(0, ge=0)
    price_unit: str = Field("day", pattern="^(hour|day|month)$")
    total_slots: int = Field(10, ge=1)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    promo_video_url: Optional[str] = None
    additional_images: Optional[List[str]] = Field(default_factory=list)
    gallery_order: Optional[List[str]] = Field(default_factory=list)

class ScreenUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None
    footfall: Optional[str] = None
    base_price: Optional[float] = None
    price_unit: Optional[str] = Field(None, pattern="^(hour|day|month)$")
    total_slots: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    promo_video_url: Optional[str] = None
    additional_images: Optional[List[str]] = None
    gallery_order: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ScreenOut(BaseModel):
    id: int
    name: str
    area: str
    description: Optional[str] = None
    footfall: Optional[str] = None
    base_price: float
    price_unit: str
    total_slots: int
    booked_slots: int
    available_slots: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    promo_video_url: Optional[str] = None
    additional_images: List[str] = []
    gallery_order: List[str] = []
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    screen_id: Optional[int] = None
    screen_ids: List[int] = Field(default_factory=list)
    screen_slots: Optional[dict[int, int]] = Field(default_factory=dict)
    client_name: str = Field(..., min_length=1, max_length=150)
    company: str = Field(..., min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    email_verification_token: Optional[str] = Field(default=None, min_length=16, max_length=255)
    phone: Optional[str] = None
    budget: Optional[float] = None
    ad_description: Optional[str] = None
    polished_description: Optional[str] = None
    duration_label: str = Field(default="1 Month")
    duration_days: int = 0
    duration_hours: int = 0
    billing_cycle: Optional[str] = None  # Deprecated – use duration_label instead
    slot_quantity: int = Field(1, ge=1)


class BookingOtpSendRequest(BaseModel):
    email: EmailStr


class BookingOtpSendResponse(BaseModel):
    email: EmailStr
    detail: str
    expires_in_seconds: int
    resend_in_seconds: int


class BookingOtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$")


class BookingOtpVerifyResponse(BaseModel):
    email: EmailStr
    detail: str
    verification_token: str
    verified_for_seconds: int


class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|cancelled)$")


class SelectedScreenOut(BaseModel):
    id: int
    name: str
    area: str
    slots: int = 1
    footfall: Optional[str] = None
    base_price: Optional[float] = None
    price_unit: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    screen_id: Optional[int] = None
    screen_ids: List[int] = Field(default_factory=list)
    selected_screens: List[SelectedScreenOut] = Field(default_factory=list)
    location_count: int = 1
    client_name: str
    company: str
    email: Optional[str] = None
    phone: Optional[str] = None
    budget: Optional[float] = None
    ad_description: Optional[str] = None
    polished_description: Optional[str] = None
    duration_label: str
    duration_days: int
    duration_hours: int
    billing_cycle: Optional[str] = None
    slot_quantity: int
    total_price: float
    status: str
    ai_category: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    screen_name: Optional[str] = None
    screen_area: Optional[str] = None
    user_name: Optional[str] = None
    quotation_token: Optional[str] = None

    class Config:
        from_attributes = True


class AIPolishRequest(BaseModel):
    text: str = Field(..., min_length=1)


class AIPolishResponse(BaseModel):
    original: str
    polished: str


class AISummarizeRevenueRequest(BaseModel):
    total_revenue: float
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    cancelled_bookings: int
    top_categories: Optional[List[dict]] = None


class AISummarizeRevenueResponse(BaseModel):
    summary: str


class AIInsightsRequest(BaseModel):
    total_revenue: float
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    cancelled_bookings: int
    bookings_trend: Optional[List[dict]] = None
    top_locations: Optional[List[dict]] = None
    revenue_analysis: Optional[List[dict]] = None
    time_slot_usage: Optional[List[dict]] = None


class AIInsightsResponse(BaseModel):
    highlights: List[str]
    details: List[dict]


class AnalyticsOut(BaseModel):
    total_revenue: float
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    cancelled_bookings: int
    total_screens: int
    active_screens: int
    category_breakdown: List[dict]
    monthly_revenue: List[dict]
    recent_bookings: List[BookingOut]


class DashboardSummaryOut(BaseModel):
    total_bookings: int
    total_revenue: float
    active_locations: int
    total_users: int
    bookings_trend_percent: float = 0
    revenue_trend_percent: float = 0


class BookingTrendPoint(BaseModel):
    label: str
    bookings: int


class RevenueAnalysisPoint(BaseModel):
    label: str
    revenue: float


class TopLocationPoint(BaseModel):
    label: str
    bookings: int
    revenue: float


class TopCustomerPoint(BaseModel):
    label: str
    bookings: int
    revenue: float


class BookingStatusPoint(BaseModel):
    label: str
    count: int


class TimeSlotUsagePoint(BaseModel):
    label: str
    count: int


class SettingsOut(BaseModel):
    id: int
    whatsapp_number: str
    contact_email: str
    config: Optional[dict] = {}
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    contact_email: Optional[str] = None
    config: Optional[dict] = None
