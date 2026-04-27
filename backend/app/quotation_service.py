"""Helpers for building and normalizing quotation pricing."""

from __future__ import annotations

from typing import Any

from app.models import Booking

_TRUE_VALUES = {"1", "true", "t", "y", "yes", "on"}


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value in (None, ""):
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _round_money(value: Any) -> float:
    return round(_to_float(value), 2)


def is_truthy(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in _TRUE_VALUES


def get_screen_unit_price(
    base_price: Any,
    price_unit: Any,
    duration_days: int,
    duration_hours: int,
) -> float:
    rate = _to_float(base_price)
    unit = str(price_unit or "day").strip().lower()

    if unit == "hour":
        return _round_money(rate * max(1, _to_int(duration_hours, 0)))

    if unit == "month":
        months = max(1, round(_to_int(duration_days, 0) / 30))
        return _round_money(rate * months)

    return _round_money(rate * max(1, _to_int(duration_days, 0)))


def _normalize_manual_item(
    item: dict[str, Any],
    *,
    index: int,
    base_slot_duration: int,
    default_slot_quantity: int,
) -> dict[str, Any]:
    slots = max(1, _to_int(item.get("no_of_slots"), default_slot_quantity))
    rate = _to_float(item.get("rate"))
    subtotal = _to_float(item.get("subtotal"))

    if rate <= 0 and subtotal > 0 and slots > 0:
        rate = subtotal / slots
    if subtotal <= 0:
        subtotal = rate * slots

    description = str(item.get("description") or f"Digital Ad Placement {index + 1}").strip()
    slot_duration = str(item.get("slot_duration") or "").strip() or f"{base_slot_duration * slots} Sec"

    return {
        "id": item.get("id") or f"manual-{index + 1}",
        "description": description,
        "no_of_slots": slots,
        "slot_duration": slot_duration,
        "rate": _round_money(rate),
        "subtotal": _round_money(subtotal if subtotal > 0 else rate * slots),
    }


def build_quotation_items(
    selected_screens: list[dict[str, Any]] | None,
    *,
    duration_days: int,
    duration_hours: int,
    base_slot_duration: int,
    fallback_total_price: float = 0.0,
    default_slot_quantity: int = 1,
    existing_items: list[dict[str, Any]] | None = None,
    pricing_mode: str = "booking",
) -> list[dict[str, Any]]:
    screens = list(selected_screens or [])
    saved_items = list(existing_items or [])
    normalized_mode = "manual" if str(pricing_mode or "").strip().lower() == "manual" else "booking"
    safe_slot_duration = max(1, _to_int(base_slot_duration, 20))
    safe_default_slot_quantity = max(1, _to_int(default_slot_quantity, 1))

    if normalized_mode == "manual" and saved_items:
        return [
            _normalize_manual_item(
                item,
                index=index,
                base_slot_duration=safe_slot_duration,
                default_slot_quantity=safe_default_slot_quantity,
            )
            for index, item in enumerate(saved_items)
        ]

    if not screens:
        if saved_items:
            return [
                _normalize_manual_item(
                    item,
                    index=index,
                    base_slot_duration=safe_slot_duration,
                    default_slot_quantity=safe_default_slot_quantity,
                )
                for index, item in enumerate(saved_items)
            ]

        slots = safe_default_slot_quantity
        rate = _round_money(fallback_total_price / slots) if slots > 0 else 0.0
        return [{
            "id": "manual-1",
            "description": "Digital Ad Placement",
            "no_of_slots": slots,
            "slot_duration": f"{safe_slot_duration * slots} Sec",
            "rate": rate,
            "subtotal": _round_money(fallback_total_price),
        }]

    saved_items_by_id = {}
    for item in saved_items:
        item_id = item.get("id")
        if item_id is not None:
            saved_items_by_id[str(item_id)] = item

    total_slots = sum(
        max(1, _to_int(screen.get("slots"), safe_default_slot_quantity))
        for screen in screens
    )
    fallback_rate_per_slot = (_to_float(fallback_total_price) / total_slots) if total_slots > 0 else 0.0

    items: list[dict[str, Any]] = []
    for index, screen in enumerate(screens):
        saved_item = saved_items_by_id.get(str(screen.get("id")))
        if saved_item is None and index < len(saved_items):
            saved_item = saved_items[index]

        slots = max(1, _to_int(screen.get("slots"), safe_default_slot_quantity))
        rate = get_screen_unit_price(
            screen.get("base_price"),
            screen.get("price_unit"),
            duration_days,
            duration_hours,
        )

        if rate <= 0 and saved_item:
            rate = _to_float(saved_item.get("rate"))
            if rate <= 0:
                saved_subtotal = _to_float(saved_item.get("subtotal"))
                if saved_subtotal > 0 and slots > 0:
                    rate = saved_subtotal / slots

        if rate <= 0:
            rate = fallback_rate_per_slot

        screen_name = screen.get("name") or f'Screen #{screen.get("id", index + 1)}'
        screen_area = screen.get("area") or "Standard Plot"
        description = str(
            (saved_item or {}).get("description")
            or f"{screen_name} - {screen_area}"
        ).strip()

        items.append({
            "id": screen.get("id") or f"screen-{index + 1}",
            "description": description,
            "no_of_slots": slots,
            "slot_duration": f"{safe_slot_duration * slots} Sec",
            "rate": _round_money(rate),
            "subtotal": _round_money(rate * slots),
        })

    return items


def calculate_quotation_totals(
    items: list[dict[str, Any]] | None,
    *,
    discount: Any = 0.0,
    tax_rate: Any = 0.0,
    tax_enabled: bool = True,
) -> dict[str, float]:
    normalized_items = list(items or [])
    subtotal = _round_money(sum(_to_float(item.get("subtotal")) for item in normalized_items))
    safe_discount = _round_money(max(0.0, _to_float(discount)))
    safe_tax_rate = _round_money(max(0.0, _to_float(tax_rate))) if tax_enabled else 0.0
    taxable_amount = max(0.0, subtotal - safe_discount)
    tax_amount = _round_money(taxable_amount * (safe_tax_rate / 100.0))

    return {
        "subtotal": subtotal,
        "discount": safe_discount,
        "tax_rate": safe_tax_rate,
        "tax_amount": tax_amount,
        "grand_total": _round_money(taxable_amount + tax_amount),
    }


def normalize_quotation_data(
    booking: Booking,
    quotation_data: dict[str, Any] | None,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw_data = dict(quotation_data or {})
    settings = dict(config or {})

    pricing_mode = str(raw_data.get("pricing_mode") or "booking").strip().lower()
    if pricing_mode not in {"booking", "manual"}:
        pricing_mode = "booking"

    base_slot_duration = max(1, _to_int(settings.get("booking_base_slot_duration_seconds"), 20))
    default_tax_enabled = is_truthy(settings.get("quotation_tax_enabled"), True)
    tax_enabled = is_truthy(raw_data.get("tax_enabled"), default_tax_enabled)
    tax_rate = (
        _to_float(raw_data.get("tax_rate"))
        if raw_data.get("tax_rate") is not None
        else _to_float(settings.get("quotation_tax_rate"), 0.0)
    )
    if not tax_enabled:
        tax_rate = 0.0

    items = build_quotation_items(
        booking.selected_screens or [],
        duration_days=booking.duration_days or 0,
        duration_hours=booking.duration_hours or 0,
        base_slot_duration=base_slot_duration,
        fallback_total_price=_to_float(booking.total_price),
        default_slot_quantity=booking.slot_quantity or 1,
        existing_items=raw_data.get("items") or [],
        pricing_mode=pricing_mode,
    )

    totals = calculate_quotation_totals(
        items,
        discount=raw_data.get("discount"),
        tax_rate=tax_rate,
        tax_enabled=tax_enabled,
    )

    normalized = dict(raw_data)
    normalized.update({
        "pricing_mode": pricing_mode,
        "items": items,
        "subtotal": totals["subtotal"],
        "discount": totals["discount"],
        "tax_enabled": tax_enabled,
        "tax_rate": totals["tax_rate"],
        "tax_amount": totals["tax_amount"],
        "grand_total": totals["grand_total"],
    })
    return normalized


def get_effective_quotation_total(quotation_data: dict[str, Any] | None) -> float:
    normalized = dict(quotation_data or {})
    if normalized.get("grand_total") is not None:
        return _round_money(normalized.get("grand_total"))
    return _round_money(normalized.get("subtotal"))


def synchronize_booking_pricing(
    booking: Booking,
    config: dict[str, Any] | None = None,
) -> bool:
    # Skip auto-recalculation when admin has explicitly locked the quotation
    if (booking.quotation_data or {}).get("is_manually_locked"):
        return False

    normalized = normalize_quotation_data(booking, booking.quotation_data or {}, config)
    next_total = get_effective_quotation_total(normalized)
    current_total = _round_money(booking.total_price)
    current_quotation = dict(booking.quotation_data or {})

    if current_total == next_total and current_quotation == normalized:
        return False

    booking.quotation_data = normalized
    booking.total_price = next_total
    return True
