"""
VidyaSetu ERP — FastAPI Application Entry Point
=================================================
"""
import sys
import asyncio
import logging
from contextlib import asynccontextmanager

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router, admin_router
from app.modules.settings.router import router as settings_router
from app.modules.student.router import router as student_router
from app.modules.teacher.router import router as teacher_router
from app.modules.office.router import router as office_router
from app.modules.finance.router import router as finance_router
from app.modules.finance.waiver_router import router as waiver_router
from app.modules.library.router import router as library_router
from app.modules.exam.router import router as exam_router
from app.modules.attendance.router import router as attendance_router
from app.modules.timetable.router import router as timetable_router
from app.modules.communication.router import router as communication_router
from app.modules.inventory.router import router as inventory_router
from app.modules.analytics.router import router as analytics_router
from app.modules.student_portal.router import router as student_portal_router
from app.modules.teacher_portal.router import router as teacher_portal_router
from app.modules.parent_portal.router import router as parent_portal_router
from app.modules.leave.router import router as leave_router
from app.modules.lesson_plan.router import router as lesson_plan_router
from app.modules.search.router import router as search_router
from app.modules.exports.router import router as exports_router
from app.modules.qr.router import router as qr_router
from app.modules.ai.router import router as ai_router
from app.modules.behaviour.router import router as behaviour_router
from app.modules.transport.router import router as transport_router
from app.shared.storage import StorageService

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.APP_DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate Limiter ──────────────────────────────────────────────
# General: 200 requests/minute per IP
# Auth: 10 requests/minute (applied in auth router)
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment : {settings.APP_ENV}")
    logger.info(f"   Debug Mode  : {settings.APP_DEBUG}")

    # Initialize storage directories
    StorageService.initialize_storage()
    logger.info("   Storage     : Initialized ✓")

    # Initialize database tables
    try:
        from app.database.session import engine
        from app.database.base import BaseModel
        import app.modules.auth.models, app.modules.settings.models, app.modules.student.models
        import app.modules.teacher.models, app.modules.office.models, app.modules.finance.models
        import app.modules.library.models, app.modules.exam.models, app.modules.attendance.models
        import app.modules.timetable.models, app.modules.communication.models, app.modules.inventory.models
        import app.modules.leave.models, app.modules.lesson_plan.models, app.modules.behaviour.models
        import app.modules.transport.models
        BaseModel.metadata.create_all(bind=engine)
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS subject_id BIGINT REFERENCES subjects(id);"))
            conn.execute(text("ALTER TABLE class_attendance_sessions ADD COLUMN IF NOT EXISTS subject_id BIGINT REFERENCES subjects(id);"))
        logger.info("   Database    : All tables & attendance columns verified ✓")
    except Exception as err:
        logger.warning(f"   Database Init Warning: {err}")

    # ── Notification Scheduler ────────────────────────────────
    try:
        from app.database.session import SessionLocal
        from app.shared.notification_scheduler import start_scheduler
        asyncio.create_task(start_scheduler(SessionLocal))
        logger.info("   Scheduler   : Notification scheduler started ✓")
    except Exception as e:
        logger.warning(f"   Scheduler   : Could not start notification scheduler: {e}")

    # ── Firebase Admin SDK Initialization ─────────────────────
    try:
        import os
        import firebase_admin
        from firebase_admin import credentials as fb_credentials
        if not firebase_admin._apps:
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            if cred_path and os.path.exists(cred_path):
                cred = fb_credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                logger.info(f"   Firebase    : Initialized from {cred_path} ✓")
            else:
                logger.warning(f"   Firebase    : Credentials not found at '{cred_path}' — FCM push disabled (simulated mode)")
        else:
            logger.info("   Firebase    : Already initialized ✓")
    except ImportError:
        logger.warning("   Firebase    : firebase-admin not installed — FCM push disabled")
    except Exception as fb_err:
        logger.warning(f"   Firebase    : Init failed — {fb_err}")

    yield

    # Shutdown
    logger.info(f"👋 Shutting down {settings.APP_NAME}")


# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Enterprise School ERP - REST API",
    version=settings.APP_VERSION,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)


# ── Rate Limiting Middleware ──────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

# ── CORS Middleware ───────────────────────────────────────────
cors_origins = [o for o in settings.allowed_origins_list if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://.*" if settings.APP_ENV == "development" else r"https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ── Security Headers Middleware ───────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ── Exception Handlers ────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with user-friendly messages."""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field, "message": error["msg"]})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation failed. Please check your input.",
            "errors": errors,
            "code": "VALIDATION_ERROR",
        },
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": "Endpoint not found.", "code": "NOT_FOUND"},
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error.", "code": "SERVER_ERROR"},
    )


# ── Static Files (Storage) ────────────────────────────────────
import os
storage_path = os.path.abspath(settings.UPLOAD_BASE_DIR)
os.makedirs(storage_path, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_path), name="storage")


# ── API Routers ───────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(student_router, prefix=API_PREFIX)
app.include_router(teacher_router, prefix=API_PREFIX)
app.include_router(office_router, prefix=API_PREFIX)
app.include_router(finance_router, prefix=API_PREFIX)
app.include_router(waiver_router,  prefix=API_PREFIX)
app.include_router(library_router, prefix=API_PREFIX)
app.include_router(exam_router, prefix=API_PREFIX)
app.include_router(attendance_router, prefix=API_PREFIX)
app.include_router(timetable_router, prefix=API_PREFIX)
app.include_router(communication_router, prefix=API_PREFIX)
app.include_router(inventory_router, prefix=API_PREFIX)
app.include_router(analytics_router,       prefix=API_PREFIX)
app.include_router(student_portal_router,  prefix=API_PREFIX)
app.include_router(teacher_portal_router,  prefix=API_PREFIX)
app.include_router(parent_portal_router,   prefix=API_PREFIX)
app.include_router(leave_router,           prefix=API_PREFIX)
app.include_router(lesson_plan_router,     prefix=API_PREFIX)
app.include_router(search_router,          prefix=API_PREFIX)
app.include_router(exports_router,         prefix=API_PREFIX)
app.include_router(qr_router,              prefix=API_PREFIX)
app.include_router(ai_router,              prefix=API_PREFIX)
app.include_router(behaviour_router,       prefix=API_PREFIX)
app.include_router(transport_router,       prefix=API_PREFIX)


# ── Root Endpoint ─────────────────────────────────────────────
@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "docs": "/api/docs",
        "status": "running",
    }


# ── Health Check ─────────────────────────────────────────────
@app.get("/api/v1/health", tags=["System"], include_in_schema=True)
async def health_check():
    """Health check for load balancer and CI/CD verification."""
    import datetime
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }


# ── Entry Point ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_DEBUG,
        log_level="debug" if settings.APP_DEBUG else "info",
    )
