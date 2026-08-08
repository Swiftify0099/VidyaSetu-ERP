"""
VidyaSetu ERP — Application Settings
=====================================
All configuration loaded from .env file.
Never hardcode values — always use settings.VARIABLE_NAME.
"""
from functools import lru_cache
from typing import List, Optional
from urllib.parse import quote_plus, urlparse
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    APP_NAME: str = "VidyaSetu ERP"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str
    APP_DEBUG: bool = False
    APP_VERSION: str = "1.0.0"

    # ── Database ──────────────────────────────────────────────
    # Docker uses DATABASE_URL directly. Replit's managed PostgreSQL also
    # provides PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE; prefer those when
    # an uploaded Docker .env still contains a localhost URL.
    DATABASE_URL: str = ""
    PGHOST: str = ""
    PGPORT: int = 5432
    PGUSER: str = ""
    PGPASSWORD: str = ""
    PGDATABASE: str = ""
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── AI / OpenRouter ───────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "inclusionai/ling-3.0-flash:free"
    OPENROUTER_MAX_TOKENS: int = 2048
    OPENROUTER_TEMPERATURE: float = 0.7
    AI_SITE_URL: str = "http://localhost:5173"
    AI_SITE_NAME: str = "VidyaSetu ERP"

    # ── Firebase ──────────────────────────────────────────────
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"
    FIREBASE_PROJECT_ID: str = ""

    # ── Storage ───────────────────────────────────────────────
    UPLOAD_BASE_DIR: str = "./storage"
    MAX_FILE_SIZE_MB: int = 50
    MAX_VIDEO_SIZE_MB: int = 500
    ALLOWED_IMAGE_TYPES: str = "jpg,jpeg,png,webp"
    ALLOWED_DOC_TYPES: str = "pdf,doc,docx,xls,xlsx,ppt,pptx"
    ALLOWED_VIDEO_TYPES: str = "mp4,mov,avi,webm,mkv"
    # Base URL of the backend server — used to build absolute file URLs returned by the API.
    # Frontend at a different domain cannot resolve relative /storage/ paths.
    # Example: https://vidyasetu-backend.onrender.com  (no trailing slash)
    BACKEND_URL: str = "http://localhost:8000"

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DB: int = 0

    # ── CORS ──────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "https://vidyasetu.pages.dev,https://vidyasetu-erp.vidyasetu001.workers.dev,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # ── School Configuration ──────────────────────────────────
    SCHOOL_CODE: str = "HMMV"
    SCHOOL_NAME: str = "VidyaSetu School"
    SCHOOL_ADDRESS: str = ""
    SCHOOL_PHONE: str = ""
    SCHOOL_EMAIL: str = ""
    SCHOOL_WEBSITE: str = ""
    PRINCIPAL_NAME: str = ""
    CURRENT_ACADEMIC_YEAR: str = "2025-2026"

    # ── Document Prefixes ─────────────────────────────────────
    RECEIPT_PREFIX: str = "RCP"
    CERTIFICATE_PREFIX: str = "CERT"
    GR_PREFIX: str = "GR"
    VOUCHER_PREFIX: str = "VCH"
    LEDGER_PREFIX: str = "LDG"
    ADMISSION_PREFIX: str = "ADM"

    # ── Security ──────────────────────────────────────────────
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCK_DURATION_MINUTES: int = 30
    PASSWORD_MIN_LENGTH: int = 8
    SESSION_TIMEOUT_MINUTES: int = 120
    REQUIRE_PASSWORD_CHANGE_DAYS: int = 90

    # ── Pagination ────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ── Locale ────────────────────────────────────────────────
    TIMEZONE: str = "Asia/Kolkata"
    DATE_FORMAT: str = "DD/MM/YYYY"
    DEFAULT_LANGUAGE: str = "mr"

    # ── SMTP / Email Configuration ────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@vidyasetu.com"
    SMTP_FROM_NAME: str = "VidyaSetu ERP"
    SMTP_TLS: bool = True
    FRONTEND_URL: str = "https://vidyasetu.pages.dev"

    # ── Computed Properties ───────────────────────────────────
    @property
    def allowed_origins_list(self) -> List[str]:
        origins = [o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_URL:
            frontend = self.FRONTEND_URL.strip().rstrip("/")
            if frontend and frontend not in origins:
                origins.append(frontend)
        return origins

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_IMAGE_TYPES.split(",")]

    @property
    def allowed_doc_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_DOC_TYPES.split(",")]

    @property
    def allowed_video_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_VIDEO_TYPES.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — loaded once, reused everywhere."""
    return Settings()


# Global settings instance
settings = get_settings()
