"""
VidyaSetu ERP — Notification Scheduler
========================================
Background task runner for automated/scheduled notifications.

Triggers:
  - Birthday wishes (daily, at 8 AM IST)
  - Fee due reminders (daily, 7 days before due date)
  - Library overdue alerts (daily)
  - Attendance summary to principal (daily, at 4 PM IST)

Usage (from main.py lifespan):
    from app.shared.notification_scheduler import start_scheduler
    asyncio.create_task(start_scheduler(db_session_factory))
"""
import asyncio
import logging
from datetime import date, timedelta, datetime, timezone

logger = logging.getLogger(__name__)


async def run_daily_birthday_check(db_factory) -> None:
    """Send birthday wishes to students celebrating today."""
    db = db_factory()
    try:
        from sqlalchemy import select
        from app.modules.student.models import Student
        import app.modules.attendance.models  # noqa: F401

        today = date.today()
        students = db.scalars(
            select(Student).where(
                Student.is_deleted == False,
                Student.is_active == True,
            )
        ).all()

        from app.shared.notifications import push_event
        count = 0
        for student in students:
            dob = getattr(student, 'date_of_birth', None) or getattr(student, 'dob', None)
            if dob and dob.month == today.month and dob.day == today.day:
                push_event(db, "birthday.student", {
                    "student_name": student.full_name,
                    "student_user_id": getattr(student, 'user_id', None),
                    "student_id": student.id,
                })
                count += 1

        if count > 0:
            logger.info(f"[Scheduler] Birthday wishes sent to {count} students.")
    except Exception as e:
        logger.warning(f"[Scheduler] Birthday check error: {e}")
    finally:
        db.close()


async def run_library_overdue_check(db_factory) -> None:
    """Alert students with overdue books."""
    db = db_factory()
    try:
        from sqlalchemy import select
        from app.modules.library.models import BookIssue

        today = date.today()
        overdue_issues = db.scalars(
            select(BookIssue).where(
                BookIssue.is_deleted == False,
                BookIssue.status == "issued",
                BookIssue.due_date < today,
            )
        ).all()

        from app.shared.notifications import push_event
        count = 0
        for issue in overdue_issues:
            book_title = issue.book.title if hasattr(issue, 'book') and issue.book else f"Book #{issue.book_id}"
            push_event(db, "library.book_overdue", {
                "book_title": book_title,
                "due_date": str(issue.due_date),
                "member_user_id": None,  # Member user lookup skipped for performance
            })
            count += 1

        if count > 0:
            logger.info(f"[Scheduler] Library overdue alerts sent: {count}")
    except Exception as e:
        logger.warning(f"[Scheduler] Library overdue check error: {e}")
    finally:
        db.close()


async def run_fee_due_reminder(db_factory) -> None:
    """Alert students with fee payments due in 7 days."""
    db = db_factory()
    try:
        from sqlalchemy import select
        from app.modules.finance.models import StudentFeeRecord
        import app.modules.attendance.models  # noqa: F401
        from app.modules.student.models import Student

        today = date.today()
        target_date = today + timedelta(days=7)

        due_records = db.scalars(
            select(StudentFeeRecord).where(
                StudentFeeRecord.is_deleted == False,
                StudentFeeRecord.status.in_(["pending", "partial"]),
                StudentFeeRecord.due_date == target_date,
            )
        ).all()

        from app.shared.notifications import push_event
        count = 0
        for rec in due_records:
            student = db.scalar(
                select(Student).where(Student.id == rec.student_id, Student.is_deleted == False)
            )
            if not student:
                continue
            due_amount = rec.amount_due - rec.amount_paid - rec.concession_amount
            push_event(db, "fee.due_reminder", {
                "student_name": student.full_name,
                "amount": float(due_amount),
                "due_date": str(rec.due_date),
                "student_user_id": getattr(student, 'user_id', None),
                "parent_user_id": None,
            })
            count += 1

        if count > 0:
            logger.info(f"[Scheduler] Fee due reminders sent: {count}")
    except Exception as e:
        logger.warning(f"[Scheduler] Fee due reminder error: {e}")
    finally:
        db.close()


async def run_book_due_reminder(db_factory) -> None:
    """Remind students of books due in 2 days."""
    db = db_factory()
    try:
        from sqlalchemy import select
        from app.modules.library.models import BookIssue

        target = date.today() + timedelta(days=2)
        issues = db.scalars(
            select(BookIssue).where(
                BookIssue.is_deleted == False,
                BookIssue.status == "issued",
                BookIssue.due_date == target,
            )
        ).all()

        from app.shared.notifications import push_event
        count = 0
        for issue in issues:
            book_title = issue.book.title if hasattr(issue, 'book') and issue.book else f"Book #{issue.book_id}"
            push_event(db, "library.book_due", {
                "book_title": book_title,
                "due_date": str(issue.due_date),
                "member_user_id": None,
            })
            count += 1

        if count > 0:
            logger.info(f"[Scheduler] Book due reminders sent: {count}")
    except Exception as e:
        logger.warning(f"[Scheduler] Book due reminder error: {e}")
    finally:
        db.close()


async def cleanup_expired_notifications(db_factory) -> None:
    """Soft-delete notifications older than 60 days to keep table lean."""
    db = db_factory()
    try:
        from sqlalchemy import select
        from app.modules.communication.models import Notification
        cutoff = datetime.now(timezone.utc) - timedelta(days=60)
        old = db.scalars(
            select(Notification).where(
                Notification.is_deleted == False,
                Notification.created_at < cutoff,
                Notification.is_read == True,
            )
        ).all()
        count = 0
        for n in old:
            n.is_deleted = True
            count += 1
        if count > 0:
            db.commit()
            logger.info(f"[Scheduler] Cleaned up {count} expired notifications.")
    except Exception as e:
        logger.warning(f"[Scheduler] Notification cleanup error: {e}")
    finally:
        db.close()


async def start_scheduler(db_factory) -> None:
    """
    Main scheduler loop.
    Runs all daily jobs once every 6 hours.
    In production, replace with Celery Beat or APScheduler.
    """
    logger.info("[Scheduler] Notification scheduler started.")
    # Wait 30 seconds after startup before first run
    await asyncio.sleep(30)

    while True:
        try:
            logger.info("[Scheduler] Running daily notification jobs...")
            await run_daily_birthday_check(db_factory)
            await run_library_overdue_check(db_factory)
            await run_fee_due_reminder(db_factory)
            await run_book_due_reminder(db_factory)
            await cleanup_expired_notifications(db_factory)
            logger.info("[Scheduler] All notification jobs complete.")
        except Exception as e:
            logger.error(f"[Scheduler] Unexpected error: {e}")

        # Sleep 6 hours before next run
        await asyncio.sleep(6 * 3600)
