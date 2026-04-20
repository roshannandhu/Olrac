import json
from sqlalchemy import create_engine, MetaData, Table, Column, String, Integer, DateTime, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    # 1. Ensure system_settings exists
    conn.execute(text("CREATE TABLE IF NOT EXISTS system_settings (id SERIAL PRIMARY KEY, whatsapp_number VARCHAR(20), contact_email VARCHAR(150), updated_at TIMESTAMP)"))
    
    # Check if there is data, if not insert default
    res = conn.execute(text("SELECT COUNT(*) FROM system_settings")).scalar()
    if res == 0:
        conn.execute(text("INSERT INTO system_settings (whatsapp_number, contact_email) VALUES ('919876543210', 'support@olrac.com')"))

    # 2. Add additional_images to screens
    try:
        conn.execute(text("ALTER TABLE screens ADD COLUMN additional_images JSON"))
    except Exception as e:
        print("Column additional_images may already exist.", e)

    # 3. Fix existing image urls to be relative
    try:
        conn.execute(text("UPDATE screens SET image_url = REPLACE(image_url, 'http://localhost:8000', '') WHERE image_url LIKE 'http://localhost:8000%'"))
        # Also fix any that might have had 8001
        conn.execute(text("UPDATE screens SET image_url = REPLACE(image_url, 'http://localhost:8001', '') WHERE image_url LIKE 'http://localhost:8001%'"))
    except Exception as e:
        print("Error updating image URLs.", e)
        
    conn.commit()
print("Migration completed.")
