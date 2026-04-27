"""Helpers for bootstrapping the default admin account."""

from sqlalchemy.orm import Session

from app.auth import hash_password, verify_password
from app.config import settings
from app.models import User, UserRole


def ensure_default_admin(db: Session, *, sync_password: bool = False) -> User | None:
    """Ensure the configured default admin exists and has the admin role."""
    default_email = (settings.DEFAULT_ADMIN_EMAIL or "").strip().lower()
    default_password = settings.DEFAULT_ADMIN_PASSWORD or ""

    if not default_email:
        return None

    admin = db.query(User).filter(User.email == default_email).first()
    should_commit = False

    if not admin:
        admin = User(
            name=(settings.DEFAULT_ADMIN_NAME or "Admin").strip() or "Admin",
            email=default_email,
            password_hash=hash_password(default_password),
            role=UserRole.admin,
            company=(settings.DEFAULT_ADMIN_COMPANY or "").strip() or None,
            must_change_password=bool(default_password),
        )
        db.add(admin)
        should_commit = True
    else:
        if admin.role != UserRole.admin:
            admin.role = UserRole.admin
            should_commit = True
        if not admin.name and settings.DEFAULT_ADMIN_NAME:
            admin.name = settings.DEFAULT_ADMIN_NAME.strip()
            should_commit = True
        if not admin.company and settings.DEFAULT_ADMIN_COMPANY:
            admin.company = settings.DEFAULT_ADMIN_COMPANY.strip()
            should_commit = True
        if sync_password and default_password and not verify_password(default_password, admin.password_hash):
            admin.password_hash = hash_password(default_password)
            should_commit = True
        # Flag existing admin if must_change_password is unset (NULL) and they still have the default password.
        # Only run the slow bcrypt check when the flag hasn't been evaluated yet.
        if default_password and admin.must_change_password is None and verify_password(default_password, admin.password_hash):
            admin.must_change_password = True
            should_commit = True
        elif default_password and admin.must_change_password is None:
            admin.must_change_password = False
            should_commit = True

    if should_commit:
        db.commit()
        db.refresh(admin)

    return admin
