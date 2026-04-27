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
        if "base_price" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN base_price NUMERIC(10, 2) NOT NULL DEFAULT 0"))
        if "price_unit" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN price_unit VARCHAR(20) NOT NULL DEFAULT 'day'"))
        if "promo_video_url" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN promo_video_url VARCHAR(500)"))
        if "gallery_order" not in screen_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE screens ADD COLUMN gallery_order JSON"))

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
            if "quotation_data" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN quotation_data JSON"))
            if "duration_label" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN duration_label VARCHAR(100) NOT NULL DEFAULT '1 Month'"))
            if "duration_days" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 0"))
            if "duration_hours" not in booking_columns:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 0"))
            # Optionally alter `billing_cycle` to be nullable if it was NOT NULL
            if "billing_cycle" in booking_columns:
                if engine.dialect.name == "sqlite":
                    pass # SQLite doesn't easily ALTER COLUMN DROP NOT NULL
                else:
                    conn.execute(text("ALTER TABLE bookings ALTER COLUMN billing_cycle DROP NOT NULL"))

    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text("ALTER TYPE billingcycle ADD VALUE IF NOT EXISTS 'yearly'"))

    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "must_change_password" not in user_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE"))
