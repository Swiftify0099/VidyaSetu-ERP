"""
VidyaSetu ERP — Timetable Service & Schemas
"""
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from datetime import date
from app.modules.timetable.models import (
    Subject, PeriodConfig, TimetableEntry,
    TeacherSubjectAssignment, SubstituteEntry,
)
from app.modules.teacher.models import Teacher

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

class BulkAssignmentItem(PydanticBase):
    teacher_id: int
    subject_id: int
    periods_per_week: int = 5
    is_class_teacher: bool = False

class BulkAssignmentRequest(PydanticBase):
    standard: str
    division: Optional[str] = None
    academic_year_id: int = 1
    allocations: list[BulkAssignmentItem]


class TeacherShortResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    full_name: str
    designation: Optional[str] = None

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
    teacher: Optional[TeacherShortResponse] = None


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
    notes: Optional[str] = None

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


class SubstituteRequest(PydanticBase):
    timetable_entry_id: int
    substitute_date: str
    substitute_teacher_id: int
    reason: Optional[str] = None

class SubstituteResponse(PydanticBase):
    id: int
    timetable_entry_id: int
    substitute_date: str
    substitute_teacher_id: int
    substitute_teacher_name: Optional[str] = None
    original_teacher_name: Optional[str] = None
    subject_name: Optional[str] = None
    standard: Optional[str] = None
    division: Optional[str] = None
    period_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None

class FreeTeacherResponse(PydanticBase):
    id: int
    full_name: str
    designation: Optional[str] = None
    employee_code: Optional[str] = None

class ConflictCheckResponse(PydanticBase):
    has_conflict: bool
    conflicting_standard: Optional[str] = None
    conflicting_division: Optional[str] = None
    conflicting_period_name: Optional[str] = None

class CopyTimetableRequest(PydanticBase):
    source_standard: str
    source_division: Optional[str] = None
    target_standard: str
    target_division: Optional[str] = None
    academic_year_id: int = 1

class AutoGenerateRequest(PydanticBase):
    standard: str
    division: Optional[str] = None
    academic_year_id: int = 1
    overwrite: bool = True

class TimetableStatsResponse(PydanticBase):
    total_subjects: int
    total_periods: int
    total_entries: int
    total_assignments: int
    active_substitutes_today: int



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

    @staticmethod
    def get_by_id(db: Session, pid: int) -> PeriodConfig:
        p = db.scalar(select(PeriodConfig).where(PeriodConfig.id == pid, PeriodConfig.is_deleted == False))
        if not p: raise HTTPException(404, "Period not found.")
        return p

    @staticmethod
    def update(db: Session, pid: int, data: PeriodConfigRequest, updated_by: int) -> PeriodConfig:
        p = PeriodService.get_by_id(db, pid)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(p, k, v)
        p.updated_by = updated_by; db.commit(); db.refresh(p); return p

    @staticmethod
    def delete(db: Session, pid: int, deleted_by: int) -> None:
        p = PeriodService.get_by_id(db, pid)
        p.soft_delete(deleted_by=deleted_by); db.commit()


class TimetableService:
    @staticmethod
    def upsert_entry(db: Session, data: TimetableEntryRequest, user_id: int) -> TimetableEntry:
        if data.division:
            div_clause = (TimetableEntry.division == data.division)
        else:
            div_clause = (TimetableEntry.division.is_(None)) | (TimetableEntry.division == "")

        existing = db.scalar(
            select(TimetableEntry).where(
                TimetableEntry.standard == str(data.standard),
                TimetableEntry.academic_year_id == data.academic_year_id,
                TimetableEntry.day_of_week == data.day_of_week,
                TimetableEntry.period_id == data.period_id,
                div_clause,
            )
        )
        if existing:
            existing.subject_id = data.subject_id
            existing.teacher_id = data.teacher_id
            existing.room = data.room
            existing.notes = data.notes
            existing.is_deleted = False
            existing.is_active = True
            existing.updated_by = user_id
            db.commit()
            db.refresh(existing)
            return existing

        entry = TimetableEntry(**data.model_dump(), created_by=user_id)
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def check_teacher_conflict(db: Session, teacher_id: int, day_of_week: int,
                               period_id: int, academic_year_id: int, standard: str,
                               division: Optional[str]) -> ConflictCheckResponse:
        q = select(TimetableEntry).options(joinedload(TimetableEntry.period)).where(
            TimetableEntry.teacher_id == teacher_id,
            TimetableEntry.day_of_week == day_of_week,
            TimetableEntry.period_id == period_id,
            TimetableEntry.academic_year_id == academic_year_id,
            TimetableEntry.is_deleted == False,
        )
        conflicts = list(db.scalars(q).all())
        for c in conflicts:
            if c.standard == standard and (c.division or "") == (division or ""):
                continue
            return ConflictCheckResponse(
                has_conflict=True,
                conflicting_standard=c.standard,
                conflicting_division=c.division,
                conflicting_period_name=c.period.period_name if c.period else None,
            )
        return ConflictCheckResponse(has_conflict=False)

    @staticmethod
    def get_free_teachers(db: Session, day_of_week: int, period_id: int,
                          academic_year_id: int) -> list[FreeTeacherResponse]:
        busy_teacher_ids_subq = select(TimetableEntry.teacher_id).where(
            TimetableEntry.day_of_week == day_of_week,
            TimetableEntry.period_id == period_id,
            TimetableEntry.academic_year_id == academic_year_id,
            TimetableEntry.is_deleted == False,
            TimetableEntry.teacher_id != None
        )
        teachers = list(db.scalars(
            select(Teacher).where(
                Teacher.is_deleted == False,
                Teacher.id.not_in(busy_teacher_ids_subq)
            ).order_by(Teacher.full_name)
        ).all())
        return [FreeTeacherResponse(
            id=t.id,
            full_name=t.full_name,
            designation=getattr(t, 'designation', None),
            employee_code=getattr(t, 'employee_code', None)
        ) for t in teachers]

    @staticmethod
    def copy_timetable(db: Session, req: CopyTimetableRequest, user_id: int) -> int:
        src_entries = list(db.scalars(
            select(TimetableEntry).where(
                TimetableEntry.standard == req.source_standard,
                TimetableEntry.academic_year_id == req.academic_year_id,
                TimetableEntry.is_deleted == False,
                *([] if not req.source_division else [TimetableEntry.division == req.source_division]),
            )
        ).all())
        count = 0
        for se in src_entries:
            TimetableService.upsert_entry(db, TimetableEntryRequest(
                standard=req.target_standard,
                division=req.target_division,
                day_of_week=se.day_of_week,
                period_id=se.period_id,
                subject_id=se.subject_id,
                teacher_id=se.teacher_id,
                room=se.room,
                notes=se.notes,
                academic_year_id=req.academic_year_id,
            ), user_id)
            count += 1
        return count

    @staticmethod
    def auto_generate_timetable(db: Session, req: AutoGenerateRequest, user_id: int) -> int:
        """
        Constraint-based automated timetable generator.
        Allocates subject teachers to open class periods (Mon-Sat) while avoiding teacher conflicts and daily limits.
        """
        periods = list(db.scalars(
            select(PeriodConfig).where(
                PeriodConfig.academic_year_id == req.academic_year_id,
                PeriodConfig.period_type == "class",
                PeriodConfig.is_deleted == False
            ).order_by(PeriodConfig.sort_order, PeriodConfig.period_number)
        ).all())

        if not periods:
            raise HTTPException(400, "No class periods configured for this academic year. Seed or create periods first.")

        alloc_q = select(TeacherSubjectAssignment).where(
            TeacherSubjectAssignment.standard == req.standard,
            TeacherSubjectAssignment.academic_year_id == req.academic_year_id,
            TeacherSubjectAssignment.is_deleted == False
        )
        if req.division:
            alloc_q = alloc_q.where((TeacherSubjectAssignment.division == req.division) | (TeacherSubjectAssignment.division == None) | (TeacherSubjectAssignment.division == ""))

        allocations = list(db.scalars(alloc_q).all())
        if not allocations:
            raise HTTPException(400, f"No teacher subject allocations found for Std {req.standard}{req.division or ''}. Please add teacher allocations first.")

        if req.overwrite:
            existing = list(db.scalars(
                select(TimetableEntry).where(
                    TimetableEntry.standard == req.standard,
                    TimetableEntry.academic_year_id == req.academic_year_id,
                    TimetableEntry.is_deleted == False,
                    *([] if not req.division else [TimetableEntry.division == req.division])
                )
            ).all())
            for e in existing:
                e.soft_delete(deleted_by=user_id)
            db.commit()

        pool = []
        for a in allocations:
            pool.append({
                "subject_id": a.subject_id,
                "teacher_id": a.teacher_id,
                "target_periods": a.periods_per_week,
                "assigned_count": 0
            })

        count = 0
        for day_num in range(1, 7):
            day_subject_counts: dict[int, int] = {}
            for p in periods:
                best_item = None
                best_score = -100

                for item in pool:
                    subj_id = item["subject_id"]
                    t_id = item["teacher_id"]

                    if day_subject_counts.get(subj_id, 0) >= 2:
                        continue

                    conflict = TimetableService.check_teacher_conflict(
                        db, t_id, day_num, p.id, req.academic_year_id, req.standard, req.division
                    )
                    if conflict.has_conflict:
                        continue

                    remaining = item["target_periods"] - item["assigned_count"]
                    score = remaining * 10 - day_subject_counts.get(subj_id, 0) * 3
                    if score > best_score:
                        best_score = score
                        best_item = item

                if best_item:
                    TimetableService.upsert_entry(db, TimetableEntryRequest(
                        standard=req.standard,
                        division=req.division,
                        day_of_week=day_num,
                        period_id=p.id,
                        subject_id=best_item["subject_id"],
                        teacher_id=best_item["teacher_id"],
                        room=f"Room 10{req.standard}",
                        notes="Auto-generated schedule",
                        academic_year_id=req.academic_year_id,
                    ), user_id)
                    best_item["assigned_count"] += 1
                    day_subject_counts[best_item["subject_id"]] = day_subject_counts.get(best_item["subject_id"], 0) + 1
                    count += 1
                else:
                    for item in pool:
                        t_id = item["teacher_id"]
                        conflict = TimetableService.check_teacher_conflict(
                            db, t_id, day_num, p.id, req.academic_year_id, req.standard, req.division
                        )
                        if not conflict.has_conflict:
                            TimetableService.upsert_entry(db, TimetableEntryRequest(
                                standard=req.standard,
                                division=req.division,
                                day_of_week=day_num,
                                period_id=p.id,
                                subject_id=item["subject_id"],
                                teacher_id=item["teacher_id"],
                                room=f"Room 10{req.standard}",
                                notes="Auto-generated schedule (extra)",
                                academic_year_id=req.academic_year_id,
                            ), user_id)
                            count += 1
                            break

        return count

    @staticmethod
    def get_stats(db: Session, academic_year_id: int) -> TimetableStatsResponse:
        from sqlalchemy import func
        subj_cnt = db.scalar(select(func.count(Subject.id)).where(Subject.is_deleted == False)) or 0
        period_cnt = db.scalar(select(func.count(PeriodConfig.id)).where(PeriodConfig.academic_year_id == academic_year_id, PeriodConfig.is_deleted == False)) or 0
        entry_cnt = db.scalar(select(func.count(TimetableEntry.id)).where(TimetableEntry.academic_year_id == academic_year_id, TimetableEntry.is_deleted == False)) or 0
        assign_cnt = db.scalar(select(func.count(TeacherSubjectAssignment.id)).where(TeacherSubjectAssignment.academic_year_id == academic_year_id, TeacherSubjectAssignment.is_deleted == False)) or 0
        today_str = date.today().isoformat()
        sub_cnt = db.scalar(select(func.count(SubstituteEntry.id)).where(SubstituteEntry.substitute_date == today_str, SubstituteEntry.is_deleted == False)) or 0

        return TimetableStatsResponse(
            total_subjects=subj_cnt,
            total_periods=period_cnt,
            total_entries=entry_cnt,
            total_assignments=assign_cnt,
            active_substitutes_today=sub_cnt,
        )

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
                    notes=e.notes if e else None,
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


class SubstituteService:
    @staticmethod
    def create(db: Session, data: SubstituteRequest, user_id: int) -> SubstituteEntry:
        tt_entry = db.scalar(select(TimetableEntry).options(joinedload(TimetableEntry.period), joinedload(TimetableEntry.subject)).where(TimetableEntry.id == data.timetable_entry_id))
        if not tt_entry:
            raise HTTPException(404, "Timetable entry not found.")
        sub = SubstituteEntry(
            timetable_entry_id=data.timetable_entry_id,
            substitute_date=data.substitute_date,
            substitute_teacher_id=data.substitute_teacher_id,
            reason=data.reason,
            marked_by=user_id,
            created_by=user_id,
        )
        db.add(sub); db.commit(); db.refresh(sub)

        # Dispatch notification to substitute teacher
        try:
            from app.shared.notifications import push_notification
            sub_teacher = db.scalar(select(Teacher).where(Teacher.id == data.substitute_teacher_id))
            target_user_id = sub_teacher.user_id if sub_teacher and sub_teacher.user_id else data.substitute_teacher_id
            period_str = tt_entry.period.period_name if tt_entry.period else "Scheduled Period"
            subj_str = tt_entry.subject.name if tt_entry.subject else "Class"
            push_notification(
                db,
                recipient_id=target_user_id,
                category="system",
                notification_type="timetable.substitute",
                title="🛡️ Substitution Duty Assigned",
                body=f"You have been assigned as substitute teacher for {subj_str} in Std {tt_entry.standard}{tt_entry.division or ''} on {data.substitute_date} ({period_str}).",
                priority="high",
                action_url="/timetable",
                sender_id=user_id,
            )
        except Exception as err:
            print("Failed to send substitute notification:", err)

        return sub

    @staticmethod
    def get_by_date(db: Session, substitute_date: str) -> list[SubstituteResponse]:
        subs = list(db.scalars(
            select(SubstituteEntry).options(
                joinedload(SubstituteEntry.substitute_teacher),
                joinedload(SubstituteEntry.timetable_entry).joinedload(TimetableEntry.period),
                joinedload(SubstituteEntry.timetable_entry).joinedload(TimetableEntry.subject),
                joinedload(SubstituteEntry.timetable_entry).joinedload(TimetableEntry.teacher),
            ).where(
                SubstituteEntry.substitute_date == substitute_date,
                SubstituteEntry.is_deleted == False,
            )
        ).all())
        res = []
        for s in subs:
            te = s.timetable_entry
            orig_teacher_name = te.teacher.full_name if (te and te.teacher) else None
            sub_teacher_name = s.substitute_teacher.full_name if s.substitute_teacher else None
            res.append(SubstituteResponse(
                id=s.id,
                timetable_entry_id=s.timetable_entry_id,
                substitute_date=s.substitute_date,
                substitute_teacher_id=s.substitute_teacher_id,
                substitute_teacher_name=sub_teacher_name,
                original_teacher_name=orig_teacher_name,
                subject_name=te.subject.name if (te and te.subject) else None,
                standard=te.standard if te else None,
                division=te.division if te else None,
                period_name=te.period.period_name if (te and te.period) else None,
                start_time=te.period.start_time if (te and te.period) else None,
                end_time=te.period.end_time if (te and te.period) else None,
                reason=s.reason,
            ))
        return res

    @staticmethod
    def delete(db: Session, substitute_id: int, deleted_by: int) -> None:
        sub = db.scalar(select(SubstituteEntry).where(SubstituteEntry.id == substitute_id))
        if not sub: raise HTTPException(404, "Substitute entry not found.")
        sub.soft_delete(deleted_by=deleted_by); db.commit()


class AssignmentService:
    @staticmethod
    def create(db: Session, data: AssignmentRequest, created_by: int) -> TeacherSubjectAssignment:
        existing = db.scalar(
            select(TeacherSubjectAssignment).where(
                TeacherSubjectAssignment.teacher_id == data.teacher_id,
                TeacherSubjectAssignment.subject_id == data.subject_id,
                TeacherSubjectAssignment.standard == data.standard,
                TeacherSubjectAssignment.division == data.division,
                TeacherSubjectAssignment.academic_year_id == data.academic_year_id,
            )
        )
        if existing:
            if existing.is_deleted:
                existing.is_deleted = False
                existing.periods_per_week = data.periods_per_week
                existing.is_class_teacher = data.is_class_teacher
                existing.updated_by = created_by
                db.commit()
                res = db.scalar(
                    select(TeacherSubjectAssignment)
                    .options(
                        joinedload(TeacherSubjectAssignment.subject),
                        joinedload(TeacherSubjectAssignment.teacher),
                    )
                    .where(TeacherSubjectAssignment.id == existing.id)
                )
                return res or existing
            else:
                raise HTTPException(status_code=400, detail="This teacher allocation already exists for the selected subject and standard.")

        a = TeacherSubjectAssignment(**data.model_dump(), created_by=created_by)
        db.add(a); db.commit(); db.refresh(a)
        res = db.scalar(
            select(TeacherSubjectAssignment)
            .options(
                joinedload(TeacherSubjectAssignment.subject),
                joinedload(TeacherSubjectAssignment.teacher),
            )
            .where(TeacherSubjectAssignment.id == a.id)
        )
        return res or a

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

    @staticmethod
    def get_all(db: Session, academic_year_id: int) -> list[TeacherSubjectAssignment]:
        return list(db.scalars(
            select(TeacherSubjectAssignment)
            .options(
                joinedload(TeacherSubjectAssignment.subject),
                joinedload(TeacherSubjectAssignment.teacher),
            )
            .where(
                TeacherSubjectAssignment.academic_year_id == academic_year_id,
                TeacherSubjectAssignment.is_deleted == False,
            )
        ).all())

    @staticmethod
    def update(db: Session, assignment_id: int, data: AssignmentRequest, updated_by: int) -> TeacherSubjectAssignment:
        a = db.scalar(select(TeacherSubjectAssignment).where(TeacherSubjectAssignment.id == assignment_id, TeacherSubjectAssignment.is_deleted == False))
        if not a:
            raise HTTPException(status_code=404, detail="Assignment not found.")
        a.teacher_id = data.teacher_id
        a.subject_id = data.subject_id
        a.standard = data.standard
        a.division = data.division
        a.periods_per_week = data.periods_per_week
        a.is_class_teacher = data.is_class_teacher
        a.updated_by = updated_by
        db.commit()
        res = db.scalar(
            select(TeacherSubjectAssignment)
            .options(
                joinedload(TeacherSubjectAssignment.subject),
                joinedload(TeacherSubjectAssignment.teacher),
            )
            .where(TeacherSubjectAssignment.id == a.id)
        )
        return res or a

    @staticmethod
    def bulk_create(db: Session, data: BulkAssignmentRequest, created_by: int) -> list[TeacherSubjectAssignment]:
        results = []
        for item in data.allocations:
            req = AssignmentRequest(
                teacher_id=item.teacher_id,
                subject_id=item.subject_id,
                standard=data.standard,
                division=data.division,
                academic_year_id=data.academic_year_id,
                periods_per_week=item.periods_per_week,
                is_class_teacher=item.is_class_teacher
            )
            try:
                res = AssignmentService.create(db, req, created_by)
                results.append(res)
            except HTTPException:
                pass
        return results

    @staticmethod
    def delete(db: Session, assignment_id: int, deleted_by: int) -> None:
        a = db.scalar(select(TeacherSubjectAssignment).where(TeacherSubjectAssignment.id == assignment_id))
        if not a: raise HTTPException(404, "Assignment not found.")
        a.soft_delete(deleted_by=deleted_by); db.commit()

