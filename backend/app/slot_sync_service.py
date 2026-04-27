"""Helpers to keep screen slot counts aligned with confirmed bookings."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.models import Booking, BookingStatus, Screen


def get_booking_screen_ids(booking: Booking) -> list[int]:
    selected_screen_ids = booking.selected_screen_ids or []
    if selected_screen_ids:
        return [int(screen_id) for screen_id in selected_screen_ids]
    if booking.screen_id is not None:
        return [int(booking.screen_id)]
    return []


def get_booking_slots_map(booking: Booking) -> dict[int, int]:
    snapshots = booking.selected_screens or []
    return {
        int(snapshot["id"]): int(snapshot.get("slots", booking.slot_quantity))
        for snapshot in snapshots
        if snapshot.get("id") is not None
    }


def sync_booked_slots_for_screens(db: Session, screen_ids: list[int]):
    """Recalculate booked_slots from confirmed bookings for the given screens.
    Disabled as the system is now an enquiry platform, not a reservation platform.
    """
    pass
