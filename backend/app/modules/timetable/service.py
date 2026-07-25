"""
VidyaSetu ERP — Timetable Service & Schemas
"""
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.modules.timetable.models import (
    Subject, PeriodConfig, TimetableEntry,
    TeacherSubjectAssignment, SubstituteEntry,
)

DAYS = {1: "Monday", 2: "Tuesday", 3: "Wednesday",
        4: "Thursday", 5: "Friday", 6: "Saturday"}


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class SubjectRequest(PydanticBase):
    name: str
    name_marathi: Optional[str] = None
    code: Optional[str] = None
    subject_type: str = "theory"
    applicable_standards: Optional[str] = None
    color: Optional[str] = None

class SubjectResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    name_marathi: Optional[str] = None
    code: Optional[str] = None
    subject_type: str
    applicable_standards: Optional[str] = None
    color: Optional[str] = None
    is_active: bool


class PeriodConfigRequest(PydanticBase):
    academic_year_id: int
    period_number: int
    period_name: str
    start_time: str
    end_time: str
    duration_minutes: int = 45
    period_type: str = "class"
    sort_order: int = 0

class PeriodConfigResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    academic_year_id: int
    period_number: int
    period_name: str
    start_time: str
    end_time: str
    duration_minutes: int
    period_type: str
    sort_order: int
    is_active: bool


class TimetableEntryRequest(PydanticBase):
    standard: str
    division: Optional[str] = None
    day_of_week: int
    period_id: int
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    academic_year_id: int

class TimetableEntryResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    standard: str
    division: Optional[str] = None
    day_of_week: int
    period_id: int
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    period: Optional[PeriodConfigResponse] = None
    subject: Optional[SubjectResponse] = None


class AssignmentRequest(PydanticBase):
    teacher_id: int
    subject_id: int
    standard: str
    division: Optional[str] = None
    academic_year_id: int
    periods_per_week: int = 5
    is_class_teacher: bool = False

class AssignmentResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    teacher_id: int
    subject_id: int
    standard: str
    division: Optional[str] = None
    periods_per_week: int
    is_class_teacher: bool
    subject: Optional[SubjectResponse] = None


class WeeklyTimetableCell(PydanticBase):
    entry_id: Optional[int] = None
    period_id: int
    period_name: str
    period_number: int
    start_time: str
    end_time: str
    period_type: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_name_marathi: Optional[str] = None
    subject_color: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    room: Optional[str] = None

class WeeklyTimetableDay(PydanticBase):
    day_number: int
    day_name: str
    periods: list[WeeklyTimetableCell]

class WeeklyTimetable(PydanticBase):
    standard: str
    division: Optional[str] = None
    academic_year_id: int
    days: list[WeeklyTimetableDay]
    periods: list[PeriodConfigResponse]


class TeacherTimetableCell(PydanticBase):
    day_number: int
    day_name: str
    period_id: int
    period_name: str
    start_time: str
    end_time: str
    standard: str
    division: Optional[str] = None
    subject_name: Optional[str] = None
    room: Optional[str] = None


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

class SubjectService:
    @staticmethod
    def create(db: Session, data: SubjectRequest, created_by: int) -> Subject:
        s = Subject(**data.model_dump(), created_by=created_by)
        db.add(s); db.commit(); db.refresh(s); return s

    @staticmethod
    def get_all(db: Session) -> list[Subject]:
        return list(db.scalars(
            select(Subject).where(Subject.is_deleted == False).order_by(Subject.name)
        ).all())

    @staticmethod
    def get_by_id(db: Session, sid: int) -> Subject:
        s = db.scalar(select(Subject).where(Subject.id == sid, Subject.is_deleted == False))
        if not s: raise HTTPException(404, "Subject not found.")
        return s

    @staticmethod
    def update(db: Session, sid: int, data: SubjectRequest, updated_by: int) -> Subject:
        s = SubjectService.get_by_id(db, sid)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(s, k, v)
        s.updated_by = updated_by; db.commit(); db.refresh(s); return s

    @staticmethod
    def delete(db: Session, sid: int, deleted_by: int) -> None:
        s = SubjectService.get_by_id(db, sid)
        s.soft_delete(deleted_by=deleted_by); db.commit()


class PeriodService:
    @staticmethod
    def create(db: Session, data: PeriodConfigRequest, created_by: int) -> PeriodConfig:
        p = PeriodConfig(**data.model_dump(), created_by=created_by)
        db.add(p); db.commit(); db.refresh(p); return p

    @staticmethod
    def get_by_year(db: Session, academic_year_id: int) -> list[PeriodConfig]:
        return list(db.scalars(
            select(PeriodConfig)
            .where(PeriodConfig.academic_year_id == academic_year_id,
                   PeriodConfig.is_deleted == False)
            .order_by(PeriodConfig.sort_order, PeriodConfig.period_number)
        ).all())

    @staticmethod
    def seed_default(db: Session, academic_year_id: int, created_by: int) -> int:
        """Create a standard 8-period school day."""
        defaults = [
            (0, "Assembly",   "07:30", "07:45",  15, "assembly"),
            (1, "Period 1",   "07:45", "08:30",  45, "class"),
            (2, "Period 2",   "08:30", "09:15",  45, "class"),
            (3, "Period 3",   "09:15", "10:00",  45, "class"),
            (4, "Short Break","10:00", "10:15",  15, "break"),
            (5, "Period 4",   "10:15", "11:00",  45, "class"),
            (6, "Period 5",   "11:00", "11:45",  45, "class"),
            (7, "Lunch",      "11:45", "12:15",  30, "lunch"),
            (8, "Period 6",   "12:15", "13:00",  45, "class"),
            (9, "Period 7",   "13:00", "13:45",  45, "class"),
        ]
        existing = PeriodService.get_by_year(db, academic_year_id)
        if existing:
            return len(existing)
        for i, (num, name, st, et, dur, ptype) in enumerate(defaults):
            p = PeriodConfig(
                academic_year_id=academic_year_id,
                period_number=num, period_name=name,
                start_time=st, end_time=et,
                duration_minutes=dur, period_type=ptype,
                sort_order=i, created_by=created_by,
            )
            db.add(p)
        db.commit()
        return len(defaults)


class TimetableService:
    @staticmethod
    def upsert_entry(db: Session, data: TimetableEntryRequest, user_id: int) -> TimetableEntry:
        existing = db.scalar(
            select(TimetableEntry).where(
                TimetableEntry.standard == data.standard,
                TimetableEntry.academic_year_id == data.academic_year_id,
                TimetableEntry.day_of_week == data.day_of_week,
                TimetableEntry.period_id == data.period_id,
                TimetableEntry.is_deleted == False,
                *([] if not data.division else [TimetableEntry.division == data.division]),
            )
        )
        if existing:
            existing.subject_id = data.subject_id
            existing.teacher_id = data.teacher_id
            existing.room = data.room
            existing.notes = data.notes
            existing.updated_by = user_id
            db.commit(); db.refresh(existing); return existing
        entry = TimetableEntry(**data.model_dump(), created_by=user_id)
        db.add(entry); db.commit(); db.refresh(entry); return entry

    @staticmethod
    def get_class_timetable(db: Session, standard: str, division: Optional[str],
                            academic_year_id: int) -> WeeklyTimetable:
        periods = PeriodService.get_by_year(db, academic_year_id)
        q = select(TimetableEntry).options(
            joinedload(TimetableEntry.period),
            joinedload(TimetableEntry.subject),
            joinedload(TimetableEntry.teacher),
        ).where(
            TimetableEntry.standard == standard,
            TimetableEntry.academic_year_id == academic_year_id,
            TimetableEntry.is_deleted == False,
        )
        if division: q = q.where(TimetableEntry.division == division)
        entries = list(db.scalars(q).all())
        entry_map: dict[tuple, TimetableEntry] = {}
        for e in entries:
            entry_map[(e.day_of_week, e.period_id)] = e

        days = []
        for day_num in range(1, 7):  # Mon-Sat
            cells = []
            for p in periods:
                e = entry_map.get((day_num, p.id))
                teacher_name = None
                if e and e.teacher:
                    teacher_name = e.teacher.full_name
                cells.append(WeeklyTimetableCell(
                    entry_id=e.id if e else None,
                    period_id=p.id, period_name=p.period_name,
                    period_number=p.period_number,
                    start_time=p.start_time, end_time=p.end_time,
                    period_type=p.period_type,
                    subject_id=e.subject_id if e else None,
                    subject_name=e.subject.name if (e and e.subject) else None,
                    subject_name_marathi=e.subject.name_marathi if (e and e.subject) else None,
                    subject_color=e.subject.color if (e and e.subject) else None,
                    teacher_id=e.teacher_id if e else None,
                    teacher_name=teacher_name,
                    room=e.room if e else None,
                ))
            days.append(WeeklyTimetableDay(day_number=day_num, day_name=DAYS[day_num], periods=cells))

        return WeeklyTimetable(
            standard=standard, division=division,
            academic_year_id=academic_year_id, days=days,
            periods=[PeriodConfigResponse.model_validate(p) for p in periods],
        )

    @staticmethod
    def get_teacher_timetable(db: Session, teacher_id: int, academic_year_id: int) -> list[TeacherTimetableCell]:
        entries = list(db.scalars(
            select(TimetableEntry).options(
                joinedload(TimetableEntry.period),
                joinedload(TimetableEntry.subject),
            ).where(
                TimetableEntry.teacher_id == teacher_id,
                TimetableEntry.academic_year_id == academic_year_id,
                TimetableEntry.is_deleted == False,
            ).order_by(TimetableEntry.day_of_week, TimetableEntry.period_id)
        ).all())

        result = []
        for e in entries:
            p = e.period
            result.append(TeacherTimetableCell(
                day_number=e.day_of_week,
                day_name=DAYS.get(e.day_of_week, ""),
                period_id=e.period_id,
                period_name=p.period_name if p else "",
                start_time=p.start_time if p else "",
                end_time=p.end_time if p else "",
                standard=e.standard,
                division=e.division,
                subject_name=e.subject.name if e.subject else None,
                room=e.room,
            ))
        return result

    @staticmethod
    def delete_entry(db: Session, entry_id: int, deleted_by: int) -> None:
        e = db.scalar(select(TimetableEntry).where(TimetableEntry.id == entry_id))
        if not e: raise HTTPException(404, "Entry not found.")
        e.soft_delete(deleted_by=deleted_by); db.commit()


class AssignmentService:
    @staticmethod
    def create(db: Session, data: AssignmentRequest, created_by: int) -> TeacherSubjectAssignment:
        a = TeacherSubjectAssignment(**data.model_dump(), created_by=created_by)
        db.add(a); db.commit(); db.refresh(a); return a

    @staticmethod
    def get_by_teacher(db: Session, teacher_id: int, academic_year_id: int) -> list[TeacherSubjectAssignment]:
        return list(db.scalars(
            select(TeacherSubjectAssignment)
            .options(joinedload(TeacherSubjectAssignment.subject))
            .where(
                TeacherSubjectAssignment.teacher_id == teacher_id,
                TeacherSubjectAssignment.academic_year_id == academic_year_id,
                TeacherSubjectAssignment.is_deleted == False,
            )
        ).all())
