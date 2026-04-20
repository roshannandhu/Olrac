"""Small runtime schema updates for development deployments."""

from sqlalchemy import inspect, text


def ensure_schema_updates(engine):
    inspector = inspect(engine)

    if "screens" in inspector.get_table_names():
        screen_columns = {column["name"] for column in inspector.get_columns("screens")}
        if "price_yearly" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0"))
        if "latitude" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN latitude NUMERIC(9, 6)"))
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN longitude NUMERIC(9, 6)"))
        if "footfall" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN footfall VARCHAR(100)"))

    if engine.dialect.name == "postgresql" and "bookings" in inspector.get_table_names():
        booking_columns = {column["name"]: column for column in inspector.get_columns("bookings")}
        with engine.begin() as conn:
            if booking_columns.get("user_id", {}).get("nullable") is False:
                conn.execute(text("ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL"))
            if booking_columns.get("email", {}).get("nullable") is False:
                conn.execute(text("ALTER TABLE bookings ALTER COLUMN email DROP NOT NULL"))

    if "bookings" in inspector.get_table_names():
        booking_columns = {column["name"] for column in inspector.get_columns("bookings")}
        with engine.begin() as conn:
            if "selected_screen_ids" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN selected_screen_ids JSON"))
            if "selected_screens" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN selected_screens JSON"))

    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text("ALTER TYPE billingcycle ADD VALUE IF NOT EXISTS 'yearly'"))
