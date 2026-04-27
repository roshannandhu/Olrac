"""SQLAlchemy ORM Models for the Olrac Adverse platform."""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, DateTime,
    Enum as SAEnum, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    client = "client"


# Note: BillingCycle enum is deprecated but kept for backwards compatibility parsing.
class BillingCycle(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.client, nullable=False)
    company = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email} ({self.role.value})>"


class Screen(Base):
    __tablename__ = "screens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    area = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    footfall = Column(String(100), nullable=True)
    price_daily = Column(Numeric(10, 2), nullable=False, default=0)
    price_weekly = Column(Numeric(10, 2), nullable=False, default=0)
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0)
    price_yearly = Column(Numeric(10, 2), nullable=False, default=0)
    base_price = Column(Numeric(10, 2), nullable=False, default=0)
    price_unit = Column(String(20), nullable=False, default="day")
    total_slots = Column(Integer, nullable=False, default=10)
    booked_slots = Column(Integer, nullable=False, default=0)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    image_url = Column(String(500), nullable=True)
    promo_video_url = Column(String(500), nullable=True)
    additional_images = Column(JSON, nullable=True, default=list)
    gallery_order = Column(JSON, nullable=True, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bookings = relationship("Booking", back_populates="screen")

    @property
    def available_slots(self):
        return self.total_slots - self.booked_slots

    def __repr__(self):
        return f"<Screen {self.name} @ {self.area}>"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    screen_id = Column(Integer, ForeignKey("screens.id"), nullable=False)
    selected_screen_ids = Column(JSON, nullable=True, default=list)
    selected_screens = Column(JSON, nullable=True, default=list)

    # Client details from checkout form
    client_name = Column(String(150), nullable=False)
    company = Column(String(150), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    budget = Column(Numeric(10, 2), nullable=True)
    ad_description = Column(Text, nullable=True)
    polished_description = Column(Text, nullable=True)

    # Booking details
    duration_label = Column(String(100), nullable=False, default="1 Month")
    duration_days = Column(Integer, nullable=False, default=0)
    duration_hours = Column(Integer, nullable=False, default=0)
    billing_cycle = Column(SAEnum(BillingCycle), nullable=True) # Deprecated
    slot_quantity = Column(Integer, nullable=False, default=1)
    total_price = Column(Numeric(10, 2), nullable=False, default=0)

    # Status
    status = Column(SAEnum(BookingStatus), default=BookingStatus.pending, nullable=False)

    # AI-generated fields
    ai_category = Column(String(100), nullable=True)
    ai_summary = Column(Text, nullable=True)

    quotation_data = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="bookings")
    screen = relationship("Screen", back_populates="bookings")

    def __repr__(self):
        return f"<Booking #{self.id} - {self.client_name} ({self.status.value})>"

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    whatsapp_number = Column(String(20), default="919876543210")
    contact_email = Column(String(150), default="support@olrac.com")
    config = Column(JSON, nullable=True, default=dict)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SystemSettings #{self.id}>"
